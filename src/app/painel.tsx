import { MarcaAccessID } from '../components/marca-accessid';
import NetInfo from '@react-native-community/netinfo';
import { router, useFocusEffect } from 'expo-router';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  obterResumoDashboard,
  ResumoDashboard,
} from '../database/database';

import {
  encerrarSessaoAdmin,
  sessaoAdminAtiva,
} from '../services/adminSession';

import {
  sincronizarTudo,
} from '../services/sync';

export default function PainelScreen() {
  const [acessoLiberado, setAcessoLiberado] =
    useState(false);

  const [online, setOnline] =
    useState(false);

  const [sincronizando, setSincronizando] =
    useState(false);

  const [resumo, setResumo] =
    useState<ResumoDashboard>({
      totalFuncionarios: 0,
      presentesAgora: 0,
      foraDaEmpresa: 0,
    });

  // Verifica se o administrador realmente fez login
  useEffect(() => {
    if (!sessaoAdminAtiva()) {
      router.replace('/admin');

      return;
    }

    setAcessoLiberado(true);
  }, []);

  // Monitora conexão com a internet
  useEffect(() => {
    const unsubscribe =
      NetInfo.addEventListener((state) => {
        const conectado = Boolean(
          state.isConnected &&
            state.isInternetReachable !== false
        );

        setOnline(conectado);
      });

    return () => {
      unsubscribe();
    };
  }, []);

  function carregarDashboard() {
    const dados =
      obterResumoDashboard();

    setResumo(dados);
  }

  // Atualiza os números toda vez que volta para o painel
  useFocusEffect(
    useCallback(() => {
      if (sessaoAdminAtiva()) {
        carregarDashboard();
      }
    }, [])
  );

  async function sincronizar() {
    if (!online) {
      Alert.alert(
        'Sem internet',
        'O AccessID está funcionando offline. Os dados serão sincronizados automaticamente quando a conexão retornar.'
      );

      return;
    }

    setSincronizando(true);

    const sucesso =
      await sincronizarTudo();

    setSincronizando(false);

    if (sucesso) {
      Alert.alert(
        'Sincronização concluída',
        'Os dados locais foram sincronizados com sucesso.'
      );
    } else {
      Alert.alert(
        'Sincronização incompleta',
        'Não foi possível sincronizar todos os dados. Os registros pendentes permanecerão salvos localmente para uma nova tentativa.'
      );
    }
  }

  function sair() {
    encerrarSessaoAdmin();

    router.replace('/');
  }

  // Não mostra o painel nem por um instante
  // antes da validação da sessão.
  if (!acessoLiberado) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <MarcaAccessID tamanho={44} />

          <Text style={styles.adminLabel}>
            Painel administrativo
          </Text>
        </View>

        <View
          style={[
            styles.connectionBadge,
            online
              ? styles.connectionOnline
              : styles.connectionOffline,
          ]}
        >
          <Text
            style={[
              styles.connectionText,
              online
                ? styles.connectionOnlineText
                : styles.connectionOfflineText,
            ]}
          >
            {online
              ? '● ONLINE'
              : '● OFFLINE'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        Visão geral
      </Text>

      <View style={styles.dashboard}>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>
            {resumo.totalFuncionarios}
          </Text>

          <Text style={styles.cardLabel}>
            Funcionários
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardNumber}>
            {resumo.presentesAgora}
          </Text>

          <Text style={styles.cardLabel}>
            Presentes
          </Text>
        </View>

        <View style={styles.cardFull}>
          <Text style={styles.cardNumber}>
            {resumo.foraDaEmpresa}
          </Text>

          <Text style={styles.cardLabel}>
            Fora da empresa
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        Gerenciamento
      </Text>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
        ]}
        onPress={() =>
          router.push('/funcionarios')
        }
      >
        <Text
          style={styles.primaryButtonText}
        >
          Gerenciar funcionários
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}
        onPress={() =>
          router.push('/historico')
        }
      >
        <Text
          style={styles.secondaryButtonText}
        >
          Ver histórico de registros
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
        ]}
        onPress={sincronizar}
        disabled={sincronizando}
      >
        <Text
          style={styles.secondaryButtonText}
        >
          {sincronizando
            ? 'Sincronizando...'
            : 'Sincronizar dados agora'}
        </Text>
      </Pressable>

      <View style={styles.databaseCard}>
        <Text style={styles.databaseTitle}>
          Armazenamento
        </Text>

        <View style={styles.databaseRow}>
          <Text style={styles.databaseLabel}>
            SQLite local
          </Text>

          <Text style={styles.ok}>
            Ativo
          </Text>
        </View>

        <View style={styles.databaseRow}>
          <Text style={styles.databaseLabel}>
            Internet
          </Text>

          <Text
            style={
              online
                ? styles.ok
                : styles.offline
            }
          >
            {online
              ? 'Online'
              : 'Offline'}
          </Text>
        </View>

        <View style={styles.databaseRow}>
          <Text style={styles.databaseLabel}>
            Sincronização
          </Text>

          <Text style={styles.ok}>
            Automática
          </Text>
        </View>
      </View>

      <Pressable
        style={styles.logoutButton}
        onPress={sair}
      >
        <Text style={styles.logoutText}>
          Sair da área administrativa
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },

  adminLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
  },

  connectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  connectionOnline: {
    backgroundColor: '#DCFCE7',
  },

  connectionOffline: {
    backgroundColor: '#FEE2E2',
  },

  connectionText: {
    fontSize: 11,
    fontWeight: '800',
  },

  connectionOnlineText: {
    color: '#15803D',
  },

  connectionOfflineText: {
    color: '#B91C1C',
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  dashboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },

  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
  },

  cardFull: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 2,
  },

  cardNumber: {
    fontSize: 29,
    fontWeight: '800',
    color: '#111827',
  },

  cardLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  primaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 13,
    alignItems: 'center',
    marginBottom: 10,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 13,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },

  secondaryButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },

  databaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
  },

  databaseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },

  databaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },

  databaseLabel: {
    color: '#6B7280',
    fontSize: 13,
  },

  ok: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '700',
  },

  offline: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },

  logoutButton: {
    alignItems: 'center',
    paddingVertical: 17,
    marginTop: 8,
  },

  logoutText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },

  pressed: {
    opacity: 0.7,
  },
});