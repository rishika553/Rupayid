'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ApplyProductRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/loans/apply');
  }, [router]);

  return (
    <p className="text-sm text-muted-foreground">Opening the loan application form…</p>
  );
}
