import { MarcaAccessID } from '../components/marca-accessid';
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { LeitorCracha } from "../components/leitor-cracha";

import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  autenticarFuncionario,
  buscarFuncionarioPorId,
  Funcionario,
  obterProximoTipoRegistro,
  registrarAcesso,
} from "../database/database";

import { sincronizarTudo } from "../services/sync";

export default function RegistrarScreen() {
  const { modo } = useLocalSearchParams<{ modo?: string }>();
  const usarQr = modo === "qr";
  const confirmacaoConsumida = useRef(false);
  const [matricula, setMatricula] = useState("");
  const [pin, setPin] = useState("");

  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);

  const [proximoRegistro, setProximoRegistro] = useState<"entrada" | "saida">(
    "entrada",
  );

  async function identificar() {
    if (!matricula.trim() || !pin) {
      Alert.alert("Atenção", "Informe sua matrícula e PIN.");

      return;
    }

    const encontrado =
      await autenticarFuncionario(
        matricula.trim(),
        pin
      );

    if (!encontrado) {
      Alert.alert("Acesso negado", "Matrícula ou PIN incorreto.");

      return;
    }

    apresentar(encontrado);
  }

  function apresentar(encontrado: Funcionario) {
    confirmacaoConsumida.current = false;
    const tipo = obterProximoTipoRegistro(encontrado.id);
    setFuncionario(encontrado);
    setProximoRegistro(tipo);
  }

  function confirmarRegistro() {
    if (!funcionario || confirmacaoConsumida.current) {
      return;
    }

    if (buscarFuncionarioPorId(funcionario.id)?.ativo !== 1) {
      limpar();
      Alert.alert("Acesso negado", "Funcionário inativo ou não encontrado.");
      return;
    }
    const registro = registrarAcesso(funcionario.id, usarQr ? "qrcode" : "pin");
    confirmacaoConsumida.current = true;

    sincronizarTudo();

    const tipoTexto = registro.tipo === "entrada" ? "ENTRADA" : "SAÍDA";

    Alert.alert(
      `${tipoTexto} registrada`,
      `${funcionario.nome}\n\nRegistro realizado com sucesso.`,
    );

    limpar();
    if (usarQr) router.dismissTo("/");
  }

  function limpar() {
    setFuncionario(null);
    setMatricula("");
    setPin("");
    setProximoRegistro("entrada");
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>← Voltar</Text>
      </Pressable>

      <View style={styles.header}>
        <MarcaAccessID tamanho={58} />

        <Text style={styles.title}>Registro de presença</Text>

        <Text style={styles.subtitle}>Identifique-se para continuar</Text>
      </View>

      {!funcionario && usarQr ? (
        <LeitorCracha onIdentificado={apresentar} />
      ) : !funcionario ? (
        <View style={styles.card}>
          <Text style={styles.label}>Matrícula</Text>

          <TextInput
            style={styles.input}
            placeholder="Digite sua matrícula"
            value={matricula}
            onChangeText={setMatricula}
            autoCapitalize="none"
            placeholderTextColor="#9CA3AF"
            selectionColor="#111827"
          />

          <Text style={styles.label}>PIN</Text>

          <TextInput
            style={styles.input}
            placeholder="Digite seu PIN"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            placeholderTextColor="#9CA3AF"
            selectionColor="#111827"
          />

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
            onPress={identificar}
          >
            <Text style={styles.primaryButtonText}>Identificar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.identificationCard}>
          <Text style={styles.identifiedLabel}>Funcionário identificado</Text>

          <Text style={styles.employeeName}>{funcionario.nome}</Text>

          <Text style={styles.employeeDetail}>
            Matrícula {funcionario.matricula}
          </Text>

          <Text style={styles.employeeDetail}>
            {funcionario.cargo || "Cargo não informado"}
            {" • "}
            {funcionario.setor || "Setor não informado"}
          </Text>

          <View style={styles.divider} />

          <Text style={styles.nextLabel}>Próximo registro</Text>

          <View
            style={[
              styles.statusBox,
              proximoRegistro === "entrada" ? styles.entryBox : styles.exitBox,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                proximoRegistro === "entrada"
                  ? styles.entryText
                  : styles.exitText,
              ]}
            >
              {proximoRegistro === "entrada" ? "ENTRADA" : "SAÍDA"}
            </Text>
          </View>

          <Pressable style={styles.primaryButton} onPress={confirmarRegistro}>
            <Text style={styles.primaryButtonText}>
              Confirmar {proximoRegistro === "entrada" ? "entrada" : "saída"}
            </Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={limpar}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.footer}>
        Seus registros são armazenados localmente e sincronizados
        automaticamente.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F8",
    paddingHorizontal: 24,
    paddingTop: 55,
  },

  backButton: {
    marginBottom: 25,
  },

  backText: {
    fontSize: 16,
    color: "#374151",
  },

  header: {
    alignItems: "center",
    marginBottom: 30,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 20,
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 5,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    elevation: 3,
  },

  identificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    elevation: 3,
    alignItems: "center",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 7,
  },

  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 18,
  },

  primaryButton: {
    width: "100%",
    backgroundColor: "#111827",
    paddingVertical: 17,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  identifiedLabel: {
    color: "#6B7280",
    fontSize: 13,
    marginBottom: 8,
  },

  employeeName: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111827",
  },

  employeeDetail: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 5,
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 22,
  },

  nextLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
  },

  statusBox: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },

  entryBox: {
    backgroundColor: "#DCFCE7",
  },

  exitBox: {
    backgroundColor: "#FEE2E2",
  },

  statusText: {
    fontSize: 18,
    fontWeight: "800",
  },

  entryText: {
    color: "#15803D",
  },

  exitText: {
    color: "#B91C1C",
  },

  cancelButton: {
    paddingVertical: 14,
  },

  cancelText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "600",
  },

  pressed: {
    opacity: 0.75,
  },

  footer: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 25,
  },
});
