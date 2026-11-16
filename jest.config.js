module.exports = {
  preset: 'jest-expo/android',
  transform: {
    '\\.[jt]sx?$': ['babel-jest', {
      presets: [require.resolve('expo/internal/babel-preset')],
      caller: { name: 'metro', bundler: 'jest', platform: 'android' },
    }],
  },
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/environment.js'],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/tests/sqlite.js',
    '^expo-crypto$': '<rootDir>/tests/crypto.js',
  },
  restoreMocks: true,
};
