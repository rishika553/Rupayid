import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_BASE_URL = 'https://sms.digimiles.in/bulksms/bulksms';
const DEFAULT_OTP_MESSAGE =
  'Your RupayAid OTP is {{otp}}. Do not share it with anyone. - RupayAid';

export type DigimilesCredentials = {
  username: string;
  password: string;
  baseUrl: string;
  senderId: string;
  entityId: string;
};

export function shouldUseDigimiles(config: ConfigService): boolean {
  if (config.get<string>('NODE_ENV') !== 'production') {
    return false;
  }
  return Boolean(readDigimilesCredentials(config));
}

export function readDigimilesCredentials(config: ConfigService): DigimilesCredentials | null {
  const username = config.get<string>('DIGIMILES_USERNAME')?.trim();
  const password = config.get<string>('DIGIMILES_PASSWORD')?.trim();
  const senderId = config.get<string>('DIGIMILES_SENDER_ID')?.trim();
  const entityId = config.get<string>('DIGIMILES_ENTITY_ID')?.trim();
  if (!username || !password || !senderId || !entityId) {
    return null;
  }
  return {
    username,
    password,
    senderId,
    entityId,
    baseUrl: config.get<string>('DIGIMILES_BASE_URL')?.trim() || DEFAULT_BASE_URL,
  };
}

export function digimilesTemplateId(config: ConfigService, eventType: string): string | undefined {
  if (eventType === 'OTP') {
    return config.get<string>('DIGIMILES_TEMPLATE_OTP')?.trim();
  }
  return (
    config.get<string>(`DIGIMILES_TEMPLATE_${eventType}`)?.trim() ||
    config.get<string>('DIGIMILES_TEMPLATE_DEFAULT')?.trim()
  );
}

export function digimilesOtpMessage(config: ConfigService, otp: string): string {
  const template = config.get<string>('DIGIMILES_OTP_MESSAGE')?.trim() || DEFAULT_OTP_MESSAGE;
  return template.replace(/\{\{\s*otp\s*\}\}/gi, otp);
}

export function toDigimilesDestination(phone: string): string {
  return phone.replace(/^\+/, '').replace(/\s+/g, '');
}

export function gsmSafeMessage(message: string): string {
  return message.replace(/₹/g, 'Rs');
}

export async function sendDigimilesSms(options: {
  credentials: DigimilesCredentials;
  to: string;
  message: string;
  templateId: string;
  fetchImpl?: typeof fetch;
}): Promise<{ providerMessageId: string }> {
  const destination = toDigimilesDestination(options.to);
  const message = gsmSafeMessage(options.message);
  if (!options.templateId) {
    throw new ServiceUnavailableException('Digimiles template is not configured');
  }

  const params = new URLSearchParams({
    username: options.credentials.username,
    password: options.credentials.password,
    type: '0',
    dlr: '1',
    destination,
    source: options.credentials.senderId,
    message,
    entityid: options.credentials.entityId,
    tempid: options.templateId,
  });

  const fetchImpl = options.fetchImpl || fetch;
  let response: Response;
  try {
    response = await fetchImpl(options.credentials.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
  } catch {
    throw new ServiceUnavailableException('SMS provider is unavailable');
  }

  const body = (await response.text().catch(() => '')).trim();
  const [code, , messageId] = body.split('|');
  if (!response.ok || code !== '1701') {
    throw new ServiceUnavailableException(digimilesError(code || String(response.status)));
  }

  return { providerMessageId: messageId || `digimiles-${Date.now()}` };
}

function digimilesError(code: string): string {
  const errors: Record<string, string> = {
    '1702': 'Digimiles rejected the request: missing parameter',
    '1703': 'Digimiles rejected the request: invalid credentials',
    '1705': 'Digimiles rejected the request: invalid message',
    '1706': 'Digimiles rejected the request: invalid destination',
    '1707': 'Digimiles rejected the request: invalid sender id',
    '1025': 'Digimiles rejected the request: insufficient credit',
    '1028': 'Digimiles rejected the request: spam content',
  };
  return errors[code] || 'SMS provider is unavailable';
}
