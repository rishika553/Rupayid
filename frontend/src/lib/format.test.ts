import { describe, expect, it } from 'vitest';
import { formatInr, formatPercent, formatFeeRate, statusLabel, formatDate } from './format';

describe('formatInr', () => {
  it('formats integer rupees in the Indian locale', () => {
    expect(formatInr(100000)).toMatch(/1,00,000/);
  });
  it('returns ₹0 for non-numeric values', () => {
    expect(formatInr(undefined)).toBe('₹0');
    expect(formatInr('xyz')).toBe('₹0');
    expect(formatInr(Number.NaN)).toBe('₹0');
  });
});

describe('formatPercent', () => {
  it('treats a fraction <= 1 as a ratio', () => {
    expect(formatPercent(0.12)).toBe('12.00% p.a.');
  });
  it('treats a value > 1 as a percent', () => {
    expect(formatPercent(14.5)).toBe('14.50% p.a.');
  });
  it('returns em dash for invalid values', () => {
    expect(formatPercent(undefined)).toBe('—');
  });
});

describe('formatFeeRate', () => {
  it('omits the p.a. suffix', () => {
    expect(formatFeeRate(0.025)).toBe('2.50%');
  });
});

describe('statusLabel', () => {
  it('title-cases a snake_case status', () => {
    expect(statusLabel('under_review')).toBe('Under review');
  });
  it('handles undefined', () => {
    expect(statusLabel(undefined)).toBe('Unknown');
  });
});

describe('formatDate', () => {
  it('returns em dash for empty / invalid', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate('not a date')).toBe('—');
  });
  it('formats an ISO date in the Indian locale', () => {
    const out = formatDate('2026-01-15');
    expect(out).toMatch(/15/);
    expect(out).toMatch(/2026/);
  });
});
