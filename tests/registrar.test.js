const React = require('react');
const { Alert } = require('react-native');
const { render, fireEvent, waitFor } = require('@testing-library/react-native');
const data = require('../src/database/database');
const Registrar = require('../src/app/registrar').default;
const { sincronizarTudo } = require('../src/services/sync');

const { useLocalSearchParams, router } = require('expo-router');
const { useCameraPermissions } = require('expo-camera');
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(), router: { back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
}));
jest.mock('expo-camera', () => ({
  CameraView: props => require('react').createElement(require('react-native').View, { ...props, testID: 'camera' }),
  useCameraPermissions: jest.fn(),
}));
jest.mock('../src/services/sync', () => ({ sincronizarTudo: jest.fn() }));

let screen;
beforeEach(async () => {
  useLocalSearchParams.mockReturnValue({});
  useCameraPermissions.mockReturnValue([{ granted: true }, jest.fn()]);
  data.initDatabase();
  await data.cadastrarFuncionario('Pessoa QA', 'QA01', '', '', '', '', '1234');
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  sincronizarTudo.mockClear();
  screen = await render(React.createElement(Registrar));
});
afterEach(() => data.db.execSync('DELETE FROM registros_acesso; DELETE FROM funcionarios'));
afterAll(() => data.db.closeSync());

async function identificar(pin) {
  await fireEvent.changeText(screen.getByPlaceholderText('Digite sua matrícula'), 'QA01');
  await fireEvent.changeText(screen.getByPlaceholderText('Digite seu PIN'), pin);
  await fireEvent.press(screen.getByText('Identificar'));
}

test('só grava depois de confirmar e limpa as credenciais ao concluir', async () => {
  await identificar('1234');
  await screen.findByText('Pessoa QA');
  expect(data.listarHistorico()).toHaveLength(0);
  await fireEvent.press(screen.getByText('Cancelar'));
  expect(data.listarHistorico()).toHaveLength(0);
  await identificar('1234');
  await fireEvent.press(await screen.findByText('Confirmar entrada'));
  expect(data.listarHistorico()).toMatchObject([{ matricula: 'QA01', tipo: 'entrada', metodo: 'pin', sincronizado: 0 }]);
  expect(sincronizarTudo).toHaveBeenCalledTimes(1);
  expect(screen.getByPlaceholderText('Digite seu PIN').props.value).toBe('');
});

test('PIN inválido mantém o formulário e não cria marcação', async () => {
  await identificar('0000');
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Acesso negado', expect.any(String)));
  expect(screen.queryByText('Confirmar entrada')).toBeNull();
  expect(data.listarHistorico()).toHaveLength(0);
  expect(sincronizarTudo).not.toHaveBeenCalled();
});

function abrirScanner() {
  useLocalSearchParams.mockReturnValue({ modo: 'qr' });
  return screen.rerender(React.createElement(Registrar));
}

function ler(texto) {
  return fireEvent(screen.getByTestId('camera'), 'barcodeScanned', { type: 'qr', data: texto });
}

test('leituras repetidas aguardam uma confirmação e salvam um único evento QR', async () => {
  await abrirScanner();
  const evento = screen.getByTestId('camera').props.onBarcodeScanned;
  const { act } = require('@testing-library/react-native');
  await act(() => {
    evento({ data: 'ACCESSID:QA01' });
    evento({ data: 'ACCESSID:QA01' });
  });
  expect(data.listarHistorico()).toHaveLength(0);
  expect(screen.queryByTestId('camera')).toBeNull();
  await fireEvent.press(screen.getByText('Confirmar entrada'));
  expect(data.listarHistorico()).toMatchObject([{ matricula: 'QA01', tipo: 'entrada', metodo: 'qrcode', sincronizado: 0 }]);
  expect(sincronizarTudo).toHaveBeenCalledTimes(1);
  expect(router.dismissTo).toHaveBeenCalledWith('/');
});

test('rejeita QR inválido, matrícula desconhecida e funcionário inativo', async () => {
  await abrirScanner();
  await ler('QA01');
  expect(screen.getByText(/QR inválido/)).toBeTruthy();
  await fireEvent.press(screen.getByText('Tentar novamente'));
  await ler('ACCESSID:AUSENTE');
  expect(screen.getByText(/inativo ou não encontrado/)).toBeTruthy();
  await fireEvent.press(screen.getByText('Tentar novamente'));
  data.desativarFuncionario(data.buscarFuncionarioPorMatricula('QA01').id);
  await ler('ACCESSID:QA01');
  expect(screen.getByText(/inativo ou não encontrado/)).toBeTruthy();
  expect(data.listarHistorico()).toHaveLength(0);
});

test('sem permissão, oferece matrícula e PIN e mantém a câmera desmontada', async () => {
  useCameraPermissions.mockReturnValue([{ granted: false, canAskAgain: false }, jest.fn()]);
  await abrirScanner();
  expect(screen.queryByTestId('camera')).toBeNull();
  await fireEvent.press(screen.getByText('Usar matrícula e PIN'));
  expect(router.replace).toHaveBeenCalledWith('/registrar');
});
