import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenWrapper, Card, SectionHeader } from '@/ui/components';
import { colors, font, spacing } from '@/ui/theme';

const SECTIONS = [
  {
    id: 'terms',
    title: 'Terms and Conditions',
    content:
      'RupayAid provides technology to request, review, and manage personal loan applications in India. Using the app means you agree to these terms.\n\nLoan approval is not guaranteed. Eligibility, amount, tenure, and disbursement depend on verification, underwriting, and applicable law. You must provide accurate information and keep your login details private.\n\nRupayAid will never ask for your OTP, PIN, or CVV. Report suspicious contact immediately.',
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    content:
      'We collect account details, KYC documents, loan and repayment data, and technical logs needed to operate the service. This information is used for identity verification, eligibility, disbursement, collections, fraud prevention, and legal compliance.\n\nDocuments are stored with access controls. We do not sell personal data. You can review or update profile information from your account after sign-in.',
  },
  {
    id: 'fees',
    title: 'Fees, Cancellation & Refund',
    content:
      'Quoted processing fees and interest appear on your application before you submit. The first 100 customers have no platform fee. Planned pricing is a ₹365 platform fee plus a ₹999 verification fee, subject to applicable terms at the time of application.\n\nYou may withdraw a draft application at any time. After disbursement, cancellation and refunds follow the repayment schedule agreed with you.',
  },
  {
    id: 'disclaimer',
    title: 'Financial Services Disclaimer',
    content:
      'RupayAid is not a bank. Information on this app is for general guidance and does not constitute financial advice. Borrowing involves repayment obligations. Consider whether a loan is suitable before you apply.',
  },
  {
    id: 'grievance',
    title: 'Grievance Redressal',
    content:
      'If something goes wrong, write to hello@rupayaid.com or call +91 93849 46499. Share your registered email and application number so we can look up your case.\n\nWe aim to acknowledge complaints promptly and keep you informed until they are closed.',
  },
];

export default function LegalScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <ScreenWrapper>
      <SectionHeader title="Legal & Policies" />
      {SECTIONS.map((section) => (
        <TouchableOpacity
          key={section.id}
          activeOpacity={0.7}
          onPress={() => setExpanded(expanded === section.id ? null : section.id)}
        >
          <Card>
            <View style={s.row}>
              <Text style={s.title}>{section.title}</Text>
              <Text style={s.arrow}>{expanded === section.id ? '▲' : '▼'}</Text>
            </View>
            {expanded === section.id && (
              <Text style={s.content}>{section.content}</Text>
            )}
          </Card>
        </TouchableOpacity>
      ))}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, color: colors.textPrimary, ...font.semibold, flex: 1 },
  arrow: { fontSize: 12, color: colors.textMuted, marginLeft: 8 },
  content: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: spacing.md },
});
