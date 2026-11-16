// QA installs alongside the regular app with separate Android storage.
module.exports = ({ config }) => {
  if (process.env.ACCESSID_E2E !== '1') return config;
  if (process.env.EXPO_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:1' ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY !== 'accessid-test-only') {
    throw new Error('O APK E2E exige o endpoint local e a chave fictícia do perfil e2e.');
  }
  return {
    ...config,
    name: 'AccessID QA',
    android: { ...config.android, package: 'com.pablovitor.accessid.qa' },
  };
};
