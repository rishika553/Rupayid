import { ConfigService } from '@nestjs/config';
import { DigimilesNotificationProvider } from './digimiles-notification.provider';

describe('DigimilesNotificationProvider', () => {
  const values: Record<string, string> = {
    DIGIMILES_USERNAME: 'di78-trans',
    DIGIMILES_PASSWORD: 'secret',
    DIGIMILES_SENDER_ID: 'RUPAID',
    DIGIMILES_ENTITY_ID: '1101420XXXXXXXXXXXX',
    DIGIMILES_TEMPLATE_OTP: 'otp-template',
    DIGIMILES_TEMPLATE_KYC_APPROVED: 'kyc-template',
  };
  const provider = new DigimilesNotificationProvider({
    get: (key: string) => values[key],
  } as ConfigService);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends OTP using the Digimiles OTP template and variable', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '1701|919876543210|otp-1',
    } as Response);

    const result = await provider.send({
      to: '+919876543210',
      subject: 'OTP',
      body: 'Your one-time password was requested.',
      eventType: 'OTP',
      variables: { otp: '654321' },
    });

    expect(result.providerMessageId).toBe('otp-1');
    const body = String(fetchSpy.mock.calls[0][1]?.body);
    expect(body).toContain('tempid=otp-template');
    expect(decodeURIComponent(body)).toContain('654321');
    expect(decodeURIComponent(body)).not.toContain('Your one-time password was requested.');
  });

  it('sends notification copy with the event template id', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '1701|919876543210|kyc-1',
    } as Response);

    await provider.send({
      to: '9876543210',
      subject: 'KYC approved',
      body: 'Your KYC verification has been approved.',
      eventType: 'KYC_APPROVED',
      variables: {},
    });

    const body = decodeURIComponent(String(fetchSpy.mock.calls[0][1]?.body).replace(/\+/g, ' '));
    expect(body).toContain('tempid=kyc-template');
    expect(body).toContain('Your KYC verification has been approved.');
  });
});
