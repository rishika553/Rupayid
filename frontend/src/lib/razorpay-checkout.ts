type CheckoutOptions = {
  keyId: string;
  orderId: string;
  amountMinor: string;
  currency: string;
  description?: string;
  name?: string;
  email?: string;
  contact?: string;
};

export type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type CheckoutResult =
  | { status: 'success'; response: RazorpaySuccess }
  | { status: 'dismissed' }
  | { status: 'failed'; reason: string };

type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void;
};

type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

export async function openRazorpayCheckout(options: CheckoutOptions): Promise<CheckoutResult> {
  await loadScript();
  if (!window.Razorpay) {
    throw new Error('Payment checkout is unavailable');
  }
  const Razorpay = window.Razorpay;
  return new Promise((resolve) => {
    let lastFailure: string | null = null;
    let settled = false;
    const finish = (result: CheckoutResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const checkout = new Razorpay({
      key: options.keyId,
      order_id: options.orderId,
      amount: options.amountMinor,
      currency: options.currency,
      name: 'RupayAid',
      description: options.description,
      prefill: {
        name: options.name,
        email: options.email,
        contact: options.contact,
      },
      theme: { color: '#24406b' },
      handler: (response: RazorpaySuccess) => finish({ status: 'success', response }),
      modal: {
        ondismiss: () => finish(lastFailure ? { status: 'failed', reason: lastFailure } : { status: 'dismissed' }),
      },
    });
    // Razorpay keeps the modal open after a failed attempt so the customer can retry.
    checkout.on('payment.failed', (response) => {
      lastFailure = response.error?.description || 'The payment could not be completed';
    });
    checkout.open();
  });
}

function loadScript(): Promise<void> {
  if (window.Razorpay) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay="checkout"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Unable to load payment checkout')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpay = 'checkout';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load payment checkout'));
    document.body.appendChild(script);
  });
}
