export function formatInr(value: unknown): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: unknown): string {
  const rate = Number(value);
  if (!Number.isFinite(rate)) {
    return '—';
  }
  const percent = rate <= 1 ? rate * 100 : rate;
  return `${percent.toFixed(2)}% p.a.`;
}

export function formatDate(value: unknown): string {
  if (!value) {
    return '—';
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function statusLabel(status: string | undefined): string {
  if (!status) {
    return 'Unknown';
  }
  return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
