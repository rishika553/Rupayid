import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './api-client';
import { clearAuth, readAuth, writeAuth } from './auth-storage';

vi.mock('./auth-storage', () => ({ clearAuth: vi.fn(), readAuth: vi.fn(), writeAuth: vi.fn() }));
const tokens = { accessToken: 'old-access', refreshToken: 'old-refresh' };
const response = (status: number, body: unknown = {}) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
let client: ApiClient;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readAuth).mockReturnValue(tokens);
  client = new ApiClient('http://test.invalid');
  client.setTokens(tokens);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('refresh failure classification', () => {
  it.each([500, 503, 429])('preserves tokens when refresh returns %s', async (status) => {
    fetchMock.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(status));
    expect(await client.get('/auth/me')).toMatchObject({ success: false, status: 503 });
    expect(clearAuth).not.toHaveBeenCalled();
  });
  it('preserves tokens on refresh network failure', async () => {
    fetchMock.mockResolvedValueOnce(response(401)).mockRejectedValueOnce(new TypeError('offline'));
    expect(await client.get('/auth/me')).toMatchObject({ status: 503 });
    expect(clearAuth).not.toHaveBeenCalled();
  });
  it.each([401, 403])('clears an invalid or expired refresh token (%s)', async (status) => {
    fetchMock.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(status));
    expect(await client.get('/auth/me')).toMatchObject({ success: false, status: 401 });
    expect(clearAuth).toHaveBeenCalledTimes(1);
  });
  it('refreshes an expired access token once and retries with its replacement', async () => {
    const next = { accessToken: 'new-access', refreshToken: 'new-refresh' };
    fetchMock.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200, { data: next })).mockResolvedValueOnce(response(200, { data: { id: 'user' } }));
    expect(await client.get('/auth/me')).toMatchObject({ success: true, data: { id: 'user' } });
    expect(writeAuth).toHaveBeenCalledWith(next);
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer new-access');
  });
  it('does not resurrect tokens after logout while refresh is in flight', async () => {
    let resolve!: (value: unknown) => void;
    fetchMock.mockResolvedValueOnce(response(401)).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const result = client.get('/auth/me');
    await vi.waitFor(() => expect(resolve).toBeDefined());
    client.setTokens(null);
    resolve(response(200, { data: { accessToken: 'late', refreshToken: 'late' } }));
    await result;
    expect(writeAuth).not.toHaveBeenCalled();
  });
  it('treats a malformed successful refresh response as unavailable', async () => {
    fetchMock.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200, {}));
    expect(await client.get('/auth/me')).toMatchObject({ status: 503 });
    expect(clearAuth).not.toHaveBeenCalled();
  });
});

 describe('request deadlines', () => {
  it.each(['connection', 'body'])('preserves the session on stalled %s', async (stage) => {
    vi.useFakeTimers();
    try {
      const stalled = new Promise(() => {});
      fetchMock.mockImplementation(() => stage === 'connection' ? stalled : Promise.resolve({ status: 200, ok: true, json: () => stalled }));
      const pending = client.get('/auth/me');
      await vi.advanceTimersByTimeAsync(15001);
      expect(await pending).toMatchObject({ success: false, status: 0 });
      expect(clearAuth).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });
});
