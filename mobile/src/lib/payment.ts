import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { PaymentRecord } from '@/types';

const DEV_DEFAULT_WEB_URL = 'http://10.0.2.2:3000';
const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || DEV_DEFAULT_WEB_URL;

const RETURN_SCHEME = Linking.createURL('payment-return');

export type CheckoutResult =
  | { status: 'success'; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }
  | { status: 'dismissed' }
  | { status: 'failed'; reason: string }
  | { status: 'cancelled' };

export interface OpenCheckoutInput {
  payment: PaymentRecord;
  prefill?: { name?: string; email?: string; contact?: string };
  description?: string;
}

export async function openPaymentCheckout({ payment, prefill, description }: OpenCheckoutInput): Promise<CheckoutResult> {
  if (!payment.checkout) {
    throw new Error('Checkout details are not available for this payment.');
  }
  const { keyId, orderId, amountMinor, currency } = payment.checkout;

  const query = new URLSearchParams({
    keyId,
    orderId,
    amount: amountMinor,
    currency,
    paymentId: payment.id,
    return: RETURN_SCHEME,
    name: prefill?.name || '',
    email: prefill?.email || '',
    contact: prefill?.contact || '',
    desc: description || 'Loan repayment',
  });

  const url = `${WEB_BASE_URL}/mobile-pay.html?${query.toString()}`;

  const result = await WebBrowser.openAuthSessionAsync(url, RETURN_SCHEME, {
    showInRecents: false,
    preferEphemeralSession: true,
  });

  if (result.type !== 'success' || !result.url) {
    return { status: 'cancelled' };
  }

  const returned = Linking.parse(result.url);
  const params = (returned.queryParams || {}) as Record<string, string | undefined>;

  if (params.status === 'success') {
    const razorpayOrderId = String(params.razorpay_order_id || '');
    const razorpayPaymentId = String(params.razorpay_payment_id || '');
    const razorpaySignature = String(params.razorpay_signature || '');
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return { status: 'failed', reason: 'Missing signature from provider' };
    }
    return { status: 'success', razorpayOrderId, razorpayPaymentId, razorpaySignature };
  }

  if (params.status === 'failed') {
    return { status: 'failed', reason: String(params.reason || 'Payment failed') };
  }

  return { status: 'dismissed' };
}
