import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { buscarFuncionarioPorMatricula, type Funcionario } from '../database/database';
import { matriculaDoCracha } from '../services/cracha';

export function LeitorCracha({ onIdentificado }: { onIdentificado: (pessoa: Funcionario) => void }) {
  const [permissao, solicitar] = useCameraPermissions();
  const [erro, setErro] = useState('');
  const bloqueado = useRef(false);

  function ler({ data }: { data: string }) {
    if (bloqueado.current) return;
    bloqueado.current = true;
    const matricula = matriculaDoCracha(data);
    if (!matricula) {
      setErro('QR inválido. Use um crachá AccessID.');
      return;
    }
    const pessoa = buscarFuncionarioPorMatricula(matricula);
    if (pessoa?.ativo !== 1) {
      setErro('Funcionário inativo ou não encontrado neste aparelho.');
      return;
    }
    onIdentificado(pessoa);
  }

  return (
    <View style={styles.card}>
      {erro ? (
        <>
          <Text accessibilityLiveRegion="polite">{erro}</Text>
          <Pressable onPress={() => { bloqueado.current = false; setErro(''); }}>
            <Text style={styles.action}>Tentar novamente</Text>
          </Pressable>
        </>
      ) : permissao?.granted ? (
        <>
          <Text>Aponte a câmera para o QR do crachá.</Text>
          <CameraView style={styles.camera} facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={ler}
            onMountError={() => setErro('Não foi possível iniciar a câmera.')} />
        </>
      ) : (
        <>
          <Text>{!permissao ? 'Verificando permissão da câmera…' : permissao.canAskAgain
            ? 'Permita o uso da câmera para ler o crachá.'
            : 'Para usar a câmera, habilite a permissão nos ajustes do aparelho.'}</Text>
          {permissao?.canAskAgain && (
            <Pressable onPress={() => solicitar().catch(() => setErro('Falha ao solicitar a câmera.'))}>
              <Text style={styles.action}>Permitir câmera</Text>
            </Pressable>
          )}
        </>
      )}
      <Pressable onPress={() => router.replace('/registrar')}>
        <Text style={styles.action}>Usar matrícula e PIN</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 20, gap: 12 },
  camera: { height: 220, width: '100%' },
  action: { color: '#164789', fontWeight: '600', paddingVertical: 12 },
});
