import { Share } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ReferralScreen from '../../app/(app)/referral';

const mockSubmit = jest.fn();
jest.mock('react-native-safe-area-context', () => ({
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../hooks/use-customer-data', () => ({ useMyReferral: () => ({ data: { code: 'RAP-ABCDEFGH', referred: [] } }) }));
jest.mock('../hooks/use-referrals', () => ({
  useSubmitReferral: () => ({ mutateAsync: mockSubmit, isPending: false }),
  useReferralStatistics: () => ({ data: { total: 1, pending: 1, converted: 0 } }),
  useReferralHistory: () => ({ data: { data: [{ id: 'one', referredName: 'Existing Friend', referredPhone: '+919876543210', status: 'PENDING', createdAt: '2026-11-10T00:00:00Z' }], totalPages: 1 } }),
}));

beforeEach(() => { mockSubmit.mockReset(); });
async function fill() {
  await fireEvent.changeText(screen.getByLabelText('Full name'), 'New Friend');
  await fireEvent.changeText(screen.getByLabelText('Mobile number'), '9876543211');
}
test('shows referral code, statistics and real history', async () => {
  await render(<ReferralScreen />);
  expect(screen.getByText('RAP-ABCDEFGH')).toBeTruthy();
  expect(screen.getByText('Existing Friend')).toBeTruthy();
  expect(screen.getByText('Pending')).toBeTruthy();
});
test('requires valid contact details and consent before submission', async () => {
  await render(<ReferralScreen />);
  await fireEvent.press(screen.getByText('Submit referral'));
  expect(mockSubmit).not.toHaveBeenCalled();
  await fill();
  await fireEvent.changeText(screen.getByLabelText('Mobile number'), '123');
  await fireEvent.press(screen.getByText('Submit referral'));
  expect(screen.getByText('Enter a valid 10-digit Indian mobile number.')).toBeTruthy();
  await fill();
  await fireEvent.press(screen.getByText('Submit referral'));
  expect(screen.getByText('Please obtain their permission and confirm consent before submitting.')).toBeTruthy();
  expect(mockSubmit).not.toHaveBeenCalled();
});
test('submits only contact fields and consent, clears on success', async () => {
  mockSubmit.mockResolvedValue({ id: 'new' });
  await render(<ReferralScreen />); await fill();
  await fireEvent.press(screen.getByLabelText('Confirm contact consent'));
  await fireEvent.press(screen.getByText('Submit referral'));
  expect(mockSubmit).toHaveBeenCalledWith({ referredName: 'New Friend', referredPhone: '9876543211', consentConfirmed: true });
  expect(screen.getByLabelText('Full name').props.value).toBe('');
  expect(screen.getByLabelText('Mobile number').props.value).toBe('');
  expect(screen.getByLabelText('Confirm contact consent').props.accessibilityState.checked).toBe(false);
  expect(screen.getByText('Referral submitted successfully. You can track it below.')).toBeTruthy();
});
test('preserves form and shows duplicate failure', async () => {
  mockSubmit.mockRejectedValue(new Error('A referral for this mobile number has already been submitted.'));
  await render(<ReferralScreen />); await fill();
  await fireEvent.press(screen.getByLabelText('Confirm contact consent'));
  await fireEvent.press(screen.getByText('Submit referral'));
  expect(screen.getByText('A referral for this mobile number has already been submitted.')).toBeTruthy();
  expect(screen.getByLabelText('Full name').props.value).toBe('New Friend');
});
test('opens native sharing with the existing referral code', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
  await render(<ReferralScreen />);
  await fireEvent.press(screen.getByText('Share referral code'));
  expect(share).toHaveBeenCalledWith({ message: 'Join RupayAid with my referral code RAP-ABCDEFGH' });
  share.mockRestore();
});
