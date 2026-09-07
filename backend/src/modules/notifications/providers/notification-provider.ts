export type NotificationDeliveryInput = {
  to: string;
  subject: string;
  body: string;
  eventType: string;
  variables: Record<string, string>;
};

export type NotificationDeliveryResult = {
  providerMessageId: string;
};

export interface NotificationProvider {
  readonly name: string;
  send(input: NotificationDeliveryInput): Promise<NotificationDeliveryResult>;
}

export const SMS_NOTIFICATION_PROVIDER = 'SMS_NOTIFICATION_PROVIDER';
export const EMAIL_NOTIFICATION_PROVIDER = 'EMAIL_NOTIFICATION_PROVIDER';
