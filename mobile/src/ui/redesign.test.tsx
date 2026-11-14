import React from 'react';
import { Share } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Dashboard from '../../app/(app)/dashboard';
import Notifications from '../../app/(app)/notifications';
import { LoanCostSummary } from '../components/loan-cost-summary';
import { DocumentUploadCard } from './components';
import { BottomNavigation } from './premium';
import type { CustomerDashboard } from '../types';

const mockPush = jest.fn();
const mockRefetch = jest.fn();
const mockRead = jest.fn();
let mockDashboard: {
  data?: CustomerDashboard;
  isLoading?: boolean;
  error?: Error;
  refetch: typeof mockRefetch;
};
const mockNotifications = [
  {
    id: 'one',
    type: 'KYC_APPROVED',
    title: 'Identity verified',
    body: 'Your KYC is approved.',
    isRead: false,
    createdAt: '2026-11-10T10:00:00Z',
  },
  {
    id: 'two',
    type: 'PAYMENT_CAPTURED',
    title: 'Payment received',
    isRead: true,
    createdAt: '2026-11-09T10:00:00Z',
  },
];
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('react-native-safe-area-context', () => ({
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 24, bottom: 24, left: 0, right: 0 }),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../hooks/use-customer-data', () => ({
  useCustomerDashboard: () => mockDashboard,
  useMyNotifications: () => ({
    isRefetching: false,
    data: { data: mockNotifications, unreadCount: 1, total: 2 },
    refetch: mockRefetch,
  }),
  useMarkNotificationRead: () => ({ mutate: mockRead }),
  useMarkAllNotificationsRead: () => ({ mutate: jest.fn() }),
}));
const dashboard: CustomerDashboard = {
  customer: { firstName: 'Test', lastName: 'Customer', fullName: 'Test Customer' },
  kyc: {
    id: 'kyc',
    status: 'APPROVED',
    actionRequired: false,
    actionLabel: null,
    actionHref: '/kyc',
  },
  loan: { currentApplication: null, activeLoan: null },
  repayment: { nextInstallment: null },
  payments: { recent: [] },
  referral: { code: 'RAP-TEST1234', referredCount: 3, convertedCount: 1, referredBy: null },
  notifications: { unreadCount: 2 },
};
beforeEach(() => {
  jest.clearAllMocks();
  mockDashboard = { data: dashboard, refetch: mockRefetch };
});
test('home renders real KYC/referral data and sends actions to working routes', async () => {
  await render(<Dashboard />);
  expect(screen.getByText('Status: Approved')).toBeTruthy();
  expect(screen.getByText('3 referred · 1 converted')).toBeTruthy();
  await fireEvent.press(screen.getByText('Browse Products →'));
  expect(mockPush).toHaveBeenCalledWith('/(app)/loans');
  await fireEvent.press(screen.getByText('Pay EMI'));
  expect(mockPush).toHaveBeenCalledWith('/(app)/repayments');
  await fireEvent.press(screen.getByText('Start Now →'));
  expect(mockPush).toHaveBeenCalledWith('/(app)/loans/apply');
});
test('referral sharing uses the customer code', async () => {
  const share = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: Share.sharedAction, activityType: undefined });
  await render(<Dashboard />);
  await fireEvent.press(screen.getByText('Share Now →'));
  expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('RAP-TEST1234') });
  share.mockRestore();
});
test('dashboard outage shows retry instead of fabricated application status', async () => {
  mockDashboard = { error: new Error('Offline'), refetch: mockRefetch };
  await render(<Dashboard />);
  expect(screen.queryByText('Not Started')).toBeNull();
  await fireEvent.press(screen.getByText('Try again'));
  expect(mockRefetch).toHaveBeenCalled();
});
test('notification categories filter loaded rows and unread taps use existing mutation', async () => {
  await render(<Notifications />);
  await fireEvent.press(screen.getByLabelText('Unread: Identity verified'));
  expect(mockRead).toHaveBeenCalledWith('one');
  await fireEvent.press(screen.getByRole('radio', { name: 'Payments' }));
  expect(screen.queryByText('Identity verified')).toBeNull();
  expect(screen.getByText('Payment received')).toBeTruthy();
});
test('upload control exposes progress and prevents a duplicate upload', async () => {
  const upload = jest.fn();
  await render(
    <DocumentUploadCard
      title="Aadhaar Card"
      uploaded={false}
      uploading
      progress={45}
      disabled
      editable
      onUpload={upload}
    />,
  );
  expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(45);
  await fireEvent.press(screen.getByRole('button'));
  expect(upload).not.toHaveBeenCalled();
});
test('loan summary omits interest even when the API supplies a rate', async () => {
  await render(
    <LoanCostSummary
      product={{
        id: 'p',
        name: 'Personal',
        minAmount: 1000,
        maxAmount: 10000,
        minTenureMonths: 1,
        maxTenureMonths: 12,
        interest: { annualRate: 99 },
      }}
      amount={2000}
      tenureMonths={6}
    />,
  );
  expect(screen.queryByText(/Interest/i)).toBeNull();
  expect(screen.queryByText('99%')).toBeNull();
  expect(screen.getByText('6 months')).toBeTruthy();
});
test('bottom navigation emits the tab event and uses the route key; hidden screens stay hidden', async () => {
  const emit = jest.fn(() => ({ defaultPrevented: false }));
  const navigate = jest.fn();
  const props = {
    state: {
      index: 0,
      routes: [
        { key: 'home-key', name: 'dashboard' },
        { key: 'loans-key', name: 'loans' },
        { key: 'profile-key', name: 'profile' },
      ],
    },
    emitter: { emit },
    navigateToTab: navigate,
    insets: { bottom: 24 },
    descriptors: {},
  } as unknown as React.ComponentProps<typeof BottomNavigation>;
  await render(<BottomNavigation {...props} />);
  expect(screen.queryByRole('tab', { name: 'Profile' })).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: 'Loans' }));
  expect(emit).toHaveBeenCalledWith({
    type: 'tabPress',
    target: 'loans-key',
    canPreventDefault: true,
  });
  expect(navigate).toHaveBeenCalledWith('loans-key');
});
