const React = require('react');
const { render, fireEvent } = require('@testing-library/react-native');
const QRCode = require('react-native-qrcode-svg').default;
const Funcionarios = require('../src/app/funcionarios').default;
const data = require('../src/database/database');
const session = require('../src/services/adminSession');
const { matriculaDoCracha } = require('../src/services/cracha');
const { router } = require('expo-router');

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useFocusEffect: callback => require('react').useEffect(callback, [callback]),
}));
jest.mock('../src/services/sync', () => ({ sincronizarTudo: jest.fn() }));
jest.mock('react-native-qrcode-svg', () => {
  const RealQRCode = jest.requireActual('react-native-qrcode-svg').default;
  return { __esModule: true, default: jest.fn(props => require('react').createElement(RealQRCode, props)) };
});

beforeEach(() => {
  data.initDatabase();
  session.encerrarSessaoAdmin();
});
afterEach(() => data.db.execSync('DELETE FROM funcionarios'));
afterAll(() => data.db.closeSync());

test('somente a sessão administrativa pode exibir a aba de crachás', async () => {
  const tela = await render(React.createElement(Funcionarios));
  expect(tela.queryByText('Gerar QR Code')).toBeNull();
  expect(router.replace).toHaveBeenCalledWith('/admin');
});

test('gera o QR selecionado com matrícula exata, sem criar presença', async () => {
  session.iniciarSessaoAdmin();
  const ativos = [['Ana', '0007'], ['Beto', 'RH-02']];
  for (const [nome, matricula] of [...ativos, ['Inativo', 'I']]) {
    await data.cadastrarFuncionario(nome, matricula, '', '', '', '', '1234');
  }
  data.desativarFuncionario(data.buscarFuncionarioPorMatricula('I').id);
  const tela = await render(React.createElement(Funcionarios));
  await fireEvent.press(tela.getByRole('tab', { name: 'Gerar QR Code' }));
  expect(tela.queryByText('Inativo')).toBeNull();
  for (const [nome, matricula] of ativos) {
    await fireEvent.press(tela.getByText(nome));
    expect(tela.queryByText(/Não foi possível gerar/)).toBeNull();
    const { value } = QRCode.mock.lastCall[0];
    expect(value).toBe('ACCESSID:' + matricula);
    expect(matriculaDoCracha(value)).toBe(matricula);
    await fireEvent.press(tela.getByText('Escolher outro funcionário'));
  }
  expect(data.listarHistorico()).toHaveLength(0);
}, 30000);
