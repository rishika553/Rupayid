/* eslint-disable @typescript-eslint/no-var-requires */
// React Native's __DEV__ global is normally injected by Metro; set it here for Jest.
global.__DEV__ = false;

// Expo SecureStore — in-memory implementation for tests.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    __setStore: (next) => {
      store.clear();
      if (next) for (const [k, v] of Object.entries(next)) store.set(k, v);
    },
    __dump: () => Object.fromEntries(store),
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});

// Expo Router — exposes the handful of hooks our screens import.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: ({ children }) => children,
  Redirect: () => null,
  Stack: { Screen: () => null },
}));

// Native-only modules we don't need in unit tests.
jest.mock('expo-linking', () => ({
  createURL: (path) => `rupayaid://${path}`,
  parse: (url) => {
    const parts = String(url).split('?');
    const queryParams = {};
    if (parts[1]) {
      for (const [k, v] of new URLSearchParams(parts[1])) queryParams[k] = v;
    }
    return { path: parts[0], queryParams };
  },
  openURL: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  dismissAuthSession: jest.fn(),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
}));

jest.mock('expo-file-system', () => ({
  uploadAsync: jest.fn(),
  FileSystemUploadType: { BINARY_CONTENT: 'binary' },
}));

// AsyncStorage fallback for TanStack Query persistence hooks if they ever run.
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async () => null),
  getItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
  clear: jest.fn(async () => null),
}));
