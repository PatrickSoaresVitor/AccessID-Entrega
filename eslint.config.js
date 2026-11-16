const expo = require('eslint-config-expo/flat');
module.exports = [
  ...expo,
  { files: ['tests/**/*.test.js'], languageOptions: { globals: {
    jest: 'readonly', expect: 'readonly', test: 'readonly',
    beforeEach: 'readonly', afterEach: 'readonly', afterAll: 'readonly',
  } } },
  { ignores: ['dist/**', 'coverage/**'] },
];
