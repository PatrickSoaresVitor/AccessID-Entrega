import { Image } from 'react-native';

export function MarcaAccessID({ tamanho }: { tamanho: number }) {
  return (
    <Image
      source={require('../../assets/images/marca-ad.png')}
      accessible
      accessibilityLabel="AccessID"
      resizeMode="contain"
      style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 5 }}
    />
  );
}
