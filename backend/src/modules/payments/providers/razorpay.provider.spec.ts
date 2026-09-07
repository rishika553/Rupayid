import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHmac } from 'crypto';
import { RazorpayProvider, toPaise } from './razorpay.provider';

describe('RazorpayProvider', () => {
  const secret = 'whsec_test';
  const provider = new RazorpayProvider({
    get: (key: string) => (key === 'RAZORPAY_WEBHOOK_SECRET' ? secret : undefined),
  } as never);

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
