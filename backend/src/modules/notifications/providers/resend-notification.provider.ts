import { boundedFetch } from '../../../common/http/bounded-fetch';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  NotificationDeliveryInput,
  NotificationDeliveryResult,
  NotificationProvider,
} from './notification-provider';

@Injectable()
export class ResendNotificationProvider implements NotificationProvider {
  readonly name = 'resend';

  constructor(private readonly config: ConfigService) {}

  async send(input: NotificationDeliveryInput): Promise<NotificationDeliveryResult> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('RESEND_FROM_EMAIL');
    if (!apiKey || !from) {
      throw new ServiceUnavailableException('Resend is not configured');
    }
    const response = await boundedFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.body,
      }),
    });
    const body = (await response.json().catch((error) => { if (error instanceof SyntaxError) return {}; throw error; })) as {
      id?: string;
      message?: string;
    };
    if (!response.ok || !body.id) {
      throw new ServiceUnavailableException(body.message || 'Resend rejected notification');
    }
    return { providerMessageId: body.id };
  }
}
