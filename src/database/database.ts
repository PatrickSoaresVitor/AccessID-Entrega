import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('accessid.db');

export type Funcionario = {
  id: number;
  nome: string;
  matricula: string;
  setor: string | null;
  cargo: string | null;
  turno_inicio: string | null;
  turno_fim: string | null;
  pin: string;
  pin_hash: string | null;
  ativo: number;
  sincronizado: number;
  created_at: string | null;
};

export type FuncionarioRemoto = {
  nome: string;
  matricula: string;
  setor: string | null;
  cargo: string | null;
  turno_inicio: string | null;
  turno_fim: string | null;
  pin_hash: string | null;
  ativo: boolean;
  created_at?: string | null;
};

export type RegistroRemoto = {
  uuid: string;
  local_id: number | null;
  funcionario_matricula: string;
  tipo: 'entrada' | 'saida';
  data_hora: string;
  metodo: string;
  created_at?: string | null;
};

type ColunaTabela = {
  name: string;
};

function colunaExiste(
  tabela: string,
  coluna: string
) {
  const colunas =
    db.getAllSync<ColunaTabela>(
      `PRAGMA table_info(${tabela})`
    );

  return colunas.some(
    (item) => item.name === coluna
  );
}

function garantirEstruturaAtualizada() {
  if (
    !colunaExiste(
      'funcionarios',
      'pin_hash'
    )
  ) {
    db.execSync(`
      ALTER TABLE funcionarios
      ADD COLUMN pin_hash TEXT;
    `);
  }

  if (
    !colunaExiste(
      'registros_acesso',
      'uuid'
    )
  ) {
    db.execSync(`
      ALTER TABLE registros_acesso
      ADD COLUMN uuid TEXT;
    `);
  }

  db.execSync(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    idx_registros_acesso_uuid
    ON registros_acesso(uuid);
  `);
}

export function initDatabase() {
  db.execSync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS funcionarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      matricula TEXT NOT NULL UNIQUE,
      setor TEXT,
      cargo TEXT,
      turno_inicio TEXT,
      turno_fim TEXT,
      pin TEXT NOT NULL DEFAULT '',
      pin_hash TEXT,
      ativo INTEGER DEFAULT 1,
      sincronizado INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS registros_acesso (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT,
      funcionario_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      data_hora TEXT NOT NULL,
      metodo TEXT DEFAULT 'manual',
      sincronizado INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (funcionario_id)
      REFERENCES funcionarios(id)
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);

  garantirEstruturaAtualizada();

  console.log(
    'Banco AccessID inicializado.'
  );
}

async function gerarHashPin(
  pin: string
) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin
  );
}

/*
 * Converte automaticamente os PINs antigos
 * armazenados em texto para hash.
 */
export async function migrarPinsLegados() {
  const funcionarios =
    db.getAllSync<Funcionario>(`
      SELECT *
      FROM funcionarios
      WHERE
        (pin_hash IS NULL OR pin_hash = '')
        AND pin != ''
    `);

  let quantidade = 0;

  for (const funcionario of funcionarios) {
    const hash =
      await gerarHashPin(
        funcionario.pin
      );

    db.runSync(
      `
        UPDATE funcionarios
        SET
          pin_hash = ?,
          pin = '',
          sincronizado = 0
        WHERE id = ?
      `,
      [
        hash,
        funcionario.id,
      ]
    );

    quantidade++;
  }

  if (quantidade > 0) {
    console.log(
      `${quantidade} PIN(s) antigo(s) migrado(s) para hash.`
    );
  }

  return quantidade;
}

export async function cadastrarFuncionario(
  nome: string,
  matricula: string,
  setor: string,
  cargo: string,
  turnoInicio: string,
  turnoFim: string,
  pin: string
) {
  const pinHash =
    await gerarHashPin(pin);

  return db.runSync(
    `
      INSERT INTO funcionarios
      (
        nome,
        matricula,
        setor,
        cargo,
        turno_inicio,
        turno_fim,
        pin,
        pin_hash,
        sincronizado
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
    `,
    [
      nome,
      matricula,
      setor,
      cargo,
      turnoInicio,
      turnoFim,
      '',
      pinHash,
    ]
  );
}

export function listarFuncionarios():
  Funcionario[] {
  return db.getAllSync<Funcionario>(`
    SELECT *
    FROM funcionarios
    WHERE ativo = 1
    ORDER BY nome
  `);
}

export function listarTodosFuncionarios():
  Funcionario[] {
  return db.getAllSync<Funcionario>(`
    SELECT *
    FROM funcionarios
    ORDER BY ativo DESC, nome ASC
  `);
}

export function buscarFuncionarioPorMatricula(
  matricula: string
): Funcionario | null {
  const funcionario =
    db.getFirstSync<Funcionario>(
      `
        SELECT *
        FROM funcionarios
        WHERE matricula = ?
        LIMIT 1
      `,
      [matricula]
    );

  return funcionario ?? null;
}

export async function autenticarFuncionario(
  matricula: string,
  pin: string
): Promise<Funcionario | null> {
  const funcionario =
    db.getFirstSync<Funcionario>(
      `
        SELECT *
        FROM funcionarios
        WHERE matricula = ?
          AND ativo = 1
        LIMIT 1
      `,
      [matricula]
    );

  if (!funcionario) {
    return null;
  }

  const hashDigitado =
    await gerarHashPin(pin);

  /*
   * Funcionário já está no formato novo.
   */
  if (funcionario.pin_hash) {
    if (
      hashDigitado !==
      funcionario.pin_hash
    ) {
      return null;
    }

    return funcionario;
  }

  /*
   * Compatibilidade com banco antigo.
   */
  if (
    funcionario.pin &&
    funcionario.pin === pin
  ) {
    db.runSync(
      `
        UPDATE funcionarios
        SET
          pin_hash = ?,
          pin = '',
          sincronizado = 0
        WHERE id = ?
      `,
      [
        hashDigitado,
        funcionario.id,
      ]
    );

    return {
      ...funcionario,
      pin: '',
      pin_hash: hashDigitado,
      sincronizado: 0,
    };
  }

  return null;
}

type UltimoRegistro = {
  tipo: 'entrada' | 'saida';
  data_hora: string;
};

export function obterUltimoRegistro(
  funcionarioId: number
): UltimoRegistro | null {
  const registro =
    db.getFirstSync<UltimoRegistro>(
      `
        SELECT
          tipo,
          data_hora
        FROM registros_acesso
        WHERE funcionario_id = ?
        ORDER BY
          data_hora DESC,
          id DESC
        LIMIT 1
      `,
      [funcionarioId]
    );

  return registro ?? null;
}

function mesmaData(
  dataISO: string
) {
  const dataRegistro =
    new Date(dataISO);

  const agora =
    new Date();

  return (
    dataRegistro.getFullYear() ===
      agora.getFullYear() &&
    dataRegistro.getMonth() ===
      agora.getMonth() &&
    dataRegistro.getDate() ===
      agora.getDate()
  );
}

export function registrarAcesso(
  funcionarioId: number,
  metodo: 'pin' | 'qrcode' = 'pin'
) {
  const ultimoRegistro =
    obterUltimoRegistro(
      funcionarioId
    );

  let tipo:
    | 'entrada'
    | 'saida' = 'entrada';

  if (
    ultimoRegistro &&
    mesmaData(
      ultimoRegistro.data_hora
    ) &&
    ultimoRegistro.tipo ===
      'entrada'
  ) {
    tipo = 'saida';
  }

  const dataHora =
    new Date().toISOString();

  const uuid =
    Crypto.randomUUID();

  db.runSync(
    `
      INSERT INTO registros_acesso
      (
        uuid,
        funcionario_id,
        tipo,
        data_hora,
        metodo,
        sincronizado
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      uuid,
      funcionarioId,
      tipo,
      dataHora,
      metodo,
      0,
    ]
  );

  return {
    uuid,
    tipo,
    dataHora,
  };
}

export type RegistroHistorico = {
  id: number;
  uuid: string | null;
  funcionario_id: number;
  nome: string;
  matricula: string;
  setor: string | null;
  tipo: 'entrada' | 'saida';
  data_hora: string;
  metodo: string;
  sincronizado: number;
};

export function listarHistorico():
  RegistroHistorico[] {
  return db.getAllSync<
    RegistroHistorico
  >(`
    SELECT
      registros_acesso.id,
      registros_acesso.uuid,
      registros_acesso.funcionario_id,
      funcionarios.nome,
      funcionarios.matricula,
      funcionarios.setor,
      registros_acesso.tipo,
      registros_acesso.data_hora,
      registros_acesso.metodo,
      registros_acesso.sincronizado

    FROM registros_acesso

    INNER JOIN funcionarios
      ON funcionarios.id =
        registros_acesso.funcionario_id

    ORDER BY
      registros_acesso.data_hora DESC
  `);
}

export type ResumoDashboard = {
  totalFuncionarios: number;
  presentesAgora: number;
  foraDaEmpresa: number;
};

export function obterResumoDashboard():
  ResumoDashboard {
  const total =
    db.getFirstSync<{
      total: number;
    }>(`
      SELECT COUNT(*) AS total
      FROM funcionarios
      WHERE ativo = 1
    `);

  const presentes =
    db.getFirstSync<{
      total: number;
    }>(`
      SELECT COUNT(*) AS total

      FROM funcionarios f

      WHERE f.ativo = 1

      AND (
        SELECT r.tipo

        FROM registros_acesso r

        WHERE
          r.funcionario_id = f.id

          AND date(
            r.data_hora,
            'localtime'
          ) =
          date(
            'now',
            'localtime'
          )

        ORDER BY
          r.data_hora DESC,
          r.id DESC

        LIMIT 1
      ) = 'entrada'
    `);

  const totalFuncionarios =
    total?.total ?? 0;

  const presentesAgora =
    presentes?.total ?? 0;

  return {
    totalFuncionarios,
    presentesAgora,
    foraDaEmpresa:
      totalFuncionarios -
      presentesAgora,
  };
}

export function listarFuncionariosPendentes():
  Funcionario[] {
  return db.getAllSync<Funcionario>(`
    SELECT *
    FROM funcionarios
    WHERE sincronizado = 0
  `);
}

export function marcarFuncionarioSincronizado(
  id: number
) {
  db.runSync(
    `
      UPDATE funcionarios
      SET sincronizado = 1
      WHERE id = ?
    `,
    [id]
  );
}

export type RegistroSync = {
  id: number;
  uuid: string | null;
  funcionario_id: number;
  matricula: string;
  tipo: 'entrada' | 'saida';
  data_hora: string;
  metodo: string;
  sincronizado: number;
};

export function listarTodosRegistrosParaSync():
  RegistroSync[] {
  return db.getAllSync<
    RegistroSync
  >(`
    SELECT
      r.id,
      r.uuid,
      r.funcionario_id,
      f.matricula,
      r.tipo,
      r.data_hora,
      r.metodo,
      r.sincronizado

    FROM registros_acesso r

    INNER JOIN funcionarios f
      ON f.id = r.funcionario_id

    ORDER BY r.id
  `);
}

export function listarRegistrosPendentes():
  RegistroSync[] {
  return db.getAllSync<
    RegistroSync
  >(`
    SELECT
      r.id,
      r.uuid,
      r.funcionario_id,
      f.matricula,
      r.tipo,
      r.data_hora,
      r.metodo,
      r.sincronizado

    FROM registros_acesso r

    INNER JOIN funcionarios f
      ON f.id = r.funcionario_id

    WHERE r.sincronizado = 0

    ORDER BY r.id
  `);
}

export function definirSincronizacaoRegistro(
  id: number,
  confirmado: boolean
) {
  db.runSync(
    `
      UPDATE registros_acesso
      SET sincronizado = ?
      WHERE id = ?
    `,
    [confirmado ? 1 : 0, id]
  );
}

export function garantirUuidsRegistrosLocais() {
  const registros =
    db.getAllSync<{
      id: number;
    }>(`
      SELECT id
      FROM registros_acesso
      WHERE
        uuid IS NULL
        OR uuid = ''
    `);

  for (const registro of registros) {
    const uuid =
      Crypto.randomUUID();

    db.runSync(
      `
        UPDATE registros_acesso
        SET
          uuid = ?,
          sincronizado = 0
        WHERE id = ?
      `,
      [
        uuid,
        registro.id,
      ]
    );
  }

  return registros.length;
}

function mesmoInstante(
  dataA: string,
  dataB: string
) {
  return (
    new Date(dataA).getTime() ===
    new Date(dataB).getTime()
  );
}

/*
 * Recebe funcionário do Supabase.
 *
 * Se não existir localmente:
 * cria no SQLite.
 *
 * Se já existir:
 * preserva os dados locais.
 */
export function incorporarFuncionarioRemoto(
  remoto: FuncionarioRemoto
) {
  const local =
    buscarFuncionarioPorMatricula(
      remoto.matricula
    );

  if (local) {
    /*
     * Apenas recupera o hash se o
     * local ainda não possuir um.
     */
    if (
      !local.pin_hash &&
      remoto.pin_hash
    ) {
      db.runSync(
        `
          UPDATE funcionarios
          SET pin_hash = ?
          WHERE id = ?
        `,
        [
          remoto.pin_hash,
          local.id,
        ]
      );
    }

    return local.id;
  }

  const resultado =
    db.runSync(
      `
        INSERT INTO funcionarios
        (
          nome,
          matricula,
          setor,
          cargo,
          turno_inicio,
          turno_fim,
          pin,
          pin_hash,
          ativo,
          sincronizado,
          created_at
        )

        VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, 1, ?
        )
      `,
      [
        remoto.nome,
        remoto.matricula,
        remoto.setor,
        remoto.cargo,
        remoto.turno_inicio,
        remoto.turno_fim,
        '',
        remoto.pin_hash,
        remoto.ativo ? 1 : 0,
        remoto.created_at ??
          new Date().toISOString(),
      ]
    );

  return Number(
    resultado.lastInsertRowId
  );
}

/*
 * Recebe registro do Supabase.
 */
export function incorporarRegistroRemoto(
  remoto: RegistroRemoto
) {
  if (!remoto.uuid) {
    return false;
  }

  /*
   * Já existe pelo UUID.
   */
  const existente =
    db.getFirstSync<{
      id: number;
    }>(
      `
        SELECT id
        FROM registros_acesso
        WHERE uuid = ?
        LIMIT 1
      `,
      [remoto.uuid]
    );

  if (existente) {
    return true;
  }

  /*
   * Migração dos registros antigos:
   * tenta associar local_id antigo
   * ao UUID que agora existe no Supabase.
   */
  if (
    remoto.local_id !== null &&
    remoto.local_id !== undefined
  ) {
    const legado =
      db.getFirstSync<
        RegistroSync
      >(
        `
          SELECT
            r.id,
            r.uuid,
            r.funcionario_id,
            f.matricula,
            r.tipo,
            r.data_hora,
            r.metodo,
            r.sincronizado

          FROM registros_acesso r

          INNER JOIN funcionarios f
            ON f.id =
              r.funcionario_id

          WHERE
            r.id = ?
            AND (
              r.uuid IS NULL
              OR r.uuid = ''
            )
            AND f.matricula = ?

          LIMIT 1
        `,
        [
          remoto.local_id,
          remoto.funcionario_matricula,
        ]
      );

    if (
      legado &&
      legado.tipo ===
        remoto.tipo &&
      mesmoInstante(
        legado.data_hora,
        remoto.data_hora
      )
    ) {
      db.runSync(
        `
          UPDATE registros_acesso
          SET
            uuid = ?,
            sincronizado = 1
          WHERE id = ?
        `,
        [
          remoto.uuid,
          legado.id,
        ]
      );

      return true;
    }
  }

  const funcionario =
    buscarFuncionarioPorMatricula(
      remoto.funcionario_matricula
    );

  if (!funcionario) {
    console.warn(
      `Funcionário ${remoto.funcionario_matricula} não encontrado para importar registro.`
    );

    return false;
  }

  db.runSync(
    `
      INSERT INTO registros_acesso
      (
        uuid,
        funcionario_id,
        tipo,
        data_hora,
        metodo,
        sincronizado,
        created_at
      )

      VALUES (?, ?, ?, ?, ?, 1, ?)
    `,
    [
      remoto.uuid,
      funcionario.id,
      remoto.tipo,
      remoto.data_hora,
      remoto.metodo,
      remoto.created_at ??
        new Date().toISOString(),
    ]
  );

  return true;
}

export function obterConfiguracao(
  chave: string
): string | null {
  const resultado =
    db.getFirstSync<{
      valor: string;
    }>(
      `
        SELECT valor
        FROM configuracoes
        WHERE chave = ?
      `,
      [chave]
    );

  return resultado?.valor ?? null;
}

export function salvarConfiguracao(
  chave: string,
  valor: string
) {
  db.runSync(
    `
      INSERT INTO configuracoes
      (
        chave,
        valor
      )
      VALUES (?, ?)

      ON CONFLICT(chave)

      DO UPDATE
      SET valor =
        excluded.valor
    `,
    [
      chave,
      valor,
    ]
  );
}

export function buscarFuncionarioPorId(
  id: number
): Funcionario | null {
  const funcionario =
    db.getFirstSync<Funcionario>(
      `
        SELECT *
        FROM funcionarios
        WHERE id = ?
      `,
      [id]
    );

  return funcionario ?? null;
}

export function desativarFuncionario(
  id: number
) {
  db.runSync(
    `
      UPDATE funcionarios
      SET
        ativo = 0,
        sincronizado = 0
      WHERE id = ?
    `,
    [id]
  );
}

export function ativarFuncionario(
  id: number
) {
  db.runSync(
    `
      UPDATE funcionarios
      SET
        ativo = 1,
        sincronizado = 0
      WHERE id = ?
    `,
    [id]
  );
}

export function obterProximoTipoRegistro(
  funcionarioId: number
): 'entrada' | 'saida' {
  const ultimoRegistro =
    obterUltimoRegistro(
      funcionarioId
    );

  if (!ultimoRegistro) {
    return 'entrada';
  }

  const dataRegistro =
    new Date(
      ultimoRegistro.data_hora
    );

  const agora =
    new Date();

  const mesmoDia =
    dataRegistro.getFullYear() ===
      agora.getFullYear() &&
    dataRegistro.getMonth() ===
      agora.getMonth() &&
    dataRegistro.getDate() ===
      agora.getDate();

  if (
    mesmoDia &&
    ultimoRegistro.tipo ===
      'entrada'
  ) {
    return 'saida';
  }

  return 'entrada';
}

export async function redefinirPinFuncionario(
  id: number,
  novoPin: string
) {
  const pinHash =
    await gerarHashPin(novoPin);

  db.runSync(
    `
      UPDATE funcionarios
      SET
        pin = '',
        pin_hash = ?,
        sincronizado = 0
      WHERE id = ?
    `,
    [
      pinHash,
      id,
    ]
  );
}
