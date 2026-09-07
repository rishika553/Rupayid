import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { LoanProductsService } from '../loan-products/loan-products.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ageInYears,
  customerReason,
  definitionFromVersion,
  evaluateRule,
  type EligibilityFacts,
} from './eligibility.engine';

export type CustomerEligibilityResult = {
  reference: string;
  eligible: boolean;
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'ADDITIONAL_INFORMATION_REQUIRED';
  category?: string;
  reason: string;
  eligibleAmount: string | null;
  availableTenure: number[] | null;
};

@Injectable()
export class EligibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loanProducts: LoanProductsService,
    private readonly audit: AuditService,
  ) {}

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

  async evaluate(userId: string, loanProductId: string): Promise<CustomerEligibilityResult> {
    const product = await this.prisma.loanProduct.findUnique({ where: { id: loanProductId } });
    if (!product || !this.loanProducts.isOfferedToCustomers(product)) {
      throw new NotFoundException('Loan product not found');
    }
    const offered = this.loanProducts.toCustomerProduct(product);
    const facts = await this.loadFacts(userId);
    const rules = await this.prisma.eligibilityRule.findMany({
      where: { status: 'ACTIVE' },
      include: {
        versions: {
          where: { status: 'ACTIVE' },
          orderBy: { version: 'desc' },
        },
      },
    });

    const runId = randomUUID();
    const evaluatedAt = new Date();
    const ruleRows: Array<{
      ruleId: string;
      ruleVersionId: string | null;
      version: number;
      key: string;
      status: 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING';
      matched: boolean | null;
      category: string;
      ruleValue: unknown;
    }> = [];

    for (const rule of rules) {
      const version =
        rule.versions.find((row) => row.id === rule.appliedVersionId) || rule.versions[0] || null;
      const definition = definitionFromVersion(
        {
          key: rule.key,
          ruleType: rule.ruleType,
          operator: rule.operator,
          value: rule.value,
        },
        version?.ruleJson,
      );
      const verdict = evaluateRule(definition, facts);
      ruleRows.push({
        ruleId: rule.id,
        ruleVersionId: version?.id || null,
        version: version?.version ?? rule.version,
        key: definition.key,
        status: verdict.status,
        matched: verdict.matched,
        category: verdict.category,
        ruleValue: definition.value,
      });
    }

    const failed = ruleRows.find((row) => row.status === 'INELIGIBLE');
    const pending = ruleRows.find((row) => row.status === 'PENDING');
    const customerStatus = failed
      ? 'NOT_ELIGIBLE'
      : pending
        ? 'ADDITIONAL_INFORMATION_REQUIRED'
        : 'ELIGIBLE';
    const category = (failed || pending)?.category;
    const storedStatus = failed ? 'INELIGIBLE' : pending ? 'PENDING' : 'ELIGIBLE';
    const eligible = customerStatus === 'ELIGIBLE';
    const result: CustomerEligibilityResult = {
      reference: runId,
      eligible,
      status: customerStatus,
      category,
      reason: customerReason(customerStatus, category),
      eligibleAmount: eligible ? offered.maxAmount : null,
      availableTenure: eligible ? offered.tenureOptions : null,
    };

    await this.prisma.$transaction(async (tx) => {
      for (const row of ruleRows) {
        await tx.eligibilityEvaluation.create({
          data: {
            userId,
            loanProductId: product.id,
            ruleId: row.ruleId,
            ruleVersionId: row.ruleVersionId,
            status: row.status === 'PENDING' ? 'PENDING' : row.status,
            matched: row.matched,
            ruleValue: row.ruleValue as never,
            evaluationMeta: { runId, category: row.category } as never,
            snapshotJson: {
              runId,
              ruleKey: row.key,
              ruleVersion: row.version,
              ruleVersionId: row.ruleVersionId,
              status: row.status,
              matched: row.matched,
              facts: snapshotFacts(facts),
            } as never,
            evaluatedAt,
          },
        });
      }
      await tx.eligibilityEvaluation.create({
        data: {
          id: runId,
          userId,
          loanProductId: product.id,
          status: storedStatus,
          matched: eligible,
          evaluationMeta: {
            runId,
            role: 'summary',
            customerStatus,
            category,
          } as never,
          snapshotJson: {
            runId,
            role: 'summary',
            customerStatus,
            category,
            ruleVersions: ruleRows.map((row) => ({
              ruleId: row.ruleId,
              ruleVersionId: row.ruleVersionId,
              version: row.version,
              status: row.status,
            })),
            facts: snapshotFacts(facts),
            product: { id: product.id, maxAmount: offered.maxAmount, tenureOptions: offered.tenureOptions },
          } as never,
          evaluatedAt,
        },
      });
    });

    await this.audit.log({
      actionType: 'OTHER',
      entityType: 'EligibilityEvaluation',
      entityId: runId,
      eventCategory: 'ELIGIBILITY',
      changedById: userId,
      changedForUserId: userId,
      message: 'Eligibility evaluated',
      metadata: { status: customerStatus, category, loanProductId: product.id },
    });

    return result;
  }

  async findEvaluations(userId: string) {
    const rows = await this.prisma.eligibilityEvaluation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows
      .filter((row) => {
        const meta = row.evaluationMeta as { role?: string } | null;
        return meta?.role === 'summary';
      })
      .map((row) => {
        const meta = (row.evaluationMeta || {}) as { customerStatus?: CustomerEligibilityResult['status']; category?: string };
        const snapshot = (row.snapshotJson || {}) as { product?: { maxAmount?: string; tenureOptions?: number[] } };
        const status = meta.customerStatus || (row.status === 'ELIGIBLE' ? 'ELIGIBLE' : row.status === 'INELIGIBLE' ? 'NOT_ELIGIBLE' : 'ADDITIONAL_INFORMATION_REQUIRED');
        const eligible = status === 'ELIGIBLE';
        return {
          reference: row.id,
          eligible,
          status,
          category: meta.category,
          reason: customerReason(status, meta.category),
          eligibleAmount: eligible ? snapshot.product?.maxAmount || null : null,
          availableTenure: eligible ? snapshot.product?.tenureOptions || null : null,
        } satisfies CustomerEligibilityResult;
      });
  }

  private async loadFacts(userId: string): Promise<EligibilityFacts> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        kycApplications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { details: true },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Customer profile not found');
    }
    const profile = user.profile;
    const details = user.kycApplications[0]?.details;
    const dob = details?.dateOfBirth || profile?.dateOfBirth || null;
    const yearly = profile?.yearlyIncome != null ? Number(profile.yearlyIncome) : null;
    return {
      ageYears: dob ? ageInYears(dob) : null,
      monthlyIncome: yearly != null && Number.isFinite(yearly) ? yearly / 12 : null,
      creditScore: profile?.creditScore ?? null,
      city: details?.city || profile?.city || null,
      pincode: details?.pincode || profile?.pincode || null,
      occupation: profile?.occupation || null,
    };
  }
}

function snapshotFacts(facts: EligibilityFacts) {
  return {
    hasAge: facts.ageYears != null,
    hasIncome: facts.monthlyIncome != null,
    hasCreditScore: facts.creditScore != null,
    hasCity: Boolean(facts.city),
    hasPincode: Boolean(facts.pincode),
    hasOccupation: Boolean(facts.occupation),
    ageYears: facts.ageYears,
    monthlyIncome: facts.monthlyIncome,
    city: facts.city,
  };
}
