import { Component, type ReactNode, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { Funcionario } from '../database/database';
import { conteudoCracha, matriculaDoCracha } from '../services/cracha';

// O codificador pode rejeitar matrículas maiores que a capacidade do QR.
class CodigoDoCracha extends Component<{ children: ReactNode }> {
  state = { falhou: false };
  static getDerivedStateFromError() { return { falhou: true }; }
  render() {
    return this.state.falhou
      ? <Text>Não foi possível gerar um QR para esta matrícula.</Text>
      : this.props.children;
  }
}

export function CrachasFuncionarios({ funcionarios }: { funcionarios: Funcionario[] }) {
  const [id, selecionar] = useState<number | null>(null);
  const { width } = useWindowDimensions();
  const ativos = funcionarios.filter(pessoa => pessoa.ativo === 1);
  const pessoa = ativos.find(item => item.id === id);

  if (pessoa) {
    const conteudo = conteudoCracha(pessoa.matricula);
    return (
      <ScrollView contentContainerStyle={styles.cracha}>
        <Text style={styles.nome}>{pessoa.nome}</Text>
        <Text>Matrícula {pessoa.matricula}</Text>
        {matriculaDoCracha(conteudo) ? (
          <CodigoDoCracha key={conteudo}>
            <QRCode value={conteudo} size={Math.min(320, width - 80)} quietZone={60} />
          </CodigoDoCracha>
        ) : <Text>Matrícula incompatível com a leitura do crachá.</Text>}
        <Pressable accessibilityRole="button" onPress={() => selecionar(null)}>
          <Text style={styles.acao}>Escolher outro funcionário</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <FlatList data={ativos} keyExtractor={item => String(item.id)}
      ListHeaderComponent={ativos.length ? <Text style={styles.instrucao}>Selecione um funcionário para gerar o crachá.</Text> : undefined}
      ListEmptyComponent={<Text>Nenhum funcionário ativo. Cadastre ou reative um funcionário na aba Cadastro.</Text>}
      renderItem={({ item }) => (
        <Pressable accessibilityRole="button" style={styles.item} onPress={() => selecionar(item.id)}>
          <Text style={styles.nome}>{item.nome}</Text>
          <Text>Matrícula {item.matricula}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  cracha: { alignItems: 'center', backgroundColor: '#fff', padding: 16, gap: 10, borderRadius: 16 },
  item: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, gap: 4 },
  nome: { color: '#111827', fontSize: 18, fontWeight: '700' },
  instrucao: { color: '#374151', marginBottom: 14 },
  acao: { color: '#164789', fontWeight: '700', paddingVertical: 12 },
});
