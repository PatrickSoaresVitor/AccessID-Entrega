import { MarcaAccessID } from '../components/marca-accessid';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  adminConfigurado,
  configurarPinAdmin,
  validarPinAdmin,
} from '../services/admin';

import {
  iniciarSessaoAdmin,
} from '../services/adminSession';

export default function AdminScreen() {
  const [pin, setPin] = useState('');
  const [confirmarPin, setConfirmarPin] = useState('');
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);

  useEffect(() => {
    setPrimeiroAcesso(!adminConfigurado());
  }, []);

  async function continuar() {
    if (pin.length < 4) {
      Alert.alert(
        'PIN inválido',
        'O PIN deve possuir pelo menos 4 números.'
      );

      return;
    }

    // PRIMEIRO ACESSO
    if (primeiroAcesso) {
      if (pin !== confirmarPin) {
        Alert.alert(
          'PIN diferente',
          'Os PINs informados não coincidem.'
        );

        return;
      }

      await configurarPinAdmin(pin);

      // Libera a sessão administrativa
      iniciarSessaoAdmin();

      Alert.alert(
        'PIN criado',
        'A área administrativa foi configurada.'
      );

      router.replace('/painel');

      return;
    }

    // ACESSO NORMAL
    const valido = await validarPinAdmin(pin);

    if (!valido) {
      Alert.alert(
        'Acesso negado',
        'PIN administrativo incorreto.'
      );

      setPin('');

      return;
    }

    // PIN correto -> inicia sessão administrativa
    iniciarSessaoAdmin();

    router.replace('/painel');
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

      <View style={styles.content}>
        <View style={styles.marca}>
          <MarcaAccessID tamanho={64} />
        </View>

        <Text style={styles.title}>
          {primeiroAcesso
            ? 'Configurar administrador'
            : 'Área administrativa'}
        </Text>

        <Text style={styles.description}>
          {primeiroAcesso
            ? 'Crie um PIN para proteger as funções administrativas.'
            : 'Informe o PIN administrativo para continuar.'}
        </Text>

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

        {primeiroAcesso && (
          <TextInput
            style={styles.input}
            placeholder="Confirmar PIN"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            value={confirmarPin}
            onChangeText={setConfirmarPin}
            placeholderTextColor="#9CA3AF"
            selectionColor="#111827"
          />
        )}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={continuar}
        >
          <Text style={styles.buttonText}>
            {primeiroAcesso
              ? 'Criar PIN'
              : 'Entrar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 24,
    paddingTop: 55,
  },

  backButton: {
    marginBottom: 30,
  },

  backText: {
    fontSize: 16,
    color: '#374151',
  },

  content: {
    justifyContent: 'center',
    flex: 1,
    paddingBottom: 80,
  },

  marca: {
    alignSelf: 'center',
    marginBottom: 24,
  },

  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },

  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 28,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
  },

  button: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 5,
  },

  buttonPressed: {
    opacity: 0.75,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
