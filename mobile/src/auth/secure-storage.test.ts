import * as SecureStore from 'expo-secure-store';
import { readAuth, writeAuth, clearAuth } from './secure-storage';

const store = SecureStore as unknown as {
  __setStore: (next: Record<string, string> | null) => void;
  __dump: () => Record<string, string>;
};

beforeEach(() => {
  store.__setStore(null);
  jest.clearAllMocks();
});

describe('readAuth', () => {
  it('returns null when nothing is stored', async () => {
    expect(await readAuth()).toBeNull();
  });

  it('returns null when only one token is stored', async () => {
    await SecureStore.setItemAsync('rupayaid.accessToken', 'A');
    expect(await readAuth()).toBeNull();
  });

  it('returns the pair when both tokens are stored', async () => {
    await SecureStore.setItemAsync('rupayaid.accessToken', 'A');
    await SecureStore.setItemAsync('rupayaid.refreshToken', 'R');
    expect(await readAuth()).toEqual({ accessToken: 'A', refreshToken: 'R' });
  });

  it('returns null if SecureStore throws', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    expect(await readAuth()).toBeNull();
  });
});

describe('writeAuth', () => {
  it('persists both tokens', async () => {
    await writeAuth({ accessToken: 'AT', refreshToken: 'RT' });
    expect(store.__dump()).toEqual({
      'rupayaid.accessToken': 'AT',
      'rupayaid.refreshToken': 'RT',
    });
  });

  it('clears both tokens if persistence partially fails', async () => {
    (SecureStore.setItemAsync as jest.Mock)
      .mockImplementationOnce(async (key: string, value: string) => {
        (SecureStore as unknown as { __setStore: (n: Record<string, string>) => void })
          .__setStore({ [key]: value });
      })
      .mockRejectedValueOnce(new Error('disk full'));
    await expect(writeAuth({ accessToken: 'AT', refreshToken: 'RT' })).rejects.toThrow('disk full');
    expect(store.__dump()).toEqual({});
  });
});

describe('clearAuth', () => {
  it('removes both tokens', async () => {
    await writeAuth({ accessToken: 'AT', refreshToken: 'RT' });
    await clearAuth();
    expect(store.__dump()).toEqual({});
  });
});
