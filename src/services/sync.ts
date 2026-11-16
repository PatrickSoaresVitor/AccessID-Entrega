import NetInfo from '@react-native-community/netinfo';

import {
  Funcionario,
  FuncionarioRemoto,
  garantirUuidsRegistrosLocais,
  incorporarFuncionarioRemoto,
  incorporarRegistroRemoto,
  listarTodosFuncionarios,
  listarTodosRegistrosParaSync,
  marcarFuncionarioSincronizado,
  definirSincronizacaoRegistro,
  migrarPinsLegados,
  RegistroRemoto,
  RegistroSync,
} from '../database/database';

import { supabase } from './supabase';

let sincronizacaoAtual:
  Promise<boolean> | null = null;

const TAMANHO_PAGINA = 1000;

function normalizarTexto(
  valor: string | null | undefined
) {
  return (valor ?? '').trim();
}

function funcionariosIguais(
  local: Funcionario,
  remoto: FuncionarioRemoto
) {
  return (
    normalizarTexto(local.nome) ===
      normalizarTexto(remoto.nome) &&

    normalizarTexto(local.matricula) ===
      normalizarTexto(remoto.matricula) &&

    normalizarTexto(local.setor) ===
      normalizarTexto(remoto.setor) &&

    normalizarTexto(local.cargo) ===
      normalizarTexto(remoto.cargo) &&

    normalizarTexto(
      local.turno_inicio
    ) ===
      normalizarTexto(
        remoto.turno_inicio
      ) &&

    normalizarTexto(
      local.turno_fim
    ) ===
      normalizarTexto(
        remoto.turno_fim
      ) &&

    normalizarTexto(
      local.pin_hash
    ) ===
      normalizarTexto(
        remoto.pin_hash
      ) &&

    (local.ativo === 1) ===
      remoto.ativo
  );
}

function divergenciasRegistro(local: RegistroSync, remoto: RegistroRemoto) {
  const campos: string[] = [];
  if (normalizarTexto(local.matricula) !== normalizarTexto(remoto.funcionario_matricula)) {
    campos.push('funcionario_matricula');
  }
  if (local.tipo !== remoto.tipo) campos.push('tipo');
  if (Date.parse(local.data_hora) !== Date.parse(remoto.data_hora)) campos.push('data_hora');
  if (normalizarTexto(local.metodo) !== normalizarTexto(remoto.metodo)) campos.push('metodo');
  return campos;
}

async function buscarTodosFuncionariosRemotos():
  Promise<FuncionarioRemoto[]> {
  const resultado:
    FuncionarioRemoto[] = [];

  let inicio = 0;

  while (true) {
    const fim =
      inicio +
      TAMANHO_PAGINA -
      1;

    const {
      data,
      error,
    } = await supabase
      .from('funcionarios')
      .select(`
        nome,
        matricula,
        setor,
        cargo,
        turno_inicio,
        turno_fim,
        pin_hash,
        ativo,
        created_at
      `)
      .range(inicio, fim);

    if (error) {
      throw error;
    }

    const pagina =
      (data ?? []) as FuncionarioRemoto[];

    resultado.push(
      ...pagina
    );

    if (
      pagina.length <
      TAMANHO_PAGINA
    ) {
      break;
    }

    inicio +=
      TAMANHO_PAGINA;
  }

  return resultado;
}

async function buscarTodosRegistrosRemotos():
  Promise<RegistroRemoto[]> {
  const resultado:
    RegistroRemoto[] = [];

  let inicio = 0;

  while (true) {
    const fim =
      inicio +
      TAMANHO_PAGINA -
      1;

    const {
      data,
      error,
    } = await supabase
      .from('registros_acesso')
      .select(`
        uuid,
        local_id,
        funcionario_matricula,
        tipo,
        data_hora,
        metodo,
        created_at
      `)
      .range(inicio, fim);

    if (error) {
      throw error;
    }

    const pagina =
      (data ?? []) as RegistroRemoto[];

    resultado.push(
      ...pagina
    );

    if (
      pagina.length <
      TAMANHO_PAGINA
    ) {
      break;
    }

    inicio +=
      TAMANHO_PAGINA;
  }

  return resultado;
}

export async function testarSupabase() {
  const {
    error,
  } = await supabase
    .from('funcionarios')
    .select('id')
    .limit(1);

  if (error) {
    console.error(
      'Erro ao conectar com Supabase:',
      error
    );

    return false;
  }

  return true;
}

/*
 * SUPABASE → SQLITE
 *
 * Baixa funcionários que ainda
 * não existem localmente.
 */
async function baixarFuncionarios() {
  try {
    const remotos =
      await buscarTodosFuncionariosRemotos();

    for (
      const remoto
      of remotos
    ) {
      incorporarFuncionarioRemoto(
        remoto
      );
    }

    console.log(
      `${remotos.length} funcionário(s) verificado(s) no Supabase.`
    );

    return true;
  } catch (error) {
    console.error(
      'Erro ao baixar funcionários:',
      error
    );

    return false;
  }
}

/*
 * SQLITE → SUPABASE
 *
 * IMPORTANTE:
 * Não olha somente sincronizado = 0.
 *
 * Verifica TODOS os funcionários.
 *
 * Se faltar ou estiver diferente
 * no Supabase, corrige.
 */
export async function sincronizarFuncionarios() {
  try {
    const locais =
      listarTodosFuncionarios();

    const remotos =
      await buscarTodosFuncionariosRemotos();

    const mapaRemoto =
      new Map(
        remotos.map(
          (funcionario) => [
            funcionario.matricula,
            funcionario,
          ]
        )
      );

    let sucesso = true;

    for (
      const local
      of locais
    ) {
      if (!local.pin_hash) {
        console.error(
          `Funcionário ${local.matricula} está sem pin_hash.`
        );

        sucesso = false;
        continue;
      }

      const remoto =
        mapaRemoto.get(
          local.matricula
        );

      const precisaAtualizar =
        !remoto ||
        !funcionariosIguais(
          local,
          remoto
        );

      if (
        precisaAtualizar
      ) {
        console.log(
          `Corrigindo funcionário no Supabase: ${local.matricula}`
        );

        const {
          error,
        } = await supabase
          .from('funcionarios')
          .upsert(
            {
              nome:
                local.nome,

              matricula:
                local.matricula,

              setor:
                local.setor,

              cargo:
                local.cargo,

              turno_inicio:
                local.turno_inicio,

              turno_fim:
                local.turno_fim,

              pin_hash:
                local.pin_hash,

              ativo:
                local.ativo === 1,
            },
            {
              onConflict:
                'matricula',
            }
          );

        if (error) {
          console.error(
            `Erro ao corrigir funcionário ${local.matricula}:`,
            error
          );

          sucesso = false;
          continue;
        }
      }

      marcarFuncionarioSincronizado(
        local.id
      );
    }

    return sucesso;
  } catch (error) {
    console.error(
      'Erro na auditoria de funcionários:',
      error
    );

    return false;
  }
}

/*
 * SUPABASE → SQLITE
 *
 * Baixa históricos que ainda
 * não existem localmente.
 */
async function baixarRegistros() {
  try {
    const remotos =
      await buscarTodosRegistrosRemotos();

    let sucesso = true;

    for (
      const remoto
      of remotos
    ) {
      const importado =
        incorporarRegistroRemoto(
          remoto
        );

      if (!importado) {
        sucesso = false;
      }
    }

    console.log(
      `${remotos.length} registro(s) verificado(s) no Supabase.`
    );

    return sucesso;
  } catch (error) {
    console.error(
      'Erro ao baixar registros:',
      error
    );

    return false;
  }
}

/*
 * SQLITE → SUPABASE
 *
 * Verifica TODOS os registros,
 * não somente os pendentes.
 */
export async function sincronizarRegistros() {
  try {
    garantirUuidsRegistrosLocais();

    const locais =
      listarTodosRegistrosParaSync();

    const remotos =
      await buscarTodosRegistrosRemotos();

    const mapaRemoto =
      new Map(
        remotos.map(
          (registro) => [
            registro.uuid,
            registro,
          ]
        )
      );

    let sucesso = true;

    for (
      const local
      of locais
    ) {
      if (!local.uuid) {
        console.error(
          `Registro local ${local.id} sem UUID.`
        );

        sucesso = false;
        continue;
      }

      const remoto =
        mapaRemoto.get(
          local.uuid
        );

      if (!remoto || divergenciasRegistro(local, remoto).length > 0) {
        if (local.sincronizado === 1) definirSincronizacaoRegistro(local.id, false);
        console.log(
          `Corrigindo registro no Supabase: ${local.uuid}`
        );

        const {
          error,
        } = await supabase
          .from(
            'registros_acesso'
          )
          .upsert(
            {
              uuid:
                local.uuid,

              funcionario_matricula:
                local.matricula,

              tipo:
                local.tipo,

              data_hora:
                local.data_hora,

              metodo:
                local.metodo,
            },
            {
              onConflict:
                'uuid',
            }
          );

        if (error) {
          console.error(
            `Erro ao corrigir registro ${local.uuid} no Supabase (${error.code || 'sem código'}): ${error.message}`
          );

          sucesso = false;
          continue;
        }
      }
    }

    return sucesso;
  } catch (error) {
    console.error(
      'Erro na auditoria dos registros:',
      error
    );

    return false;
  }
}

/*
 * VERIFICAÇÃO FINAL
 *
 * Confirma que:
 *
 * SQLite e Supabase possuem
 * os mesmos funcionários
 * e os mesmos registros.
 */
async function verificarIntegridade() {
  try {
    const locaisFuncionarios =
      listarTodosFuncionarios();

    const remotosFuncionarios =
      await buscarTodosFuncionariosRemotos();

    const mapaFuncionariosRemotos =
      new Map(
        remotosFuncionarios.map(
          (funcionario) => [
            funcionario.matricula,
            funcionario,
          ]
        )
      );

    const mapaFuncionariosLocais =
      new Map(
        locaisFuncionarios.map(
          (funcionario) => [
            funcionario.matricula,
            funcionario,
          ]
        )
      );

    for (
      const local
      of locaisFuncionarios
    ) {
      const remoto =
        mapaFuncionariosRemotos.get(
          local.matricula
        );

      if (
        !remoto ||
        !local.pin_hash ||
        !remoto.pin_hash ||
        !funcionariosIguais(
          local,
          remoto
        )
      ) {
        console.error(
          `Inconsistência no funcionário ${local.matricula}.`
        );

        return false;
      }
    }

    for (
      const remoto
      of remotosFuncionarios
    ) {
      if (
        !mapaFuncionariosLocais.has(
          remoto.matricula
        )
      ) {
        console.error(
          `Funcionário remoto ausente no SQLite: ${remoto.matricula}.`
        );

        return false;
      }
    }

    const locaisRegistros =
      listarTodosRegistrosParaSync();

    const remotosRegistros =
      await buscarTodosRegistrosRemotos();

    const mapaRegistrosRemotos =
      new Map(
        remotosRegistros.map(
          (registro) => [
            registro.uuid,
            registro,
          ]
        )
      );

    const mapaRegistrosLocais =
      new Map(
        locaisRegistros
          .filter(
            (registro) =>
              registro.uuid
          )
          .map(
            (registro) => [
              registro.uuid as string,
              registro,
            ]
          )
      );

    let registrosConferidos = true;
    for (const local of locaisRegistros) {
      const remoto = local.uuid ? mapaRegistrosRemotos.get(local.uuid) : undefined;
      const campos = remoto ? divergenciasRegistro(local, remoto) : ['ausente na leitura do Supabase'];
      const confirmado = campos.length === 0;
      if (confirmado !== (local.sincronizado === 1)) {
        definirSincronizacaoRegistro(local.id, confirmado);
      }
      if (!confirmado) {
        console.error(`Inconsistência no registro ${local.uuid} — ${campos.join(', ')}.`);
        registrosConferidos = false;
      }
    }
    if (!registrosConferidos) return false;

    for (
      const remoto
      of remotosRegistros
    ) {
      if (
        !mapaRegistrosLocais.has(
          remoto.uuid
        )
      ) {
        console.error(
          `Registro remoto ausente no SQLite: ${remoto.uuid}.`
        );

        return false;
      }
    }

    console.log(
      'Integridade SQLite ↔ Supabase confirmada.'
    );

    return true;
  } catch (error) {
    console.error(
      'Erro ao verificar integridade:',
      error
    );

    return false;
  }
}

async function executarSincronizacao() {
  const rede =
    await NetInfo.fetch();

  if (
    !rede.isConnected ||
    rede.isInternetReachable === false
  ) {
    console.log(
      'Sem internet. Dados mantidos no SQLite.'
    );

    return false;
  }

  try {
    console.log(
      'Iniciando sincronização completa...'
    );

    const supabaseOk =
      await testarSupabase();

    if (!supabaseOk) {
      return false;
    }

    /*
     * Primeiro converte PINs antigos.
     */
    await migrarPinsLegados();

    /*
     * 1. Supabase → SQLite
     */
    const downloadFuncionariosOk =
      await baixarFuncionarios();

    /*
     * 2. SQLite → Supabase
     *
     * Confere todos os campos.
     */
    const uploadFuncionariosOk =
      await sincronizarFuncionarios();

    /*
     * 3. Supabase → SQLite
     *
     * Funcionários precisam existir
     * antes dos registros.
     */
    const downloadRegistrosOk =
      await baixarRegistros();

    /*
     * 4. SQLite → Supabase
     *
     * Confere todo o histórico.
     */
    const uploadRegistrosOk =
      await sincronizarRegistros();

    /*
     * 5. Auditoria final.
     */
    const integridadeOk =
      await verificarIntegridade();

    const sucesso =
      downloadFuncionariosOk &&
      uploadFuncionariosOk &&
      downloadRegistrosOk &&
      uploadRegistrosOk &&
      integridadeOk;

    if (!sucesso) {
      console.warn(
        'Sincronização terminou com inconsistências.'
      );

      return false;
    }

    console.log(
      'Sincronização completa e bancos conferidos.'
    );

    return true;
  } catch (error) {
    console.error(
      'Falha na sincronização:',
      error
    );

    return false;
  }
}

/*
 * Tanto a sincronização automática
 * quanto o botão manual passam aqui.
 *
 * Se já houver uma sincronização
 * acontecendo, a segunda chamada
 * aguarda a mesma operação.
 */
export function sincronizarTudo():
  Promise<boolean> {
  if (sincronizacaoAtual) {
    console.log(
      'Sincronização já em andamento. Aguardando...'
    );

    return sincronizacaoAtual;
  }

  sincronizacaoAtual =
    executarSincronizacao()
      .finally(() => {
        sincronizacaoAtual = null;
      });

  return sincronizacaoAtual;
}
