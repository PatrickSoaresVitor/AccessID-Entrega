import { router, useFocusEffect } from 'expo-router';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  sessaoAdminAtiva,
} from '../services/adminSession';

import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ativarFuncionario,
  cadastrarFuncionario,
  desativarFuncionario,
  Funcionario,
  listarTodosFuncionarios,
  redefinirPinFuncionario,
} from '../database/database';

import { sincronizarTudo } from '../services/sync';
import { CrachasFuncionarios } from '../components/crachas-funcionarios';

export default function FuncionariosScreen() {
  const [aba, setAba] = useState<'Cadastro' | 'Gerar QR Code'>('Cadastro');
  const [acessoLiberado, setAcessoLiberado] =
  useState(false);
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [setor, setSetor] = useState('');
  const [cargo, setCargo] = useState('');

  const [turnoInicio, setTurnoInicio] =
    useState('07:00');

  const [turnoFim, setTurnoFim] =
    useState('17:00');

  const [pin, setPin] = useState('');

  const [funcionarios, setFuncionarios] =
    useState<Funcionario[]>([]);

  const [
    funcionarioPinSelecionado,
    setFuncionarioPinSelecionado,
  ] = useState<Funcionario | null>(null);

  const [novoPin, setNovoPin] =
    useState('');

  const [
    confirmarNovoPin,
    setConfirmarNovoPin,
  ] = useState('');

  function carregarFuncionarios() {
    setFuncionarios(
      listarTodosFuncionarios()
    );
  }

  useEffect(() => {
  if (!sessaoAdminAtiva()) {
    router.replace('/admin');
    return;
  }

  setAcessoLiberado(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (sessaoAdminAtiva()) {
        carregarFuncionarios();
      }
    }, [])
  );

  async function salvar() {
    if (!nome.trim()) {
      Alert.alert(
        'Campo obrigatório',
        'Informe o nome do funcionário.'
      );

      return;
    }

    if (!matricula.trim()) {
      Alert.alert(
        'Campo obrigatório',
        'Informe a matrícula.'
      );

      return;
    }

    if (pin.length < 4) {
      Alert.alert(
        'PIN inválido',
        'O PIN deve possuir pelo menos 4 números.'
      );

      return;
    }

    try {
      await cadastrarFuncionario(
        nome.trim(),
        matricula.trim(),
        setor.trim(),
        cargo.trim(),
        turnoInicio.trim(),
        turnoFim.trim(),
        pin
      );

      setNome('');
      setMatricula('');
      setSetor('');
      setCargo('');
      setTurnoInicio('07:00');
      setTurnoFim('17:00');
      setPin('');

      carregarFuncionarios();

      sincronizarTudo();

      Alert.alert(
        'Funcionário cadastrado',
        'O cadastro foi salvo com sucesso.'
      );
    } catch {
      Alert.alert(
        'Erro',
        'Não foi possível cadastrar. Verifique se essa matrícula já existe.'
      );
    }
  }

  function alterarStatus(
    funcionario: Funcionario
  ) {
    const estaAtivo =
      funcionario.ativo === 1;

    Alert.alert(
      estaAtivo
        ? 'Desativar funcionário'
        : 'Ativar funcionário',

      estaAtivo
        ? `Deseja desativar ${funcionario.nome}?`
        : `Deseja reativar ${funcionario.nome}?`,

      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },

        {
          text: estaAtivo
            ? 'Desativar'
            : 'Ativar',

          style: estaAtivo
            ? 'destructive'
            : 'default',

          onPress: () => {
            if (estaAtivo) {
              desativarFuncionario(
                funcionario.id
              );
            } else {
              ativarFuncionario(
                funcionario.id
              );
            }

            carregarFuncionarios();

            sincronizarTudo();
          },
        },
      ]
    );
  }

  if (!acessoLiberado) {
      return null;
    }

  function abrirRedefinicaoPin(
    funcionario: Funcionario
  ) {
    setFuncionarioPinSelecionado(
      funcionario
    );

    setNovoPin('');
    setConfirmarNovoPin('');
  }

  function fecharRedefinicaoPin() {
    setFuncionarioPinSelecionado(
      null
    );

    setNovoPin('');
    setConfirmarNovoPin('');
  }

  async function confirmarRedefinicaoPin() {
    if (!funcionarioPinSelecionado) {
      return;
    }

    if (novoPin.length < 4) {
      Alert.alert(
        'PIN inválido',
        'O PIN deve possuir pelo menos 4 números.'
      );

      return;
    }

    if (
      novoPin !==
      confirmarNovoPin
    ) {
      Alert.alert(
        'PINs diferentes',
        'Os PINs informados não coincidem.'
      );

      return;
    }

    try {
      await redefinirPinFuncionario(
        funcionarioPinSelecionado.id,
        novoPin
      );

      const nome =
        funcionarioPinSelecionado.nome;

      fecharRedefinicaoPin();

      carregarFuncionarios();

      const sincronizado =
        await sincronizarTudo();

      Alert.alert(
        'PIN redefinido',
        sincronizado
          ? `O novo PIN de ${nome} foi salvo e sincronizado.`
          : `O novo PIN de ${nome} foi salvo localmente. A sincronização será tentada novamente quando possível.`
      );
    } catch (error) {
      console.error(
        'Erro ao redefinir PIN:',
        error
      );

      Alert.alert(
        'Erro',
        'Não foi possível redefinir o PIN.'
      );
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backText}>
          ← Voltar
        </Text>
      </Pressable>

      <View style={styles.abas} accessibilityRole="tablist">
        {(['Cadastro', 'Gerar QR Code'] as const).map(titulo => (
          <Pressable key={titulo} accessibilityRole="tab" accessibilityState={{ selected: aba === titulo }}
            style={[styles.aba, aba === titulo && styles.abaAtiva]} onPress={() => setAba(titulo)}>
            <Text style={[styles.abaTexto, aba === titulo && styles.abaTextoAtivo]}>{titulo}</Text>
          </Pressable>
        ))}
      </View>
      {aba === 'Gerar QR Code' ? <CrachasFuncionarios funcionarios={funcionarios} /> : (
      <FlatList
        data={funcionarios}
        keyExtractor={(item) =>
          item.id.toString()
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.listContent
        }
        ListHeaderComponent={
          <>
            <Text style={styles.title}>
              Funcionários
            </Text>

            <Text style={styles.subtitle}>
              Cadastro e gerenciamento
            </Text>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                Novo funcionário
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Nome completo"
                value={nome}
                onChangeText={setNome}
                placeholderTextColor="#9CA3AF"
                selectionColor="#111827"
              />

              <TextInput
                style={styles.input}
                placeholder="Matrícula"
                value={matricula}
                onChangeText={setMatricula}
                placeholderTextColor="#9CA3AF"
                selectionColor="#111827"
              />

              <TextInput
                style={styles.input}
                placeholder="Setor"
                value={setor}
                onChangeText={setSetor}
                placeholderTextColor="#9CA3AF"
                selectionColor="#111827"
              />

              <TextInput
                style={styles.input}
                placeholder="Cargo"
                value={cargo}
                onChangeText={setCargo}
                placeholderTextColor="#9CA3AF"
                selectionColor="#111827"
              />

              <View style={styles.row}>
                <TextInput
                  style={[
                    styles.input,
                    styles.half,
                  ]}
                  placeholder="Entrada"
                  value={turnoInicio}
                  onChangeText={
                    setTurnoInicio
                  }
                  placeholderTextColor="#9CA3AF"
                  selectionColor="#111827"
                />

                <TextInput
                  style={[
                    styles.input,
                    styles.half,
                  ]}
                  placeholder="Saída"
                  value={turnoFim}
                  onChangeText={
                    setTurnoFim
                  }
                  placeholderTextColor="#9CA3AF"
                  selectionColor="#111827"
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="PIN"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
                value={pin}
                onChangeText={setPin}
                placeholderTextColor="#9CA3AF"
                selectionColor="#111827"
              />

              <Pressable
                style={styles.primaryButton}
                onPress={salvar}
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Cadastrar funcionário
                </Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>
              Funcionários cadastrados
            </Text>
          </>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.employeeCard,

              item.ativo === 0 &&
                styles.inactiveCard,
            ]}
          >
            <View style={styles.employeeTop}>
              <View style={styles.employeeInfo}>
                <Text style={styles.name}>
                  {item.nome}
                </Text>

                <Text style={styles.registration}>
                  Matrícula {item.matricula}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,

                  item.ativo === 1
                    ? styles.activeBadge
                    : styles.inactiveBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,

                    item.ativo === 1
                      ? styles.activeText
                      : styles.inactiveText,
                  ]}
                >
                  {item.ativo === 1
                    ? 'ATIVO'
                    : 'INATIVO'}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.detail}>
              Setor:{' '}
              {item.setor ||
                'Não informado'}
            </Text>

            <Text style={styles.detail}>
              Cargo:{' '}
              {item.cargo ||
                'Não informado'}
            </Text>

            <Text style={styles.detail}>
              Turno:{' '}
              {item.turno_inicio ||
                '--:--'}
              {' às '}
              {item.turno_fim ||
                '--:--'}
            </Text>

            <Pressable
              style={styles.pinButton}
              onPress={() =>
                abrirRedefinicaoPin(item)
              }
            >
              <Text style={styles.pinButtonText}>
                Redefinir PIN
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.statusButton,

                item.ativo === 0 &&
                  styles.activateButton,
              ]}
              onPress={() =>
                alterarStatus(item)
              }
            >
              <Text
                style={[
                  styles.statusButtonText,

                  item.ativo === 0 &&
                    styles.activateButtonText,
                ]}
              >
                {item.ativo === 1
                  ? 'Desativar funcionário'
                  : 'Reativar funcionário'}
              </Text>
            </Pressable>
          </View>
        )}
      />
      )}
      <Modal
        visible={
          funcionarioPinSelecionado !==
          null
        }
        transparent
        animationType="fade"
        onRequestClose={
          fecharRedefinicaoPin
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Redefinir PIN
            </Text>

            <Text
              style={styles.modalDescription}
            >
              {funcionarioPinSelecionado
                ? `Funcionário: ${funcionarioPinSelecionado.nome}`
                : ''}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Novo PIN"
              placeholderTextColor="#9CA3AF"
              selectionColor="#111827"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              value={novoPin}
              onChangeText={setNovoPin}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirmar novo PIN"
              placeholderTextColor="#9CA3AF"
              selectionColor="#111827"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              value={confirmarNovoPin}
              onChangeText={
                setConfirmarNovoPin
              }
            />

            <Pressable
              style={styles.primaryButton}
              onPress={
                confirmarRedefinicaoPin
              }
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Salvar novo PIN
              </Text>
            </Pressable>

            <Pressable
              style={styles.modalCancel}
              onPress={
                fecharRedefinicaoPin
              }
            >
              <Text
                style={styles.modalCancelText}
              >
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  abas: { flexDirection: 'row', gap: 4, marginBottom: 16 },
  aba: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, backgroundColor: '#fff' },
  abaAtiva: { backgroundColor: '#111827' },
  abaTexto: { color: '#374151', fontWeight: '600' },
  abaTextoAtivo: { color: '#fff' },
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 20,
    paddingTop: 55,
  },

  backButton: {
    marginBottom: 15,
  },

  backText: {
    fontSize: 16,
    color: '#374151',
  },

  listContent: {
    paddingBottom: 50,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 22,
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 28,
    elevation: 2,
  },

  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    marginBottom: 11,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  half: {
    flex: 1,
  },

  primaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 3,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  employeeCard: {
    backgroundColor: '#FFFFFF',
    padding: 17,
    borderRadius: 16,
    marginBottom: 13,
    elevation: 2,
  },

  inactiveCard: {
    opacity: 0.65,
  },

  employeeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  employeeInfo: {
    flex: 1,
  },

  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  registration: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },

  activeBadge: {
    backgroundColor: '#DCFCE7',
  },

  inactiveBadge: {
    backgroundColor: '#F3F4F6',
  },

  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  activeText: {
    color: '#15803D',
  },

  inactiveText: {
    color: '#6B7280',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 14,
  },

  detail: {
    color: '#4B5563',
    fontSize: 14,
    marginBottom: 4,
  },

  statusButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },

  statusButtonText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 13,
  },

  activateButton: {
    borderColor: '#86EFAC',
  },

  activateButtonText: {
    color: '#15803D',
  },

  pinButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },

  pinButtonText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 13,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },

  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    marginBottom: 20,
  },

  modalCancel: {
    paddingVertical: 15,
    alignItems: 'center',
  },

  modalCancelText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
});
