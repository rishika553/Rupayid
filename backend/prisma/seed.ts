import { AdminUserStatus, PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ──────────────────────────────────────────────────────────────
  // 1. Roles & Permissions
  // ──────────────────────────────────────────────────────────────

  const permissionData = [
    // customers
    { name: 'customers:read', module: 'customers', action: 'read' },
    { name: 'customers:write', module: 'customers', action: 'write' },
    { name: 'customers:delete', module: 'customers', action: 'delete' },
    // loans
    { name: 'loans:read', module: 'loans', action: 'read' },
    { name: 'loans:create', module: 'loans', action: 'create' },
    { name: 'loans:approve', module: 'loans', action: 'approve' },
    { name: 'loans:disburse', module: 'loans', action: 'disburse' },
    { name: 'loans:reject', module: 'loans', action: 'reject' },
    { name: 'loans:write_off', module: 'loans', action: 'write_off' },
    // kyc
    { name: 'kyc:read', module: 'kyc', action: 'read' },
    { name: 'kyc:review', module: 'kyc', action: 'review' },
    { name: 'kyc:approve', module: 'kyc', action: 'approve' },
    { name: 'kyc:reject', module: 'kyc', action: 'reject' },
    // payments
    { name: 'payments:read', module: 'payments', action: 'read' },
    { name: 'payments:refund', module: 'payments', action: 'refund' },
    // ledger
    { name: 'ledger:read', module: 'ledger', action: 'read' },
    { name: 'ledger:adjust', module: 'ledger', action: 'adjust' },
    // admin
    { name: 'settings:read', module: 'settings', action: 'read' },
    { name: 'settings:write', module: 'settings', action: 'write' },
    { name: 'audit:read', module: 'audit', action: 'read' },
    { name: 'users:manage', module: 'users', action: 'manage' },
  ];

  const permissions = await Promise.all(
    permissionData.map((p) =>
      prisma.permission.upsert({
        where: { name: p.name },
        create: { ...p, createdBy: 'system' },
        update: {},
      }),
    ),
  );

  const permissionMap = Object.fromEntries(permissions.map((p) => [p.name, p.id]));

  const roleData = [
    {
      name: 'ADMIN',
      description: 'Full system admin',
      isSystem: true,
      permissionNames: Object.values(permissionMap),
    },
    {
      name: 'UNDERWRITER',
      description: 'Loan & KYC reviewer',
      isSystem: true,
      permissionNames: [
        permissionMap['loans:read'],
        permissionMap['loans:approve'],
        permissionMap['loans:reject'],
        permissionMap['kyc:read'],
        permissionMap['kyc:review'],
        permissionMap['kyc:approve'],
        permissionMap['kyc:reject'],
        permissionMap['payments:read'],
      ].filter(Boolean),
    },
    {
      name: 'SUPPORT',
      description: 'Customer support agent',
      isSystem: true,
      permissionNames: [
        permissionMap['customers:read'],
        permissionMap['loans:read'],
        permissionMap['kyc:read'],
        permissionMap['payments:read'],
        permissionMap['audit:read'],
      ].filter(Boolean),
    },
    {
      name: 'BORROWER',
      description: 'Default customer role',
      isSystem: true,
      permissionNames: [
        permissionMap['loans:create'],
        permissionMap['loans:read'],
      ].filter(Boolean),
    },
  ];

  const roles: Record<string, string> = {};
  for (const role of roleData) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      create: {
        name: role.name,
        description: role.description,
        isSystem: role.isSystem,
        permissions: {
          create: role.permissionNames.map((permId) => ({
            permissionId: permId,
            grantedBy: 'system',
          })),
        },
      },
      update: {},
    });
    roles[role.name] = created.id;
  }

  console.log(`  ✓ ${permissions.length} permissions, ${roleData.length} roles`);

  // ──────────────────────────────────────────────────────────────
  // 2. Admin User
  // ──────────────────────────────────────────────────────────────

  const adminPasswordHash = await bcrypt.hash('admin@12345', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@rupayaid.com' },
    create: {
      id: uuid(),
      email: 'admin@rupayaid.com',
      emailVerified: true,
      phoneVerified: true,
      firstName: 'System',
      lastName: 'Admin',
      phoneNumber: '+919000000001',
      status: UserStatus.ACTIVE,
      passwordHash: adminPasswordHash,
      lastLoginAt: new Date(),
      roles: {
        create: [{ roleId: roles['ADMIN'] }],
      },
    },
    update: {},
  });

  const underwriterUser = await prisma.user.upsert({
    where: { email: 'underwriter@rupayaid.com' },
    create: {
      id: uuid(),
      email: 'underwriter@rupayaid.com',
      emailVerified: true,
      phoneVerified: true,
      firstName: 'Ravi',
      lastName: 'Kumar',
      phoneNumber: '+919000000002',
      status: UserStatus.ACTIVE,
      passwordHash: await bcrypt.hash('uw@12345', 12),
      roles: {
        create: [{ roleId: roles['UNDERWRITER'] }],
      },
    },
    update: {},
  });

  await ensurePortalAdminUser(adminUser.id);

  await prisma.adminUser.upsert({
    where: { userId: underwriterUser.id },
    create: { userId: underwriterUser.id, badge: 'UW-001', department: 'Credit', level: 2 },
    update: {},
  });

  console.log('  ✓ Admin + Underwriter users');

  // ──────────────────────────────────────────────────────────────
  // 3. Demo Customers
  // ──────────────────────────────────────────────────────────────

  const customerData = [
    { email: 'aisha@example.com', first: 'Aisha', last: 'Patel', phone: '+919876543210', city: 'Mumbai' },
    { email: 'rohan@example.com', first: 'Rohan', last: 'Sharma', phone: '+919876543211', city: 'Delhi' },
    { email: 'priya@example.com', first: 'Priya', last: 'Nair', phone: '+919876543212', city: 'Bangalore' },
    { email: 'arjun@example.com', first: 'Arjun', last: 'Reddy', phone: '+919876543213', city: 'Hyderabad' },
    { email: 'neha@example.com', first: 'Neha', last: 'Iyer', phone: '+919876543214', city: 'Chennai' },
  ];

  const customerHash = await bcrypt.hash('customer@123', 12);
  const customers = [];
  let customerIndex = 0;

  for (const c of customerData) {
    customerIndex += 1;
    const referralCode = `RAP-DEMO${String(customerIndex).padStart(4, '0')}`;
    const user = await prisma.user.upsert({
      where: { email: c.email },
      create: {
        id: uuid(),
        email: c.email,
        emailVerified: true,
        firstName: c.first,
        lastName: c.last,
        phoneNumber: c.phone,
        status: UserStatus.ACTIVE,
        passwordHash: customerHash,
        referralCode,
        referralCodeCreatedAt: new Date(),
        roles: {
          create: [{ roleId: roles['BORROWER'] }],
        },
      },
      update: {
        referralCode,
        referralCodeCreatedAt: new Date(),
      },
    });

    await prisma.customerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        city: c.city,
        yearlyIncome: 1200000,
        occupation: 'salaried',
        gender: 'male',
        panNumber: `AAAAA${Math.floor(1000 + Math.random() * 9000)}`,
      },
      update: {},
    });

    customers.push(user);
  }

  console.log(`  ✓ ${customers.length} demo customers`);

  // ──────────────────────────────────────────────────────────────
  // 4. Loan Products
  // ──────────────────────────────────────────────────────────────

  const products = [
    {
      code: 'PL-1L-12M',
      name: 'Personal Loan 1L 12M',
      description: 'A short-tenure personal loan for everyday needs.',
      minAmount: 50000,
      maxAmount: 200000,
      minTenureMonths: 6,
      maxTenureMonths: 12,
      baseInterestRate: 0.12,
      processingFeeRate: 0.01,
    },
    {
      code: 'PL-3L-36M',
      name: 'Personal Loan 3L 36M',
      description: 'A larger personal loan with a longer repayment period.',
      minAmount: 100000,
      maxAmount: 500000,
      minTenureMonths: 12,
      maxTenureMonths: 36,
      baseInterestRate: 0.105,
      processingFeeRate: 0.0075,
    },
    {
      code: 'SL-50K-6M',
      name: 'Small Loan 50K 6M',
      description: 'A smaller personal loan for short-term expenses.',
      minAmount: 10000,
      maxAmount: 50000,
      minTenureMonths: 3,
      maxTenureMonths: 6,
      baseInterestRate: 0.15,
      processingFeeRate: 0.02,
    },
  ];

  for (const p of products) {
    await prisma.loanProduct.upsert({
      where: { code: p.code },
      create: {
        ...p,
        rules: {
          maxDebtRatio: 0.4,
          minCreditScore: 650,
        },
      },
      update: {},
    });
  }

  console.log('  ✓ 3 loan products');

  // ──────────────────────────────────────────────────────────────
  // 5. Eligibility Rules
  // ──────────────────────────────────────────────────────────────

  const rules = [
    { name: 'minimum_age', key: 'min_age', ruleType: 'AGE' as const, operator: 'GREATER_THAN_OR_EQUAL' as const, value: 21, description: 'Borrower must be 21+' },
    { name: 'maximum_age', key: 'max_age', ruleType: 'AGE' as const, operator: 'LESS_THAN_OR_EQUAL' as const, value: 58, description: 'Borrower must be 58 or younger at loan end' },
    { name: 'minimum_income', key: 'min_income', ruleType: 'INCOME' as const, operator: 'GREATER_THAN_OR_EQUAL' as const, value: 15000, description: 'Min monthly income ₹15K' },
    { name: 'minimum_credit_score', key: 'min_credit_score', ruleType: 'CREDIT_SCORE' as const, operator: 'GREATER_THAN_OR_EQUAL' as const, value: 650, description: 'Minimum CIBIL score 650' },
  ];

  const createdRules = [];
  for (const r of rules) {
    const created = await prisma.eligibilityRule.upsert({
      where: { key: r.key },
      create: {
        ...r,
        value: JSON.stringify(r.value),
        status: 'ACTIVE',
        version: 1,
        appliedVersionId: null,
        createdBy: 'system',
      },
      update: {},
    });

    await prisma.eligibilityRuleVersion.upsert({
      where: { ruleId_version: { ruleId: created.id, version: 1 } },
      create: {
        ruleId: created.id,
        version: 1,
        status: 'ACTIVE',
        ruleJson: JSON.stringify({ ...r, value: r.value }),
        activatedAt: new Date(),
        activatedBy: 'system',
      },
      update: {},
    });

    createdRules.push(created);
  }

  const cityRestriction = await prisma.eligibilityRule.findUnique({ where: { key: 'allowed_cities' } });
  if (cityRestriction) {
    await prisma.eligibilityRule.update({
      where: { id: cityRestriction.id },
      data: {
        status: 'INACTIVE',
        description: 'Retired — lending is pan India, not limited to selected cities',
      },
    });
    await prisma.eligibilityRuleVersion.updateMany({
      where: { ruleId: cityRestriction.id },
      data: { status: 'DEPRECATED' },
    });
  }

  console.log('  ✓ 4 eligibility rules (location is pan India)');

  // ──────────────────────────────────────────────────────────────
  // 6. Ledgers
  // ──────────────────────────────────────────────────────────────

  const ledgerData = [
    { code: 'GL-001', name: 'Customer Funds', type: 'CUSTOMER' as const, category: 'RECEIVABLE' as const },
    { code: 'GL-002', name: 'Platform Earnings', type: 'PLATFORM' as const, category: 'FEE_COLLECTION_INTERNAL' as const },
    { code: 'GL-003', name: 'Pending Settlement', type: 'INTERNAL' as const, category: 'ESCROW_PENDING' as const },
    { code: 'GL-004', name: 'Disbursement Pool', type: 'SYSTEM_ACCOUNT' as const, category: 'LOAN_DISBURSEMENT' as const },
    { code: 'GL-005', name: 'Penalty Revenue', type: 'PLATFORM' as const, category: 'OTHER' as const },
  ];

  for (const l of ledgerData) {
    await prisma.ledger.upsert({
      where: { code: l.code },
      create: { ...l, isSystem: true },
      update: {},
    });
  }

  console.log('  ✓ 5 ledgers');

  // ──────────────────────────────────────────────────────────────
  // 7. Notification Templates
  // ──────────────────────────────────────────────────────────────

  const templates = [
    { slug: 'welcome', channel: 'EMAIL' as const, titleTemplate: 'Welcome to RupayAid', bodyTemplate: 'Hi {{firstName}}, your account is ready.' },
    { slug: 'otp_login', channel: 'SMS' as const, titleTemplate: 'Your OTP', bodyTemplate: 'Your OTP is {{otp}}. It expires in {{expiry}} minutes.' },
    { slug: 'loan_submitted', channel: 'EMAIL' as const, titleTemplate: 'Loan Application Received', bodyTemplate: 'Ref: {{applicationNumber}}. We will review within 24h.' },
    { slug: 'loan_approved', channel: 'EMAIL' as const, titleTemplate: 'Loan Approved', bodyTemplate: 'Congratulations {{firstName}}! Your loan of ₹{{amount}} is approved.' },
    { slug: 'loan_disbursed', channel: 'EMAIL' as const, titleTemplate: 'Loan Disbursed', bodyTemplate: '₹{{amount}} disbursed to your account via {{method}}.' },
    { slug: 'emi_reminder', channel: 'SMS' as const, titleTemplate: 'EMI Reminder', bodyTemplate: 'Your EMI of ₹{{amount}} is due on {{dueDate}}.' },
    { slug: 'repayment_received', channel: 'INAPP' as const, titleTemplate: 'Payment received', bodyTemplate: 'We recorded your repayment of ₹{{amount}}.' },
    { slug: 'otp_sms', channel: 'SMS' as const, titleTemplate: 'Your RupayAid OTP', bodyTemplate: 'Your OTP is {{otp}}. It expires shortly.' },
    { slug: 'kyc_submitted_inapp', channel: 'INAPP' as const, titleTemplate: 'KYC submitted', bodyTemplate: 'Your KYC application {{reference}} is under review.' },
    { slug: 'kyc_submitted_email', channel: 'EMAIL' as const, titleTemplate: 'KYC submitted', bodyTemplate: 'Your KYC application {{reference}} is under review.' },
    { slug: 'kyc_approved_inapp', channel: 'INAPP' as const, titleTemplate: 'KYC approved', bodyTemplate: 'Your KYC verification has been approved.' },
    { slug: 'kyc_approved_email', channel: 'EMAIL' as const, titleTemplate: 'KYC approved', bodyTemplate: 'Your KYC verification has been approved.' },
    { slug: 'kyc_approved_sms', channel: 'SMS' as const, titleTemplate: 'KYC approved', bodyTemplate: 'Your RupayAid KYC has been approved.' },
    { slug: 'kyc_rejected_inapp', channel: 'INAPP' as const, titleTemplate: 'KYC needs attention', bodyTemplate: 'Your KYC was rejected. {{reason}}' },
    { slug: 'kyc_rejected_email', channel: 'EMAIL' as const, titleTemplate: 'KYC needs attention', bodyTemplate: 'Your KYC was rejected. {{reason}}' },
    { slug: 'kyc_rejected_sms', channel: 'SMS' as const, titleTemplate: 'KYC needs attention', bodyTemplate: 'Your RupayAid KYC needs attention. {{reason}}' },
    { slug: 'loan_submitted_inapp', channel: 'INAPP' as const, titleTemplate: 'Loan application submitted', bodyTemplate: 'Application {{applicationNumber}} was submitted.' },
    { slug: 'loan_submitted_email', channel: 'EMAIL' as const, titleTemplate: 'Loan application submitted', bodyTemplate: 'Application {{applicationNumber}} was submitted.' },
    { slug: 'loan_approved_inapp', channel: 'INAPP' as const, titleTemplate: 'Loan approved', bodyTemplate: 'Application {{applicationNumber}} has been approved.' },
    { slug: 'loan_approved_email', channel: 'EMAIL' as const, titleTemplate: 'Loan approved', bodyTemplate: 'Application {{applicationNumber}} has been approved.' },
    { slug: 'loan_approved_sms', channel: 'SMS' as const, titleTemplate: 'Loan approved', bodyTemplate: 'Your RupayAid loan {{applicationNumber}} has been approved.' },
    { slug: 'loan_rejected_inapp', channel: 'INAPP' as const, titleTemplate: 'Loan application update', bodyTemplate: 'Application {{applicationNumber}} was rejected. {{reason}}' },
    { slug: 'loan_rejected_email', channel: 'EMAIL' as const, titleTemplate: 'Loan application update', bodyTemplate: 'Application {{applicationNumber}} was rejected. {{reason}}' },
    { slug: 'disbursement_inapp', channel: 'INAPP' as const, titleTemplate: 'Loan disbursed', bodyTemplate: '₹{{amount}} has been disbursed for {{applicationNumber}}.' },
    { slug: 'disbursement_email', channel: 'EMAIL' as const, titleTemplate: 'Loan disbursed', bodyTemplate: '₹{{amount}} has been disbursed for {{applicationNumber}}.' },
    { slug: 'disbursement_sms', channel: 'SMS' as const, titleTemplate: 'Loan disbursed', bodyTemplate: '₹{{amount}} has been disbursed for {{applicationNumber}}.' },
    { slug: 'repayment_due_inapp', channel: 'INAPP' as const, titleTemplate: 'Repayment due', bodyTemplate: 'Installment {{installmentNumber}} of ₹{{amount}} is due on {{dueDate}}.' },
    { slug: 'repayment_due_email', channel: 'EMAIL' as const, titleTemplate: 'Repayment due', bodyTemplate: 'Installment {{installmentNumber}} of ₹{{amount}} is due on {{dueDate}}.' },
    { slug: 'repayment_due_sms', channel: 'SMS' as const, titleTemplate: 'Repayment due', bodyTemplate: 'Your RupayAid installment of ₹{{amount}} is due on {{dueDate}}.' },
    { slug: 'repayment_successful_inapp', channel: 'INAPP' as const, titleTemplate: 'Repayment successful', bodyTemplate: 'We received your repayment of ₹{{amount}}.' },
    { slug: 'repayment_successful_email', channel: 'EMAIL' as const, titleTemplate: 'Repayment successful', bodyTemplate: 'We received your repayment of ₹{{amount}}.' },
    { slug: 'repayment_successful_sms', channel: 'SMS' as const, titleTemplate: 'Repayment successful', bodyTemplate: 'Your RupayAid repayment of ₹{{amount}} was successful.' },
    { slug: 'payment_failed_inapp', channel: 'INAPP' as const, titleTemplate: 'Payment failed', bodyTemplate: 'Your payment of ₹{{amount}} could not be completed.' },
    { slug: 'payment_failed_sms', channel: 'SMS' as const, titleTemplate: 'Payment failed', bodyTemplate: 'Your RupayAid payment of ₹{{amount}} failed. Please try again.' },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { slug: t.slug },
      create: { ...t, isActive: true },
      update: {},
    });
  }

  console.log('  ✓ notification templates');

  // ──────────────────────────────────────────────────────────────
  // 8. System Settings (non-secret)
  // ──────────────────────────────────────────────────────────────

  const settings = [
    { key: 'kyc.required_for_loan', value: true, type: 'bool', description: 'KYC must be approved before loan submission' },
    { key: 'loan.max_active_per_customer', value: 1, type: 'int', description: 'Max active loans per customer' },
    { key: 'loan.default_grace_period_days', value: 5, type: 'int', description: 'Grace period before penalty' },
    { key: 'payment.gateway.default', value: 'razorpay', type: 'string', description: 'Default payment gateway' },
    { key: 'referral.reward_amount', value: 500, type: 'decimal', description: 'Referral reward in INR' },
    { key: 'platform.name', value: 'RupayAid', type: 'string', description: 'Platform brand name' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      create: { ...s, scope: 'global', isEncrypted: false },
      update: {},
    });
  }

  console.log('  ✓ 6 system settings');

  // ──────────────────────────────────────────────────────────────
  // 9. KYC Application for first customer
  // ──────────────────────────────────────────────────────────────

  if (customers.length > 0) {
    const cust = customers[0];
    const kyc = await prisma.kycApplication.create({
      data: {
        userId: cust.id,
        status: 'APPROVED',
        referenceCode: `KYC-2025-${String(1).padStart(6, '0')}`,
        submittedAt: new Date('2025-01-15'),
        reviewedAt: new Date('2025-01-16'),
        reviewedBy: underwriterUser.id,
        notes: 'All documents verified',
        details: {
          create: {
            dateOfBirth: new Date('1994-03-12'),
            gender: 'FEMALE',
            fatherOrSpouseName: 'Imran Khan',
            maritalStatus: 'SINGLE',
            addressLine1: '12 MG Road',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560001',
            panLastFour: '1234',
            aadhaarLastFour: '6789',
            idDocumentType: 'AADHAAR_CARD',
            accountHolderName: 'Aisha Khan',
            accountLastFour: '4321',
            ifsc: 'HDFC0001234',
            bankName: 'HDFC Bank',
            accountType: 'SAVINGS',
          },
        },
      },
    });

    await prisma.kycDocument.create({
      data: {
        kycApplicationId: kyc.id,
        documentType: 'AADHAAR_CARD',
        status: 'VERIFIED',
        fileStorageKey: `kyc/${cust.id}/${kyc.id}/001-aadhaar.pdf`,
        fileUrl: null,
        mimeType: 'application/pdf',
        fileSizeBytes: 204800,
        fileSha256: 'abcdef1234567890',
        uploadedById: cust.id,
      },
    });

    await prisma.kycVerificationDecisionRecord.create({
      data: {
        kycApplicationId: kyc.id,
        decision: 'AUTO_ACCEPTED',
        reason: 'Aadhaar verified via DigiLocker',
        reviewedById: underwriterUser.id,
        confidence: 98.5,
        providerUsed: 'digilocker',
      },
    });

    console.log('  ✓ KYC application for first customer');
  }

  // ──────────────────────────────────────────────────────────────
  // 10. Demo Loan Application
  // ──────────────────────────────────────────────────────────────

  if (customers.length > 0 && products.length > 0) {
    const loanProduct = await prisma.loanProduct.findUnique({ where: { code: 'PL-1L-12M' } });

    if (loanProduct) {
      const loanApp = await prisma.loanApplication.create({
        data: {
          applicationNumber: 'RA-2025-000001',
          userId: customers[0].id,
          loanProductId: loanProduct.id,
          amountRequested: 100000,
          tenureMonths: 12,
          interestRate: 0.12,
          processingFee: 1000,
          status: 'APPROVED',
          currentState: 'APPROVED',
          submittedAt: new Date('2025-02-01'),
        },
      });

      await prisma.loanApplicationStateEvent.create({
        data: {
          loanApplicationId: loanApp.id,
          fromState: 'SUBMITTED',
          toState: 'UNDER_REVIEW',
          changedByUserId: customers[0].id,
        },
      });

      await prisma.loanApplicationStateEvent.create({
        data: {
          loanApplicationId: loanApp.id,
          fromState: 'UNDER_REVIEW',
          toState: 'APPROVED',
          changedByUserId: underwriterUser.id,
          reason: 'KYC verified, income sufficient',
        },
      });

      await prisma.loanApproval.create({
        data: {
          loanApplicationId: loanApp.id,
          decision: 'APPROVED',
          approvedAmount: 100000,
          approvedTenure: 12,
          approvedInterest: 0.12,
          approvedById: underwriterUser.id,
          approvedByName: 'Ravi Kumar',
          levelApproval: 1,
          conditions: JSON.stringify({ requiresAutoDebit: true }),
        },
      });

      // Repayment schedule
      const monthlyPrincipal = Math.floor(100000 / 12);
      for (let i = 1; i <= 12; i++) {
        const interest = Math.round((100000 - monthlyPrincipal * (i - 1)) * 0.12 / 12);
        const total = monthlyPrincipal + interest;
        await prisma.repaymentSchedule.create({
          data: {
            loanApplicationId: loanApp.id,
            sequence: i,
            dueDate: new Date(2025, 2 + i, 1),
            principalPortion: monthlyPrincipal,
            interestPortion: interest,
            penaltyPortion: 0,
            totalAmount: total,
            status: i <= 3 ? 'PAID' : 'SCHEDULED',
            paidAmount: i <= 3 ? total : 0,
          },
        });
      }

      console.log('  ✓ Demo loan application + repayment schedule');
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 11. Audit log sample
  // ──────────────────────────────────────────────────────────────

  await prisma.auditLog.create({
    data: {
      actorIsAdminBoolean: true,
      actionType: 'OTHER',
      entityType: 'SystemSetting',
      entityId: 'seed',
      eventCategory: 'SYSTEM',
      changedById: adminUser.id,
      changedForUserId: null,
      severity: 'INFO',
      message: 'Database seed completed successfully',
      diffSummary: JSON.stringify({ action: 'seed_complete' }),
    },
  });

  console.log('  ✓ Sample audit log');
  console.log('\n✅ Seeding complete!');
}

const PORTAL_ADMIN_USERNAME = 'admin';

/** Idempotent Admin Portal bootstrap. Hashes the initial password; never logs it. */
async function ensurePortalAdminUser(linkedUserId: string) {
  const existingByUsername = await prisma.adminUser.findUnique({
    where: { username: PORTAL_ADMIN_USERNAME },
  });
  if (existingByUsername) {
    console.log('  ✓ Portal admin already exists (username=admin); skipping create');
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 12);

  const linked = await prisma.adminUser.findUnique({ where: { userId: linkedUserId } });
  if (linked) {
    await prisma.adminUser.update({
      where: { id: linked.id },
      data: {
        username: PORTAL_ADMIN_USERNAME,
        passwordHash,
        status: AdminUserStatus.ACTIVE,
        isSuperAdmin: true,
        level: 10,
      },
    });
    console.log('  ✓ Portal admin credentials attached to existing AdminUser');
    return;
  }

  await prisma.adminUser.create({
    data: {
      userId: linkedUserId,
      username: PORTAL_ADMIN_USERNAME,
      passwordHash,
      status: AdminUserStatus.ACTIVE,
      badge: 'SYS-001',
      isSuperAdmin: true,
      level: 10,
    },
  });
  console.log('  ✓ Portal admin created (username=admin, status=ACTIVE)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
