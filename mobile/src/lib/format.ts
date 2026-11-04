export function formatInr(value: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹0';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${Math.round(amount).toLocaleString('en-IN')}`;
  }
}

export function formatPercent(value: unknown): string {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return '—';
  const percent = rate <= 1 ? rate * 100 : rate;
  return `${percent.toFixed(2)}% p.a.`;
}

export function formatFeeRate(value: unknown): string {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return '—';
  const percent = rate <= 1 ? rate * 100 : rate;
  return `${percent.toFixed(2)}%`;
}

export function formatDate(value: unknown): string {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  } catch {
    return date.toDateString();
  }
}

export function productInterestRate(product: {
  interest?: { annualRate?: number | string };
  baseInterestRate?: number | string;
}): number | string {
  return product.interest?.annualRate ?? product.baseInterestRate ?? 0;
}

export function productProcessingFeeRate(product: {
  fees?: { processingFeeRate?: number | string };
  processingFeeRate?: number | string;
}): number | string {
  return product.fees?.processingFeeRate ?? product.processingFeeRate ?? 0;
}
