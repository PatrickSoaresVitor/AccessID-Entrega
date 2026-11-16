import { MarcaAccessID } from '../components/marca-accessid';
import { router } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MarcaAccessID tamanho={82} />

        <Text style={styles.subtitle}>
          Controle inteligente de presença e acesso
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Registro de presença
        </Text>

        <Text style={styles.cardText}>
          Identifique-se para registrar sua
          entrada ou saída.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push({ pathname: '/registrar', params: { modo: 'qr' } })}
        >
          <Text style={styles.primaryButtonText}>Escanear crachá</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.adminButton,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            router.push('/registrar')
          }
        >
          <Text style={styles.adminButtonText}>
            Usar matrícula e PIN
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.adminButton,
          pressed && styles.pressed,
        ]}
        onPress={() =>
          router.push('/admin')
        }
      >
        <Text style={styles.adminButtonText}>
          Área administrativa
        </Text>
      </Pressable>

      <Text style={styles.footer}>
        AccessID
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: 40,
  },

  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 7,
  },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 18,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },

  cardText: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 21,
    marginTop: 7,
    marginBottom: 24,
  },

  primaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 17,
    borderRadius: 14,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  adminButton: {
    marginTop: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },

  adminButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },

  pressed: {
    opacity: 0.7,
  },

  footer: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 35,
    fontSize: 12,
  },
});
