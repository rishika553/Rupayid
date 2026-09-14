'use client';

import { PageHeader } from '@/components/ui/feedback';
import { LoanApplyForm } from '@/components/loans/loan-apply-form';

export default function ApplyIndexPage() {
  return (
    <div>
      <PageHeader
        title="Apply for a loan"
        description="Enter the required loan details and submit your application."
      />
      <LoanApplyForm />
    </div>
  );
}
