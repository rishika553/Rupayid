import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'rupayaid.accessToken';
const REFRESH_TOKEN_KEY = 'rupayaid.refreshToken';

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
}

export async function readAuth(): Promise<StoredAuth | null> {
  try {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);
    if (!accessToken || !refreshToken) {
      return null;
    }
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

export async function writeAuth(tokens: StoredAuth): Promise<void> {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
  } catch (error) {
    await clearAuth();
    throw error;
  }
}

export async function clearAuth(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  } catch {
    // ignore
  }
}
