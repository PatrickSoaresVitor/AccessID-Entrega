const data = require('../src/database/database');
const admin = require('../src/services/admin');
const session = require('../src/services/adminSession');

beforeEach(() => {
  data.db.execSync('DROP TABLE IF EXISTS registros_acesso; DROP TABLE IF EXISTS funcionarios; DROP TABLE IF EXISTS configuracoes;');
  data.initDatabase();
  session.encerrarSessaoAdmin();
});
afterAll(() => data.db.closeSync());

async function cadastrar() {
  await data.cadastrarFuncionario('Pessoa Teste', 'QA01', '', '', '08:00', '17:00', '1234');
  return data.buscarFuncionarioPorMatricula('QA01');
}

test('matrícula única, autenticação, redefinição de PIN e desativação preservam histórico', async () => {
  const pessoa = await cadastrar();
  await expect(cadastrar()).rejects.toThrow();
  expect(pessoa.pin).toBe('');
  expect(await data.autenticarFuncionario('QA01', '0000')).toBeNull();
  expect(await data.autenticarFuncionario('QA01', '1234')).toMatchObject({ id: pessoa.id });
  data.registrarAcesso(pessoa.id);
  await data.redefinirPinFuncionario(pessoa.id, '5678');
  expect(await data.autenticarFuncionario('QA01', '1234')).toBeNull();
  data.desativarFuncionario(pessoa.id);
  expect(await data.autenticarFuncionario('QA01', '5678')).toBeNull();
  expect(data.listarHistorico()).toHaveLength(1);
  data.ativarFuncionario(pessoa.id);
  expect(await data.autenticarFuncionario('QA01', '5678')).toMatchObject({ id: pessoa.id });
});

test('presença alterna no dia, preserva UUID e recomeça após a virada', async () => {
  const { id } = await cadastrar();
  expect(data.obterProximoTipoRegistro(id)).toBe('entrada');
  const entrada = data.registrarAcesso(id);
  expect(entrada.tipo).toBe('entrada');
  expect(data.obterResumoDashboard()).toEqual({ totalFuncionarios: 1, presentesAgora: 1, foraDaEmpresa: 0 });
  expect(data.obterProximoTipoRegistro(id)).toBe('saida');
  const saida = data.registrarAcesso(id);
  expect(saida.tipo).toBe('saida');
  expect(saida.uuid).not.toBe(entrada.uuid);
  expect(data.listarRegistrosPendentes()).toHaveLength(2);
  expect(data.obterResumoDashboard().presentesAgora).toBe(0);
  data.registrarAcesso(id);
  data.db.execSync("UPDATE registros_acesso SET data_hora = '2000-01-01T12:00:00Z'");
  expect(data.obterResumoDashboard().presentesAgora).toBe(0);
  expect(data.obterProximoTipoRegistro(id)).toBe('entrada');
  expect(data.registrarAcesso(id).tipo).toBe('entrada');
});

test('migração de PIN e UUID antigos é repetível', async () => {
  data.db.execSync(`
    INSERT INTO funcionarios (nome, matricula, pin) VALUES ('Legado', 'LEG', '1234');
    INSERT INTO registros_acesso (funcionario_id, tipo, data_hora) VALUES (1, 'entrada', '2000-01-01T12:00:00Z');
  `);
  expect(await data.migrarPinsLegados()).toBe(1);
  expect(await data.migrarPinsLegados()).toBe(0);
  expect(await data.autenticarFuncionario('LEG', '1234')).toMatchObject({ pin: '', sincronizado: 0 });
  expect(data.garantirUuidsRegistrosLocais()).toBe(1);
  const [{ uuid }] = data.listarHistorico();
  expect(uuid).toBeTruthy();
  expect(data.garantirUuidsRegistrosLocais()).toBe(0);
  expect(data.listarHistorico()[0].uuid).toBe(uuid);
});

test('PIN administrativo persiste separado da sessão em memória', async () => {
  expect(admin.adminConfigurado()).toBe(false);
  expect(await admin.validarPinAdmin('1234')).toBe(false);
  await admin.configurarPinAdmin('1234');
  expect(admin.adminConfigurado()).toBe(true);
  expect(await admin.validarPinAdmin('0000')).toBe(false);
  expect(await admin.validarPinAdmin('1234')).toBe(true);
  expect(session.sessaoAdminAtiva()).toBe(false);
  session.iniciarSessaoAdmin();
  expect(session.sessaoAdminAtiva()).toBe(true);
  session.encerrarSessaoAdmin();
  expect(session.sessaoAdminAtiva()).toBe(false);
  expect(admin.adminConfigurado()).toBe(true);
});
