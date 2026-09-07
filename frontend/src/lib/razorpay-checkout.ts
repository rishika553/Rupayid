type CheckoutOptions = {
  keyId: string;
  orderId: string;
  amountMinor: string;
  currency: string;
  name?: string;
  email?: string;
  contact?: string;
};

type RazorpayCtor = new (options: Record<string, unknown>) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

export async function openRazorpayCheckout(options: CheckoutOptions): Promise<void> {
  await loadScript();
  if (!window.Razorpay) {
    throw new Error('Payment checkout is unavailable');
  }
  const Razorpay = window.Razorpay;
  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: options.keyId,
      order_id: options.orderId,
      amount: options.amountMinor,
      currency: options.currency,
      name: 'RupayAid',
      prefill: {
        name: options.name,
        email: options.email,
        contact: options.contact,
      },
      handler: () => resolve(),
      modal: {
        ondismiss: () => resolve(),
      },
    });
    checkout.open();
    window.setTimeout(() => reject(new Error('Payment window timed out')), 15 * 60 * 1000);
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
