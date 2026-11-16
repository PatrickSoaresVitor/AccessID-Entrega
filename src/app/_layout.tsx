import NetInfo from '@react-native-community/netinfo';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { initDatabase } from '../database/database';
import { sincronizarTudo } from '../services/sync';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();

    sincronizarTudo();

    const unsubscribe = NetInfo.addEventListener(
      (state) => {
        if (
          state.isConnected &&
          state.isInternetReachable !== false
        ) {
          console.log(
            'Internet disponível.'
          );

          sincronizarTudo();
        } else {
          console.log(
            'AccessID operando offline.'
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" />

      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </>
  );
}