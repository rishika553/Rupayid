import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './auth-provider';
import { apiClient } from '@/lib/api-client';
import { clearAuth } from '@/lib/auth-storage';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn(), setTokens: vi.fn() } }));
vi.mock('@/lib/auth-storage', () => ({ readAuth: () => ({ accessToken: 'access', refreshToken: 'refresh' }), clearAuth: vi.fn(), writeAuth: vi.fn() }));
vi.mock('@/components/ui/toaster', () => ({ useToast: () => ({ toast: vi.fn() }) }));
function Probe() {
  const auth = useAuth();
  return <><span>{auth.isReady ? 'ready' : 'loading'}</span><span>{auth.sessionUnavailable ? 'offline' : 'available'}</span><span>{auth.isAuthenticated ? 'signed in' : 'unknown'}</span><button onClick={() => void auth.refreshUser()}>Refresh</button></>;
}
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it('retains saved credentials when session restoration is temporarily unavailable', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ success: false, status: 503 });
  render(<AuthProvider><Probe /></AuthProvider>);
  await screen.findByText('ready');
  expect(screen.getByText('offline')).toBeVisible();
  expect(clearAuth).not.toHaveBeenCalled();
});
it('keeps the current user when a subsequent refresh fails', async () => {
  vi.mocked(apiClient.get).mockResolvedValueOnce({ success: true, data: { id: 'user' } }).mockResolvedValueOnce({ success: false, status: 0 });
  render(<AuthProvider><Probe /></AuthProvider>);
  await screen.findByText('signed in');
  fireEvent.click(screen.getByText('Refresh'));
  await screen.findByText('offline');
  expect(screen.getByText('signed in')).toBeVisible();
  expect(clearAuth).not.toHaveBeenCalled();
});
it('clears credentials on a definitive unauthorized session response', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ success: false, status: 401 });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(clearAuth).toHaveBeenCalledTimes(1));
  expect(screen.getByText('unknown')).toBeVisible();
});
