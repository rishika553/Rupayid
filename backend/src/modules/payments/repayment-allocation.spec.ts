import { Prisma } from '@prisma/client';
import { allocateRepayment, installmentOutstanding } from './repayment-allocation';

describe('repayment allocation', () => {
  it('computes outstanding with Decimal precision', () => {
    expect(installmentOutstanding('100.10', '40.05').toFixed(2)).toBe('60.05');
  });

  it('allocates penalty, then interest, then principal', () => {
    const result = allocateRepayment({
      totalAmount: new Prisma.Decimal('9050.00'),
      paidAmount: new Prisma.Decimal('0'),
      principalPortion: new Prisma.Decimal('8000.00'),
      interestPortion: new Prisma.Decimal('1000.00'),
      penaltyPortion: new Prisma.Decimal('50.00'),
      paymentAmount: new Prisma.Decimal('9050.00'),
    });
    expect(result.penalty.toFixed(2)).toBe('50.00');
    expect(result.interest.toFixed(2)).toBe('1000.00');
    expect(result.principal.toFixed(2)).toBe('8000.00');
    expect(result.scheduleStatus).toBe('PAID');
  });

  it('continues a partial payment from remaining buckets', () => {
    const result = allocateRepayment({
      totalAmount: new Prisma.Decimal('9050.00'),
      paidAmount: new Prisma.Decimal('60.00'),
      principalPortion: new Prisma.Decimal('8000.00'),
      interestPortion: new Prisma.Decimal('1000.00'),
      penaltyPortion: new Prisma.Decimal('50.00'),
      paymentAmount: new Prisma.Decimal('1000.00'),
    });
    expect(result.penalty.toFixed(2)).toBe('0.00');
    expect(result.interest.toFixed(2)).toBe('990.00');
    expect(result.principal.toFixed(2)).toBe('10.00');
    expect(result.newPaidAmount.toFixed(2)).toBe('1060.00');
    expect(result.scheduleStatus).toBe('PARTIALLY_PAID');
  });
});
