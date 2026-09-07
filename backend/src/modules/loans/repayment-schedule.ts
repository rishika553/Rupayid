import { Prisma } from '@prisma/client';

export type CustomerInstallmentStatus = 'UPCOMING' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export type ScheduleRow = {
  id: string;
  sequence: number;
  dueDate: Date;
  principalPortion: Prisma.Decimal | string | number;
  interestPortion: Prisma.Decimal | string | number;
  penaltyPortion: Prisma.Decimal | string | number;
  totalAmount: Prisma.Decimal | string | number;
  paidAmount: Prisma.Decimal | string | number;
  status: string;
};

export type CustomerInstallment = {
  installmentNumber: number;
  dueDate: Date;
  principal: string;
  interest: string;
  fees: string;
  totalDue: string;
  amountPaid: string;
  outstanding: string;
  status: CustomerInstallmentStatus;
};

export function money(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  return new Prisma.Decimal(value == null ? '0' : String(value));
}

export function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function installmentOutstanding(totalDue: Prisma.Decimal, amountPaid: Prisma.Decimal): Prisma.Decimal {
  const left = totalDue.minus(amountPaid);
  return left.gt(0) ? left : new Prisma.Decimal(0);
}

export function customerInstallmentStatus(row: ScheduleRow, asOf = new Date()): CustomerInstallmentStatus {
  const totalDue = money(row.totalAmount);
  const amountPaid = money(row.paidAmount);
  const outstanding = installmentOutstanding(totalDue, amountPaid);
  if (['PAID', 'PREPAID', 'WAIVED', 'CANCELLED'].includes(row.status) || (outstanding.lte(0) && amountPaid.gt(0))) {
    return 'PAID';
  }
  const dueDay = startOfUtcDay(row.dueDate);
  const today = startOfUtcDay(asOf);
  if (dueDay.getTime() < today.getTime()) {
    return 'OVERDUE';
  }
  if (amountPaid.gt(0) && outstanding.gt(0)) {
    return 'PARTIALLY_PAID';
  }
  if (dueDay.getTime() === today.getTime()) {
    return 'DUE';
  }
  return 'UPCOMING';
}

export function toCustomerInstallment(row: ScheduleRow, asOf = new Date()): CustomerInstallment {
  const totalDue = money(row.totalAmount);
  const amountPaid = money(row.paidAmount);
  return {
    installmentNumber: row.sequence,
    dueDate: row.dueDate,
    principal: money(row.principalPortion).toFixed(2),
    interest: money(row.interestPortion).toFixed(2),
    fees: money(row.penaltyPortion).toFixed(2),
    totalDue: totalDue.toFixed(2),
    amountPaid: amountPaid.toFixed(2),
    outstanding: installmentOutstanding(totalDue, amountPaid).toFixed(2),
    status: customerInstallmentStatus(row, asOf),
  };
}

export function summarizeSchedule(rows: ScheduleRow[], asOf = new Date()) {
  const installments = rows
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((row) => toCustomerInstallment(row, asOf));
  const totals = installments.reduce(
    (acc, row) => ({
      totalDue: acc.totalDue.plus(money(row.totalDue)),
      amountPaid: acc.amountPaid.plus(money(row.amountPaid)),
      outstanding: acc.outstanding.plus(money(row.outstanding)),
    }),
    {
      totalDue: new Prisma.Decimal(0),
      amountPaid: new Prisma.Decimal(0),
      outstanding: new Prisma.Decimal(0),
    },
  );
  const nextPayment =
    installments.find((row) => row.status === 'OVERDUE') ||
    installments.find((row) => row.status === 'DUE') ||
    installments.find((row) => row.status === 'PARTIALLY_PAID') ||
    installments.find((row) => row.status === 'UPCOMING') ||
    null;
  return {
    installments,
    nextPayment,
    totals: {
      totalDue: totals.totalDue.toFixed(2),
      amountPaid: totals.amountPaid.toFixed(2),
      outstanding: totals.outstanding.toFixed(2),
    },
  };
}
