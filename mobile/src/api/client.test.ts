import { ApiClient } from './client';

type FetchArgs = [string, RequestInit];
type Responder = (args: FetchArgs) => { status: number; body: unknown };

function mockFetch(responder: Responder) {
  const calls: FetchArgs[] = [];
  const fetchMock = jest.fn(async (url: string, init: RequestInit) => {
    const args: FetchArgs = [url, init];
    calls.push(args);
    const { status, body } = responder(args);
    return {
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    } as unknown as Response;
  });
  (global as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock, calls };
}

describe('ApiClient — bearer token behaviour', () => {
  it('sends the bearer header on protected calls', async () => {
    const { calls } = mockFetch(() => ({ status: 200, body: { data: { ok: true } } }));
    const client = new ApiClient('http://x/api/v1');
    client.setTokens({ accessToken: 'AT', refreshToken: 'RT' });
    const res = await client.get('/customers/me');
    expect(res.success).toBe(true);
    expect((calls[0][1].headers as Record<string, string>).Authorization).toBe('Bearer AT');
  });

  it('omits the bearer on /auth/login', async () => {
    const { calls } = mockFetch(() => ({ status: 200, body: { data: {} } }));
    const client = new ApiClient('http://x/api/v1');
    client.setTokens({ accessToken: 'AT', refreshToken: 'RT' });
    await client.post('/auth/login', { email: 'a', password: 'b' });
    expect((calls[0][1].headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('surfaces the server error message on a non-2xx', async () => {
    mockFetch(() => ({ status: 400, body: { message: 'Invalid credentials' } }));
    const client = new ApiClient('http://x/api/v1');
    const res = await client.post('/auth/login', { email: 'a', password: 'b' });
    expect(res.success).toBe(false);
    expect(res.error).toBe('Invalid credentials');
    expect(res.status).toBe(400);
  });
});

describe('ApiClient — 401 → refresh → retry', () => {
  it('refreshes once and retries the original call with the new token', async () => {
    const persist = jest.fn(async () => undefined);
    const unauthorized = jest.fn();
    let call = 0;
    const { calls } = mockFetch(([url]) => {
      call += 1;
      if (url.endsWith('/customers/me') && call === 1) {
        return { status: 401, body: {} };
      }
      if (url.endsWith('/auth/refresh')) {
        return { status: 200, body: { data: { accessToken: 'AT2', refreshToken: 'RT2' } } };
      }
      return { status: 200, body: { data: { id: 'u1' } } };
    });
    const client = new ApiClient('http://x/api/v1', { persist, unauthorized });
    client.setTokens({ accessToken: 'AT', refreshToken: 'RT' });

    const res = await client.get('/customers/me');
    expect(res.success).toBe(true);
    expect(persist).toHaveBeenCalledWith({ accessToken: 'AT2', refreshToken: 'RT2' });
    expect(unauthorized).not.toHaveBeenCalled();
    const retried = calls[calls.length - 1];
    expect((retried[1].headers as Record<string, string>).Authorization).toBe('Bearer AT2');
  });

  it('calls unauthorized() when refresh returns 401 (invalid refresh token)', async () => {
    const persist = jest.fn(async () => undefined);
    const unauthorized = jest.fn();
    mockFetch(([url]) => {
      if (url.endsWith('/auth/refresh')) return { status: 401, body: {} };
      return { status: 401, body: {} };
    });
    const client = new ApiClient('http://x/api/v1', { persist, unauthorized });
    client.setTokens({ accessToken: 'AT', refreshToken: 'RT' });

    const res = await client.get('/customers/me');
    expect(res.success).toBe(false);
    expect(unauthorized).toHaveBeenCalledTimes(1);
    expect(persist).not.toHaveBeenCalled();
  });

  it('does not refresh when there is no refresh token', async () => {
    const persist = jest.fn(async () => undefined);
    const unauthorized = jest.fn();
    const { fetchMock } = mockFetch(() => ({ status: 401, body: {} }));
    const client = new ApiClient('http://x/api/v1', { persist, unauthorized });
    client.setTokens({ accessToken: 'AT', refreshToken: '' });

    await client.get('/customers/me');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });
});
