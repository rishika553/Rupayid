import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import type {
  CreateProviderOrderInput,
  CreateProviderOrderResult,
  PaymentProvider,
  ProviderWebhookEvent,
} from './payment-provider';

const API_BASE = 'https://api.razorpay.com/v1';

@Injectable()
export class RazorpayProvider implements PaymentProvider {
  readonly name = 'razorpay';

  constructor(private readonly config: ConfigService) {}

  async createOrder(input: CreateProviderOrderInput): Promise<CreateProviderOrderResult> {
    const keyId = this.require('RAZORPAY_KEY_ID');
    const keySecret = this.require('RAZORPAY_KEY_SECRET');
    const amountMinor = toPaise(input.amount);

    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountMinor,
        currency: input.currency,
        receipt: input.reference.slice(0, 40),
        payment_capture: 1,
        notes: input.notes,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      error?: { description?: string };
    };
    if (!response.ok || !payload.id) {
      throw new ServiceUnavailableException(payload.error?.description || 'Payment provider could not create an order');
    }

    return {
      provider: this.name,
      orderId: payload.id,
      keyId,
      amountMinor: String(amountMinor),
      currency: input.currency,
    };
  }

  verifyWebhook(rawBody: Buffer | string, signature: string | undefined): ProviderWebhookEvent {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('Payment webhook is not configured');
    }
    if (!signature) {
      throw new BadRequestException('Missing payment signature');
    }
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
      throw new BadRequestException('Invalid payment signature');
    }

    const event = JSON.parse(body) as RazorpayWebhookPayload;
    const payment = event.payload?.payment?.entity;
    const order = event.payload?.order?.entity;
    const eventType = event.event || '';
    const status = eventType === 'payment.captured' || eventType === 'order.paid' ? 'SUCCESS'
      : eventType === 'payment.failed' ? 'FAILED'
      : 'IGNORED';

    return {
      eventId: String(event.event_id || event.id || payment?.id || ''),
      eventType,
      orderId: payment?.order_id || order?.id,
      providerPaymentId: payment?.id,
      status,
      amountMinor: payment?.amount != null ? String(payment.amount) : undefined,
      method: payment?.method,
      failureReason: payment?.error_description || undefined,
    };
  }

  private require(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new ServiceUnavailableException('Payment provider is not configured');
    }
    return value;
  }
}

export function toPaise(amount: Prisma.Decimal): number {
  const paise = new Prisma.Decimal(amount).mul(100);
  if (!paise.isInteger() || paise.lte(0)) {
    throw new BadRequestException('Payable amount is invalid');
  }
  return paise.toNumber();
}

type RazorpayWebhookPayload = {
  id?: string;
  event_id?: string;
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        method?: string;
        error_description?: string;
      };
    };
    order?: { entity?: { id?: string } };
  };
};
