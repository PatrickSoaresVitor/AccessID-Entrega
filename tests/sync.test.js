const data = require('../src/database/database');
const { sincronizarTudo } = require('../src/services/sync');
const net = require('@react-native-community/netinfo').default;
const { supabase } = require('../src/services/supabase');

jest.mock('@react-native-community/netinfo', () => ({ __esModule: true, default: { fetch: jest.fn() } }));
jest.mock('../src/services/supabase', () => ({ supabase: { from: jest.fn() } }));

let remote;
beforeEach(() => {
  data.initDatabase();
  remote = { funcionarios: [], registros_acesso: [] };
  net.fetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
  supabase.from.mockReset().mockImplementation(table => ({
    select: () => ({
      limit: async () => ({ data: [], error: null }),
      range: async (first, last) => ({ data: remote[table].slice(first, last + 1), error: null }),
    }),
    upsert: async (row, { onConflict }) => {
      const existing = remote[table].find(item => item[onConflict] === row[onConflict]);
      if (existing) Object.assign(existing, row);
      else remote[table].push({ ...row });
      return { error: null };
    },
  }));
});
afterEach(() => data.db.execSync('DELETE FROM registros_acesso; DELETE FROM funcionarios'));
afterAll(() => data.db.closeSync());

test.each(['ausente', 'metodo'])('auditoria mantém todos os eventos pendentes quando a releitura indica %s', async (motivo) => {
  await data.cadastrarFuncionario('Pessoa Teste', 'QA01', '', '', '', '', '1234');
  const pessoa = data.buscarFuncionarioPorMatricula('QA01');
  const eventos = ['pin', 'qrcode'].map(metodo => data.registrarAcesso(pessoa.id, metodo));
  const normal = supabase.from.getMockImplementation();
  const erro = jest.spyOn(console, 'error').mockImplementation(() => {});
  supabase.from.mockImplementation(table => {
    const api = normal(table);
    if (table === 'registros_acesso') api.upsert = async row => {
      if (motivo === 'metodo') remote[table].push({ ...row, metodo: 'outro' });
      return { error: null };
    };
    return api;
  });
  expect(await sincronizarTudo()).toBe(false);
  expect(data.listarRegistrosPendentes().map(row => row.uuid)).toEqual(eventos.map(row => row.uuid));
  for (const { uuid } of eventos) {
    expect(erro).toHaveBeenCalledWith(expect.stringContaining(uuid + ' — ' + motivo));
  }
  supabase.from.mockImplementation(normal);
  expect(await sincronizarTudo()).toBe(true);
  expect(data.listarRegistrosPendentes()).toHaveLength(0);
  expect(remote.registros_acesso).toHaveLength(2);
});

test.each(['pin', 'qrcode'])('offline mantém pendências de %s; reconexão compartilha execução e reconcilia pelo UUID', async (metodo) => {
  await data.cadastrarFuncionario('Pessoa Teste', 'QA01', '', '', '', '', '1234');
  const pessoa = data.buscarFuncionarioPorMatricula('QA01');
  const { uuid } = data.registrarAcesso(pessoa.id, metodo);
  net.fetch.mockResolvedValueOnce({ isConnected: false });
  expect(await sincronizarTudo()).toBe(false);
  expect(supabase.from).not.toHaveBeenCalled();
  expect(data.listarRegistrosPendentes()).toHaveLength(1);
  const emCurso = sincronizarTudo();
  expect(sincronizarTudo()).toBe(emCurso);
  expect(await emCurso).toBe(true);
  expect(remote.registros_acesso).toMatchObject([{ uuid, metodo, funcionario_matricula: 'QA01' }]);
  expect(data.listarRegistrosPendentes()).toHaveLength(0);
  remote.registros_acesso[0].metodo = 'divergente';
  expect(await sincronizarTudo()).toBe(true);
  expect(remote.registros_acesso).toMatchObject([{ uuid, metodo }]);

  // Simula uma nova instalação apenas no banco em memória da suíte.
  data.db.execSync('DELETE FROM registros_acesso; DELETE FROM funcionarios');
  expect(await sincronizarTudo()).toBe(true);
  expect(await data.autenticarFuncionario('QA01', '1234')).toBeTruthy();
  expect(data.listarHistorico()).toMatchObject([{ uuid, metodo, sincronizado: 1 }]);
});

test('cadastro remoto sem hash impede sucesso da auditoria; redefinir o PIN permite nova tentativa', async () => {
  remote.funcionarios.push({ nome: 'Legado', matricula: 'LEG', setor: null, cargo: null,
    turno_inicio: null, turno_fim: null, ativo: true, pin_hash: null });
  expect(await sincronizarTudo()).toBe(false);
  const pessoa = data.buscarFuncionarioPorMatricula('LEG');
  await data.redefinirPinFuncionario(pessoa.id, '5678');
  expect(await sincronizarTudo()).toBe(true);
  expect(remote.funcionarios[0].pin_hash).toBeTruthy();
  expect(remote.funcionarios[0].pin_hash).toBe(data.buscarFuncionarioPorMatricula('LEG').pin_hash);
});

test('erro de upload mantém evento pendente e permite retry', async () => {
  await data.cadastrarFuncionario('Pessoa Teste', 'QA01', '', '', '', '', '1234');
  data.registrarAcesso(data.buscarFuncionarioPorMatricula('QA01').id);
  const normal = supabase.from.getMockImplementation();
  supabase.from.mockImplementation(table => {
    const api = normal(table);
    if (table === 'registros_acesso') api.upsert = async () => ({ error: { message: 'falha simulada' } });
    return api;
  });
  expect(await sincronizarTudo()).toBe(false);
  expect(data.listarRegistrosPendentes()).toHaveLength(1);
  supabase.from.mockImplementation(normal);
  expect(await sincronizarTudo()).toBe(true);
  expect(data.listarRegistrosPendentes()).toHaveLength(0);
});
