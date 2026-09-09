import { NotFoundException } from '@nestjs/common';
import { RepaymentsService } from './repayments.service';

function harness() {
  const loans = [
    { id: 'loan-a', userId: 'user-a' },
    { id: 'loan-b', userId: 'user-b' },
  ];
  const repayments = [
    { id: 'rep-a', loanApplicationId: 'loan-a', amount: 1000 },
    { id: 'rep-b', loanApplicationId: 'loan-b', amount: 2000 },
  ];
  const prisma = {
    loanApplication: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        loans.find((row) => row.id === where.id) || null,
      ),
    },
    repayment: {
      findMany: jest.fn(async ({ where }: { where: { loanApplicationId: string } }) =>
        repayments.filter((row) => row.loanApplicationId === where.loanApplicationId),
      ),
    },
    repaymentSchedule: {
      findMany: jest.fn(async ({ where }: { where: { loanApplicationId: string } }) =>
        where.loanApplicationId === 'loan-a' ? [{ id: 'emi-a' }] : [{ id: 'emi-b' }],
      ),
    },
  };
  return { prisma, service: new RepaymentsService(prisma as never) };
}

describe('RepaymentsService isolation', () => {
  it('returns repayments only to the loan owner', async () => {
    const { service, prisma } = harness();
    const mine = await service.findByLoan('loan-a', 'user-a');
    expect(mine).toEqual([expect.objectContaining({ id: 'rep-a' })]);
    expect(prisma.repayment.findMany).toHaveBeenCalled();
  });

  it('hides another customer repayments', async () => {
    const { service, prisma } = harness();
    await expect(service.findByLoan('loan-b', 'user-a')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.repayment.findMany).not.toHaveBeenCalled();
  });

  it('hides another customer schedule', async () => {
    const { service } = harness();
    await expect(service.getSchedule('loan-b', 'user-a')).rejects.toBeInstanceOf(NotFoundException);
  });
});
