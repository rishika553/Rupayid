import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMyLoans } from '@/hooks/use-customer-data';
import {
  ScreenWrapper,
  Card,
  Badge,
  LoadingScreen,
  EmptyState,
  SectionHeader,
  ErrorState,
  StatTile,
} from '@/ui/components';
import { colors, font, spacing } from '@/ui/theme';
import { formatInr, formatDate } from '@/lib/format';

export default function ApplicationsScreen() {
  const router = useRouter();
  const { data: applications, isLoading, error, refetch } = useMyLoans();

  if (isLoading) return <LoadingScreen />;

  if (error) {
    return (
      <ScreenWrapper>
        <SectionHeader title="Your applications" />
        <ErrorState message="Unable to load applications." onRetry={() => void refetch()} />
      </ScreenWrapper>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <ScreenWrapper>
        <SectionHeader title="Your applications" />
        <EmptyState
          title="No applications yet"
          description="Browse products and apply to see your applications here."
          actionTitle="Browse loan products"
          onAction={() => router.push('/(app)/loans')}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <SectionHeader
        title="Your applications"
        subtitle="Track every application through disbursement."
      />
      {applications.map((app) => {
        const variant =
          app.status === 'APPROVED'
            ? ('success' as const)
            : app.status === 'REJECTED'
              ? ('danger' as const)
              : app.status === 'DRAFT'
                ? ('neutral' as const)
                : ('info' as const);

        return (
          <Card
            key={app.id}
            onPress={() =>
              app.status === 'DRAFT'
                ? router.push('/(app)/loans/apply')
                : router.push(`/(app)/loans/${app.id}`)
            }
          >
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.appNumber}>{app.applicationNumber}</Text>
                <Text style={s.productName}>{app.loanProduct?.name ?? 'Loan'}</Text>
              </View>
              <Badge text={app.status.replace(/_/g, ' ')} variant={variant} />
            </View>
            <View style={[s.row, { marginTop: spacing.sm }]}>
              <StatTile label="Amount" value={formatInr(app.amountRequested)} />
              <StatTile label="Tenure" value={`${app.tenureMonths} mo`} />
            </View>
            {app.submittedAt ? (
              <Text style={s.date}>Submitted {formatDate(app.submittedAt)}</Text>
            ) : null}
          </Card>
        );
      })}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  appNumber: { fontSize: 12, color: colors.textMuted, ...font.medium },
  productName: { fontSize: 14, color: colors.textPrimary, ...font.semibold },
  amount: { fontSize: 16, color: colors.textPrimary, ...font.bold },
  meta: { fontSize: 13, color: colors.textSecondary },
  date: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 16, lineHeight: 18 },
  body: { fontSize: 14, color: colors.textSecondary },
});
