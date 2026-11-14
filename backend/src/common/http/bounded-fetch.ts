import { ServiceUnavailableException } from '@nestjs/common';

/** A transport failure may occur after a provider accepted a write. */
export class ProviderTransportError extends ServiceUnavailableException {
  constructor() { super('Provider request unavailable or timed out; outcome may be unknown'); }
}

export async function boundedFetch(input: string, init: RequestInit = {}, fetchImpl: typeof fetch = fetch, timeoutMs = 15_000): Promise<Response> {
  const controller = new AbortController();
  const deadline = Date.now() + timeoutMs;
  const run = async <T>(operation: () => Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = () => controller.abort();
    init.signal?.addEventListener('abort', abort, { once: true });
    if (init.signal?.aborted) controller.abort();
    try {
      return await Promise.race([operation(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new ProviderTransportError()); }, Math.max(0, deadline - Date.now()));
      })]);
    } catch (error) {
      if (error instanceof SyntaxError) throw error;
      throw new ProviderTransportError();
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener('abort', abort);
    }
  };
  const response = await run(() => fetchImpl(input, { ...init, signal: controller.signal }));
  return new Proxy(response, {
    get(target, key) {
      if (['json', 'text', 'arrayBuffer', 'blob', 'formData'].includes(String(key))) {
        return () => run(() => (target[key as 'text'] as () => Promise<unknown>).call(target));
      }
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
