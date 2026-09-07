import { sendDigimilesSms, shouldUseDigimiles } from './digimiles.client';

const credentials = {
  username: 'di78-trans',
  password: 'secret',
  baseUrl: 'https://sms.digimiles.in/bulksms/bulksms',
  senderId: 'RUPAID',
  entityId: '1101420XXXXXXXXXXXX',
};

describe('sendDigimilesSms', () => {
  it('posts DLT fields and returns the provider message id', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '1701|919876543210|DM-99',
    })) as unknown as typeof fetch;

    const result = await sendDigimilesSms({
      credentials,
      to: '+919876543210',
      message: '₹ 1000 has been disbursed.',
      templateId: '1007164XXXXXXXXXXXX',
      fetchImpl,
    });

    const body = String((fetchImpl as jest.Mock).mock.calls[0][1].body);
    expect(result.providerMessageId).toBe('DM-99');
    expect(body).toContain('destination=919876543210');
    expect(body).toContain('source=RUPAID');
    expect(body).toContain('entityid=1101420XXXXXXXXXXXX');
    expect(body).toContain('tempid=1007164XXXXXXXXXXXX');
    expect(body).toContain('Rs+1000');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not use Digimiles outside production even when credentials exist', () => {
    const config = {
      get: (key: string) =>
        ({
          NODE_ENV: 'development',
          DIGIMILES_USERNAME: 'user',
          DIGIMILES_PASSWORD: 'pass',
          DIGIMILES_SENDER_ID: 'RUPAID',
          DIGIMILES_ENTITY_ID: '1101',
        })[key],
    } as never;
    expect(shouldUseDigimiles(config)).toBe(false);
  });

  it('rejects non-success Digimiles codes', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '1703|Invalid credentials',
    })) as unknown as typeof fetch;

    await expect(
      sendDigimilesSms({
        credentials,
        to: '9876543210',
        message: 'Your OTP is 123456',
        templateId: 'otp-template',
        fetchImpl,
      }),
    ).rejects.toThrow('invalid credentials');
  });
});
