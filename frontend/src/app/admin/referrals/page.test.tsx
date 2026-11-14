import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import AdminReferralsPage from './page';

const mocks = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn() }));
vi.mock('@/lib/admin-api-client', () => ({ adminApiClient: { referralList: mocks.list, updateReferralStatus: mocks.update }, requireAdminApi: (promise: unknown) => promise }));
const row = { id: 'referral', referredName: 'Test Friend', referredPhone: '+919876543210', code: 'RAP-ABCDEFGH', status: 'PENDING',
  createdAt: '2026-11-10T00:00:00Z', consentAttestedAt: '2026-11-10T00:00:00Z', consentVersion: 'referral-contact-v1',
  referrer: { id: 'owner', firstName: 'Test', lastName: 'Owner', email: 'owner@example.test' } };
function mount() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><AdminReferralsPage /></QueryClientProvider>);
}
beforeEach(() => {
  mocks.list.mockReset().mockResolvedValue({ data: [row], total: 1, totalPages: 1 });
  mocks.update.mockReset().mockResolvedValue({ id: 'referral', status: 'CONTACTED' });
});
afterEach(cleanup);
test('shows contact, referrer, consent and submission date; searches and filters', async () => {
  mount();
  expect(await screen.findByText('Test Friend')).toBeInTheDocument();
  expect(screen.getByText('Test Owner')).toBeInTheDocument();
  expect(screen.getByText('referral-contact-v1')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search referrals'), { target: { value: '98765' } });
  fireEvent.click(screen.getByText('Search'));
  await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ page: 1, status: '', search: '98765' }));
  fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'CONTACTED' } });
  await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ page: 1, status: 'CONTACTED', search: '98765' }));
});
test('updates only selected row and refreshes results', async () => {
  mount(); await screen.findByText('Test Friend');
  fireEvent.change(screen.getByLabelText('Status for Test Friend'), { target: { value: 'CONTACTED' } });
  fireEvent.click(screen.getByText('Save'));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('referral', 'CONTACTED'));
  await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
});
test('shows save error without hiding referral', async () => {
  mocks.update.mockRejectedValue(new Error('Unable to update referral'));
  mount(); await screen.findByText('Test Friend');
  fireEvent.change(screen.getByLabelText('Status for Test Friend'), { target: { value: 'REJECTED' } });
  fireEvent.click(screen.getByText('Save'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to update referral');
});
