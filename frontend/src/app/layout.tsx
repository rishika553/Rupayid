import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers/app-providers';

const sans = Source_Sans_3({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'RupayAid',
  description: 'Personal loans with clear terms and careful underwriting.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={sans.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
