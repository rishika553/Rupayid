import { Prisma } from '@prisma/client';
import {
  customerInstallmentStatus,
  installmentOutstanding,
  summarizeSchedule,
  toCustomerInstallment,
  type ScheduleRow,
} from './repayment-schedule';

function row(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id: 'emi-1',
    sequence: 1,
    dueDate: new Date('2026-10-01T00:00:00.000Z'),
    principalPortion: new Prisma.Decimal('8000.10'),
    interestPortion: new Prisma.Decimal('999.90'),
    penaltyPortion: new Prisma.Decimal('50.00'),
    totalAmount: new Prisma.Decimal('9050.00'),
    paidAmount: new Prisma.Decimal('0'),
    status: 'SCHEDULED',
    ...overrides,
  };
}

describe('repayment schedule', () => {
  const asOf = new Date('2026-09-05T12:00:00.000Z');

  it('computes outstanding with Decimal precision', () => {
    const left = installmentOutstanding(new Prisma.Decimal('100.10'), new Prisma.Decimal('40.05'));
    expect(left.toFixed(2)).toBe('60.05');
    expect(installmentOutstanding(new Prisma.Decimal('50'), new Prisma.Decimal('80')).toFixed(2)).toBe('0.00');
  });

  it('maps customer statuses from due date and amounts', () => {
    expect(customerInstallmentStatus(row(), asOf)).toBe('UPCOMING');
    expect(customerInstallmentStatus(row({ dueDate: new Date('2026-09-05T08:00:00.000Z') }), asOf)).toBe('DUE');
    expect(
      customerInstallmentStatus(row({ paidAmount: new Prisma.Decimal('1000.00'), status: 'PARTIALLY_PAID' }), asOf),
    ).toBe('PARTIALLY_PAID');
    expect(customerInstallmentStatus(row({ dueDate: new Date('2026-08-01T00:00:00.000Z') }), asOf)).toBe('OVERDUE');
    expect(
      customerInstallmentStatus(
        row({ paidAmount: new Prisma.Decimal('9050.00'), status: 'SCHEDULED' }),
        asOf,
      ),
    ).toBe('PAID');
  });

  it('treats a past-due partial payment as overdue', () => {
    expect(
      customerInstallmentStatus(
        row({
          dueDate: new Date('2026-08-01T00:00:00.000Z'),
          paidAmount: new Prisma.Decimal('100.00'),
          status: 'PARTIALLY_PAID',
        }),
        asOf,
      ),
    ).toBe('OVERDUE');
  });

  it('summarizes next payment and totals on the server', () => {
    const summary = summarizeSchedule(
      [
        row({
          sequence: 1,
          dueDate: new Date('2026-08-01T00:00:00.000Z'),
          totalAmount: new Prisma.Decimal('9000.00'),
          paidAmount: new Prisma.Decimal('1000.00'),
          status: 'PAST_DUE',
        }),
        row({
          id: 'emi-2',
          sequence: 2,
          dueDate: new Date('2026-10-01T00:00:00.000Z'),
          totalAmount: new Prisma.Decimal('9000.00'),
          paidAmount: new Prisma.Decimal('0'),
        }),
      ],
      asOf,
    );
    expect(summary.nextPayment?.installmentNumber).toBe(1);
    expect(summary.nextPayment?.status).toBe('OVERDUE');
    expect(summary.nextPayment?.outstanding).toBe('8000.00');
    expect(summary.totals.amountPaid).toBe('1000.00');
    expect(summary.totals.outstanding).toBe('17000.00');
    const mapped = toCustomerInstallment(row({ penaltyPortion: new Prisma.Decimal('25.50') }), asOf);
    expect(mapped.fees).toBe('25.50');
    expect(mapped.principal).toBe('8000.10');
  });
});
