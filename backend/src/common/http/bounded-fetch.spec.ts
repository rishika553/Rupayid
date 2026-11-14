import { boundedFetch, ProviderTransportError } from './bounded-fetch';

describe('provider deadlines', () => {
  afterEach(() => jest.useRealTimers());
  it.each(['connection', 'body'])('aborts a stalled %s without retrying', async (stage) => {
    jest.useFakeTimers();
    const stalled = new Promise<never>(() => {});
    const fetcher = jest.fn().mockImplementation(() => stage === 'connection' ? stalled : Promise.resolve({ text: () => stalled }));
    const result = boundedFetch('https://test.invalid', {}, fetcher, 100).then((response) => response.text());
    const assertion = expect(result).rejects.toBeInstanceOf(ProviderTransportError);
    await jest.advanceTimersByTimeAsync(101);
    await assertion;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });
  it('redacts network errors and does not retry writes', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('secret URL'));
    await expect(boundedFetch('https://test.invalid', { method: 'POST' }, fetcher)).rejects.toThrow('outcome may be unknown');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
