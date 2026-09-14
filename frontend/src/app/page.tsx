import type { Metadata } from 'next';
import { LandingPage } from '@/components/landing/landing-page';

export const metadata: Metadata = {
  title: 'RupayAid — Simple, transparent financial support',
  description:
    'RupayAid helps you navigate temporary financial needs through a simple and transparent process in India.',
};

export default function HomePage() {
  return <LandingPage />;
}
