import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.eligibilityRule.findMany({
      include: { versions: { where: { status: 'ACTIVE' }, take: 1 } },
    });
  }

  async findById(id: string) {
    const rule = await this.prisma.eligibilityRule.findUnique({
      where: { id },
      include: { versions: true },
    });
    if (!rule) throw new Error('Eligibility rule not found');
    return rule;
  }

  async create(data: { name: string; key: string; ruleType: string; operator: string; value: unknown; description?: string }) {
    const existing = await this.prisma.eligibilityRule.findUnique({ where: { key: data.key } });
    if (existing) throw new Error('Rule key already exists');

    return this.prisma.eligibilityRule.create({
      data: {
        name: data.name,
        key: data.key,
        ruleType: data.ruleType as never,
        operator: data.operator as never,
        value: JSON.stringify(data.value) as never,
        description: data.description,
        status: 'DRAFT',
      },
    });
  }

  async evaluate(userId: string, loanProductId?: string) {
    const rules = await this.prisma.eligibilityRule.findMany({
      where: { status: 'ACTIVE' },
    });

    const results = [];

    for (const rule of rules) {
      const result = await this.prisma.eligibilityEvaluation.create({
        data: {
          userId,
          loanProductId: loanProductId || null,
          ruleId: rule.id,
          ruleVersionId: rule.appliedVersionId,
          status: 'PENDING',
          ruleValue: rule.value as never,
          snapshotJson: {
            ruleKey: rule.key,
            ruleName: rule.name,
            ruleType: rule.ruleType,
            operator: rule.operator,
            value: rule.value,
            version: rule.version,
            appliedVersionId: rule.appliedVersionId,
          } as never,
        },
      });

      results.push(result);
    }

    return results;
  }

  async findEvaluations(userId: string) {
    return this.prisma.eligibilityEvaluation.findMany({
      where: { userId },
      include: { rule: true, loanProduct: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
