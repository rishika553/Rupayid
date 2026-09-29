import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHmac } from 'crypto';
import { RazorpayProvider, toPaise } from './razorpay.provider';

describe('RazorpayProvider', () => {
  const secret = 'whsec_test';
  const keySecret = 'key_secret_test';
  const env: Record<string, string> = {
    RAZORPAY_WEBHOOK_SECRET: secret,
    RAZORPAY_KEY_ID: 'rzp_test_abc',
    RAZORPAY_KEY_SECRET: keySecret,
  };
  const provider = new RazorpayProvider({ get: (key: string) => env[key] } as never);

  it('accepts a checkout signature made with the key secret', () => {
    const signature = createHmac('sha256', keySecret).update('order_1|pay_1').digest('hex');
    expect(() =>
      provider.verifyCheckoutSignature({ orderId: 'order_1', providerPaymentId: 'pay_1', signature }),
    ).not.toThrow();
  });

  it('rejects a checkout signature for a different payment', () => {
    const signature = createHmac('sha256', keySecret).update('order_1|pay_1').digest('hex');
    expect(() =>
      provider.verifyCheckoutSignature({ orderId: 'order_1', providerPaymentId: 'pay_2', signature }),
    ).toThrow(BadRequestException);
  });

  it('reports test mode from the key id', () => {
    expect(provider.isTestMode()).toBe(true);
  });

  it('converts rupees to paise with Decimal', () => {
    expect(toPaise(new Prisma.Decimal('9000.10'))).toBe(900010);
  });

  it('rejects an invalid webhook signature', () => {
    expect(() => provider.verifyWebhook('{"event":"payment.captured"}', 'nope')).toThrow(BadRequestException);
  });

  it('accepts a valid signature and maps capture to SUCCESS', () => {
    const body = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_1',
      payload: {
        payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 900000 } },
      },
    });
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    const event = provider.verifyWebhook(body, signature);
    expect(event.status).toBe('SUCCESS');
    expect(event.orderId).toBe('order_1');
    expect(event.eventId).toBe('evt_1');
  });
});
