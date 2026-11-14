import { afterEach, expect, it, vi } from 'vitest';
import { putFileWithProgress } from './kyc';

afterEach(() => vi.unstubAllGlobals());
it.each(['timeout', 'error', 'abort'])('rejects a failed upload (%s) without retrying', async (failure) => {
  let xhr: Record<string, any>;
  const send = vi.fn();
  vi.stubGlobal('XMLHttpRequest', class {
    upload = {};
    open = vi.fn();
    setRequestHeader = vi.fn();
    send = send;
    constructor() { xhr = this; }
  });
  const pending = putFileWithProgress('https://test.invalid', new File(['test'], 'test.pdf'), 'application/pdf');
  const assertion = expect(pending).rejects.toThrow();
  expect(xhr!.timeout).toBe(60_000);
  xhr![`on${failure}`]();
  await assertion;
  expect(send).toHaveBeenCalledTimes(1);
});
