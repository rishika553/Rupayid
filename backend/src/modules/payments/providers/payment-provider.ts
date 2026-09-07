import { Prisma } from '@prisma/client';

export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';

export type CreateProviderOrderInput = {
  amount: Prisma.Decimal;
  currency: string;
  reference: string;
  notes: Record<string, string>;
};

export type CreateProviderOrderResult = {
  provider: string;
  orderId: string;
  keyId: string;
  amountMinor: string;
  currency: string;
};

export type ProviderWebhookEvent = {
  eventId: string;
  eventType: string;
  orderId?: string;
  providerPaymentId?: string;
  status: 'SUCCESS' | 'FAILED' | 'IGNORED';
  amountMinor?: string;
  method?: string;
  failureReason?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createOrder(input: CreateProviderOrderInput): Promise<CreateProviderOrderResult>;
  verifyWebhook(rawBody: Buffer | string, signature: string | undefined): ProviderWebhookEvent;
}
