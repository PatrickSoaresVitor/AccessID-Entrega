const { spawnSync } = require('node:child_process');
const { mkdtempSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

// Each run has its own output, so a stale bundle cannot pass this check.
const output = mkdtempSync(path.join(tmpdir(), 'accessid-bundle-'));
const result = spawnSync(process.execPath, [
  require.resolve('expo/bin/cli'), 'export', '--platform', 'android', '--output-dir', output,
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CI: '1',
    EXPO_NO_DOTENV: '1',
    EXPO_NO_TELEMETRY: '1',
    EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:1',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'accessid-test-only',
  },
});
if (result.error) console.error(result.error);
process.exitCode = result.status ?? 1;
