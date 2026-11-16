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
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  listarHistorico,
  RegistroHistorico,
} from '../database/database';

export default function HistoricoScreen() {
  const [acessoLiberado, setAcessoLiberado] =
  useState(false);
  const [registros, setRegistros] =
    useState<RegistroHistorico[]>([]);

  function carregarHistorico() {
    const dados = listarHistorico();
    setRegistros(dados);
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
        carregarHistorico();
      }
    }, [])
  );
  
  function formatarData(dataISO: string) {
    const data = new Date(dataISO);

    return data.toLocaleDateString('pt-BR');
  }

  function formatarHora(dataISO: string) {
    const data = new Date(dataISO);

    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  if (!acessoLiberado) {
  return null;
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => router.back()}
        style={styles.voltar}
      >
        <Text style={styles.voltarTexto}>
          ← Voltar
        </Text>
      </Pressable>

      <View style={styles.header}>
        <Text style={styles.title}>
          Histórico
        </Text>

        <Text style={styles.subtitle}>
          Registros de entrada e saída
        </Text>
      </View>

      {registros.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            Nenhum registro encontrado
          </Text>

          <Text style={styles.emptyText}>
            Os registros de presença aparecerão aqui.
          </Text>
        </View>
      ) : (
        <FlatList
          data={registros}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.employeeInfo}>
                  <Text style={styles.nome}>
                    {item.nome}
                  </Text>

                  <Text style={styles.matricula}>
                    Matrícula {item.matricula}
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    item.tipo === 'entrada'
                      ? styles.badgeEntrada
                      : styles.badgeSaida,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      item.tipo === 'entrada'
                        ? styles.textEntrada
                        : styles.textSaida,
                    ]}
                  >
                    {item.tipo === 'entrada'
                      ? 'ENTRADA'
                      : 'SAÍDA'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.details}>
                <View>
                  <Text style={styles.detailLabel}>
                    Data
                  </Text>

                  <Text style={styles.detailValue}>
                    {formatarData(item.data_hora)}
                  </Text>
                </View>

                <View>
                  <Text style={styles.detailLabel}>
                    Horário
                  </Text>

                  <Text style={styles.detailValue}>
                    {formatarHora(item.data_hora)}
                  </Text>
                </View>

                <View>
                  <Text style={styles.detailLabel}>
                    Método
                  </Text>

                  <Text style={styles.detailValue}>
                    {item.metodo.toUpperCase()}
                  </Text>
                </View>
              </View>

              {item.sincronizado === 0 && (
                <Text style={styles.syncPending}>
                  ● Aguardando sincronização
                </Text>
              )}

              {item.sincronizado === 1 && (
                <Text style={styles.syncOk}>
                  ● Sincronizado
                </Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
    paddingHorizontal: 20,
    paddingTop: 55,
  },

  voltar: {
    marginBottom: 20,
  },

  voltarTexto: {
    fontSize: 16,
    color: '#374151',
  },

  header: {
    marginBottom: 25,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 5,
  },

  lista: {
    paddingBottom: 40,
  },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  employeeInfo: {
    flex: 1,
  },

  nome: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  matricula: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  badgeEntrada: {
    backgroundColor: '#DCFCE7',
  },

  badgeSaida: {
    backgroundColor: '#FEE2E2',
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },

  textEntrada: {
    color: '#15803D',
  },

  textSaida: {
    color: '#B91C1C',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 15,
  },

  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  detailLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 3,
  },

  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  syncPending: {
    marginTop: 14,
    fontSize: 12,
    color: '#D97706',
  },

  syncOk: {
    marginTop: 14,
    fontSize: 12,
    color: '#16A34A',
  },

  empty: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 7,
  },
});