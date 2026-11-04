import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useLoanProducts, useMyLoans } from '@/hooks/use-customer-data';
import {
  ScreenWrapper,
  Card,
  Button,
  Badge,
  LoadingScreen,
  SectionHeader,
  StatTile,
} from '@/ui/components';
import { colors, font, spacing } from '@/ui/theme';
import { formatInr } from '@/lib/format';

function appVariant(status: string) {
  const s = status.toUpperCase();
  if (['APPROVED', 'ACTIVE', 'DISBURSED'].includes(s)) return 'success' as const;
  if (['REJECTED', 'DECLINED'].includes(s)) return 'danger' as const;
  if (['DRAFT'].includes(s)) return 'neutral' as const;
  return 'info' as const;
}

export default function LoansScreen() {
  const router = useRouter();
  const { data: products, isLoading: productsLoading } = useLoanProducts();
  const { data: myLoans, isLoading: loansLoading } = useMyLoans();

  if (productsLoading && loansLoading) return <LoadingScreen />;

  const active = (myLoans || []).filter((l) => l.status !== 'DRAFT');
  const limits = (products || []).reduce<{ min: number; max: number } | null>((acc, p) => {
    const min = Number(p.minAmount);
    const max = Number(p.maxAmount);
    if (!acc) return { min, max };
    return { min: Math.min(acc.min, min), max: Math.max(acc.max, max) };
  }, null);

  return (
    <ScreenWrapper>
      <Card style={styles.hero}>
        <Text style={styles.heroKicker}>RupayAid Loans</Text>
        <Text style={styles.heroTitle}>Apply for a loan</Text>
        <Text style={styles.heroDesc}>
          Fill in a few details and submit your application. KYC must be complete before we can accept it.
        </Text>
        {limits ? (
          <Text style={styles.heroMeta}>
            {formatInr(limits.min)} – {formatInr(limits.max)}
          </Text>
        ) : null}
        <Button
          title="Apply for a loan"
          variant="cta"
          onPress={() => router.push('/(app)/loans/apply')}
          style={{ marginTop: spacing.lg }}
        />
      </Card>

      {active.length > 0 ? (
        <>
          <SectionHeader
            title="Your applications"
            action={{ label: 'View all', onPress: () => router.push('/(app)/loans/applications') }}
          />
          {active.slice(0, 5).map((loan) => (
            <Card key={loan.id} onPress={() => router.push(`/(app)/loans/${loan.id}`)}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.appNumber}>{loan.applicationNumber}</Text>
                  <Text style={styles.productName}>{loan.loanProduct?.name ?? 'Loan'}</Text>
                </View>
                <Badge text={loan.status.replace(/_/g, ' ')} variant={appVariant(loan.status)} />
              </View>
              <View style={[styles.row, { marginTop: spacing.sm }]}>
                <StatTile label="Amount" value={formatInr(loan.amountRequested)} />
                <StatTile label="Tenure" value={`${loan.tenureMonths} mo`} />
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, borderColor: colors.primary },
  heroKicker: { fontSize: 11, color: '#C7E1DE', textTransform: 'uppercase', letterSpacing: 0.5, ...font.semibold },
  heroTitle: { fontSize: 22, color: colors.textOnPrimary, ...font.bold, marginTop: 4 },
  heroDesc: { fontSize: 13, color: '#D7EAE8', marginTop: 6, lineHeight: 18 },
  heroMeta: { fontSize: 13, color: '#D7EAE8', marginTop: spacing.md, ...font.medium },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  appNumber: { fontSize: 11, color: colors.textMuted, ...font.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  productName: { fontSize: 15, color: colors.textPrimary, ...font.semibold, marginTop: 2 },
});
