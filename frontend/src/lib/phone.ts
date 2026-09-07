const TEN_DIGIT = /^[6-9]\d{9}$/;

export function normalizeLoginPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91') && TEN_DIGIT.test(digits.slice(2))) {
    return digits.slice(2);
  }
  if (TEN_DIGIT.test(digits)) {
    return digits;
  }
  return input.trim();
}
