import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Prisma');

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn('Skipping clean in production');
      return;
    }

    const modelNames = [
      'permission', 'rolePermission', 'usersOnRoles', 'user',
      'customerProfile', 'adminUser', 'session', 'otpRequest', 'mfaSetup',
      'kycApplication', 'kycDocument', 'kycVerificationDecisionRecord',
      'referral', 'eligibilityRule', 'eligibilityRuleVersion',
      'eligibilityEvaluation', 'loanProduct', 'loanApplication',
      'loanApplicationStateEvent', 'loanApproval', 'loanDisbursement',
      'repaymentSchedule', 'repayment', 'payment', 'paymentTransaction',
      'ledger', 'ledgerEntry', 'notificationTemplate', 'notification',
      'auditLog', 'systemSetting',
    ];

    return Promise.all(
      modelNames.map((name) => {
        try {
          const model = (this as Record<string, unknown>)[name] as { deleteMany?: () => Promise<unknown> };
          return model?.deleteMany?.() || Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      }),
    );
  }
}
