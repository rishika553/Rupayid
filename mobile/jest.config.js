/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    // tsconfig.json points `react` at `@types/react` (for TS types). jest-expo's
    // resolver picks that up for runtime too, which breaks jsx-runtime. Re-point
    // here. First match wins.
    '^react$': '<rootDir>/node_modules/react',
    '^react/jsx-runtime$': '<rootDir>/node_modules/react/jsx-runtime',
    '^react/jsx-dev-runtime$': '<rootDir>/node_modules/react/jsx-dev-runtime',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@rupayaid/types$': '<rootDir>/../packages/types/index.ts',
  },
  testMatch: ['<rootDir>/src/**/*.{test,spec}.{ts,tsx}'],
  // pnpm's virtual store (`.pnpm/`) adds a layer, so the usual pattern misses
  // packages like `@react-native+jest-preset@…`. Easiest correct fix: transform
  // everything under `.pnpm/`, and keep the normal allow-list for non-pnpm layouts.
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|(jest-)?react-native|@react-native|expo|@expo|expo-modules-core|@react-navigation|react-native-worklets|react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|@react-native-google-signin|@react-native-async-storage|@react-native-community|@sentry))',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__mocks__/**',
  ],
};
