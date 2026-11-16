process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:1';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'accessid-test-only';
global.fetch = () => { throw new Error('A suíte não permite acesso à rede'); };
