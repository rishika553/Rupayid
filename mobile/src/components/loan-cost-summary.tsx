import { View, Text, StyleSheet } from 'react-native';
import { colors, font, radius, spacing } from '@/ui/theme';
import { formatFeeRate, formatInr, productProcessingFeeRate } from '@/lib/format';
import type { LoanApplication, LoanProduct } from '@/types';

interface Props {
  product?: LoanProduct | null;
  application?: LoanApplication | null;
  amount?: number;
  tenureMonths?: number;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function LoanCostSummary({ product, application, amount, tenureMonths }: Props) {
  const breakdown = application?.costBreakdown;
  const fee = breakdown?.processingFee ?? application?.processingFee;
  const amt = breakdown?.amount ?? application?.amountRequested ?? amount;
  const tenure = breakdown?.tenureMonths ?? application?.tenureMonths ?? tenureMonths;

  return (
    <View style={styles.card}>
      <Row label="Loan amount" value={formatInr(amt)} />
      <Row label="Tenure" value={`${tenure ?? '—'} months`} />
      <Row
        label="Fees"
        value={
          fee != null
            ? formatInr(fee)
            : product
              ? `${formatFeeRate(productProcessingFeeRate(product))} processing`
              : '—'
        }
      />
      <Row
        label="Total payable"
        value={breakdown?.totalPayable ? formatInr(breakdown.totalPayable) : '—'}
      />
      <Text style={styles.footnote}>
        Amounts and fees are provided by RupayAid. Final terms are subject to approval.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: { fontSize: 13, color: colors.textSecondary },
  value: { fontSize: 13, color: colors.textPrimary, ...font.medium },
  highlight: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderColor: colors.border },
  highlightLabel: { fontSize: 13, color: colors.textPrimary, ...font.semibold },
  highlightValue: { fontSize: 15, color: colors.primary, ...font.bold },
  footnote: { fontSize: 11, color: colors.textMuted, marginTop: 8, lineHeight: 15 },
});
