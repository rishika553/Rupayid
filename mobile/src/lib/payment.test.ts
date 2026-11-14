import * as WebBrowser from 'expo-web-browser';
import { openPaymentCheckout } from './payment';

const payment = {
  id: 'pay-1',
  checkout: { keyId: 'rzp_test', orderId: 'order_1', amountMinor: '100000', currency: 'INR' },
} as unknown as Parameters<typeof openPaymentCheckout>[0]['payment'];

describe('openPaymentCheckout', () => {
  afterEach(() => jest.clearAllMocks());

  it('parses a successful Razorpay return url', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      url: 'rupayaid://payment-return?status=success&razorpay_order_id=order_1&razorpay_payment_id=pay_x&razorpay_signature=sig',
    });
    const res = await openPaymentCheckout({ payment });
    expect(res).toEqual({
      status: 'success',
      razorpayOrderId: 'order_1',
      razorpayPaymentId: 'pay_x',
      razorpaySignature: 'sig',
    });
  });

  it('returns failed with reason for a failure return', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      url: 'rupayaid://payment-return?status=failed&reason=user_abandoned',
    });
    const res = await openPaymentCheckout({ payment });
    expect(res).toEqual({ status: 'failed', reason: 'user_abandoned' });
  });

  it('returns failed when the signature is missing from a success return', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({
      type: 'success',
      url: 'rupayaid://payment-return?status=success&razorpay_order_id=order_1',
    });
    const res = await openPaymentCheckout({ payment });
    expect(res.status).toBe('failed');
  });

  it('returns cancelled when the browser session is dismissed', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValueOnce({ type: 'dismiss' });
    const res = await openPaymentCheckout({ payment });
    expect(res).toEqual({ status: 'cancelled' });
  });

  it('throws when checkout details are missing', async () => {
    await expect(openPaymentCheckout({
      payment: { id: 'x' } as unknown as Parameters<typeof openPaymentCheckout>[0]['payment'],
    })).rejects.toThrow(/Checkout details/);
  });
});
