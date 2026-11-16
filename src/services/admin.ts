import * as Crypto from 'expo-crypto';

import {
  obterConfiguracao,
  salvarConfiguracao,
} from '../database/database';

const ADMIN_PIN_KEY = 'admin_pin_hash';

async function gerarHash(pin: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin
  );
}

export function adminConfigurado() {
  return obterConfiguracao(ADMIN_PIN_KEY) !== null;
}

export async function configurarPinAdmin(
  pin: string
) {
  const hash = await gerarHash(pin);

  salvarConfiguracao(
    ADMIN_PIN_KEY,
    hash
  );
}

export async function validarPinAdmin(
  pin: string
) {
  const hashSalvo =
    obterConfiguracao(ADMIN_PIN_KEY);

  if (!hashSalvo) {
    return false;
  }

  const hashDigitado =
    await gerarHash(pin);

  return hashDigitado === hashSalvo;
}