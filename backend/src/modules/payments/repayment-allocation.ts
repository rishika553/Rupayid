import { Prisma } from '@prisma/client';

export function money(value: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  return new Prisma.Decimal(value == null ? '0' : String(value));
}

function minAmount(a: Prisma.Decimal, b: Prisma.Decimal): Prisma.Decimal {
  return a.lt(b) ? a : b;
}

export function installmentOutstanding(
  totalDue: Prisma.Decimal | string | number,
  amountPaid: Prisma.Decimal | string | number,
): Prisma.Decimal {
  const left = money(totalDue).minus(money(amountPaid));
  return left.gt(0) ? left : new Prisma.Decimal(0);
}

export function allocateRepayment(input: {
  totalAmount: Prisma.Decimal | string | number;
  paidAmount: Prisma.Decimal | string | number;
  principalPortion: Prisma.Decimal | string | number;
  interestPortion: Prisma.Decimal | string | number;
  penaltyPortion: Prisma.Decimal | string | number;
  paymentAmount: Prisma.Decimal | string | number;
}) {
  const outstanding = installmentOutstanding(input.totalAmount, input.paidAmount);
  const applied = minAmount(money(input.paymentAmount), outstanding);
  let alreadyPaid = money(input.paidAmount);

  const remaining = (bucket: Prisma.Decimal) => {
    const used = minAmount(bucket, alreadyPaid);
    alreadyPaid = alreadyPaid.minus(used);
    return bucket.minus(used);
  };

  let leftover = applied;
  const take = (bucket: Prisma.Decimal) => {
    const part = minAmount(bucket, leftover);
    leftover = leftover.minus(part);
    return part;
  };

  const penalty = take(remaining(money(input.penaltyPortion)));
  const interest = take(remaining(money(input.interestPortion)));
  const principal = take(remaining(money(input.principalPortion)));
  const newPaidAmount = money(input.paidAmount).plus(applied);
  const paidInFull = newPaidAmount.gte(money(input.totalAmount));

  return {
    applied,
    principal,
    interest,
    penalty,
    newPaidAmount,
    scheduleStatus: paidInFull ? 'PAID' : 'PARTIALLY_PAID',
    repaymentStatus: paidInFull ? 'PAID' : 'PARTIAL_PAYMENT',
  };
}
