import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useLoanProducts, useMyLoans, useMyTrackedLoans } from '@/hooks/use-customer-data';
import {
  ScreenWrapper,
  Card,
  Button,
  Badge,
  LoadingScreen,
  SectionHeader,
  StatTile,
  EmptyState,
  ErrorState,
} from '@/ui/components';
import { GradientCard, IconTile } from '@/ui/premium';
import { colors, font } from '@/ui/theme';
import { formatInr } from '@/lib/format';
function variant(status: string) {
  return ['ACTIVE', 'DISBURSED', 'APPROVED', 'CLOSED'].includes(status)
    ? ('success' as const)
    : ['REJECTED', 'DECLINED'].includes(status)
      ? ('danger' as const)
      : ('info' as const);
}
export default function LoansScreen() {
  const router = useRouter();
  const products = useLoanProducts();
  const applications = useMyLoans();
  const tracked = useMyTrackedLoans();
  const refresh = () => {
    void products.refetch();
    void applications.refetch();
    void tracked.refetch();
  };
  if (products.isLoading && applications.isLoading) return <LoadingScreen />;
  const active = (tracked.data ?? []).filter((l) => ['ACTIVE', 'DISBURSED'].includes(l.status));
  return (
    <ScreenWrapper
      onRefresh={refresh}
      refreshing={products.isRefetching || applications.isRefetching || tracked.isRefetching}
    >
      <GradientCard>
        <Text style={s.kicker}>YOUR NEXT CHAPTER</Text>
        <Text style={s.hero}>A little support.{'\n'}More possibilities.</Text>
        <Text style={s.heroText}>
          Find a loan that fits your plans. Choose a product and apply in a few simple steps.
        </Text>
        <Button
          title="Apply for a Loan →"
          variant="outline"
          onPress={() => router.push('/(app)/loans/apply')}
          style={{ marginTop: 18 }}
        />
      </GradientCard>
      <SectionHeader title="Available loan products" subtitle="Choose what works for you" />
      {products.error ? (
        <ErrorState
          message="We couldn't load loan products."
          onRetry={() => void products.refetch()}
        />
      ) : products.isLoading ? (
        <Text>Loading products…</Text>
      ) : !products.data?.length ? (
        <EmptyState
          title="No products available"
          description="Please check back for available loan products."
        />
      ) : (
        products.data
          .filter((p) => p.isActive !== false)
          .map((p) => (
            <Card key={p.id}>
              <View style={s.row}>
                <IconTile name="wallet" />
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{p.name}</Text>
                  {p.description && <Text style={s.description}>{p.description}</Text>}
                </View>
              </View>
              <View style={s.stats}>
                <StatTile
                  label="Loan amount"
                  value={`${formatInr(p.minAmount)} – ${formatInr(p.maxAmount)}`}
                />
                <StatTile
                  label="Tenure"
                  value={`${p.minTenureMonths}–${p.maxTenureMonths} months`}
                />
              </View>
              <Button
                title="Explore & Apply →"
                onPress={() => router.push(`/(app)/loans/apply/${p.id}`)}
              />
            </Card>
          ))
      )}
      <SectionHeader title="Active loans" />
      {tracked.error ? (
        <ErrorState
          message="We couldn't load active loans."
          onRetry={() => void tracked.refetch()}
        />
      ) : tracked.isLoading ? (
        <Text>Loading active loans…</Text>
      ) : active.length ? (
        active.map((loan) => (
          <Card key={loan.id} onPress={() => router.push(`/(app)/loans/${loan.id}`)}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{loan.loanProduct?.name ?? 'Loan'}</Text>
                <Text style={s.description}>{loan.applicationNumber}</Text>
              </View>
              <Badge text={loan.status} variant="success" />
            </View>
            <View style={s.stats}>
              <StatTile label="Outstanding" value={formatInr(loan.outstandingAmount)} />
              <StatTile label="Tenure" value={`${loan.tenureMonths} months`} />
            </View>
          </Card>
        ))
      ) : (
        <EmptyState title="No active loans" description="Your disbursed loans will appear here." />
      )}
      <SectionHeader
        title="Your applications"
        action={{ label: 'View All →', onPress: () => router.push('/(app)/loans/applications') }}
      />
      {applications.error ? (
        <ErrorState
          message="We couldn't load your applications."
          onRetry={() => void applications.refetch()}
        />
      ) : applications.isLoading ? (
        <Text>Loading applications…</Text>
      ) : applications.data?.length ? (
        applications.data.map((loan) => (
          <Card
            key={loan.id}
            onPress={() =>
              loan.status === 'DRAFT'
                ? router.push('/(app)/loans/apply')
                : router.push(`/(app)/loans/${loan.id}`)
            }
          >
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{loan.loanProduct?.name ?? 'Loan application'}</Text>
                <Text style={s.description}>{loan.applicationNumber}</Text>
              </View>
              <Badge text={loan.status.replace(/_/g, ' ')} variant={variant(loan.status)} />
            </View>
            <View style={s.stats}>
              <StatTile label="Requested" value={formatInr(loan.amountRequested)} />
              <StatTile label="Tenure" value={`${loan.tenureMonths} months`} />
            </View>
            {loan.status === 'DRAFT' && (
              <Button
                title="Continue application →"
                variant="outline"
                onPress={() => router.push('/(app)/loans/apply')}
              />
            )}
          </Card>
        ))
      ) : (
        <EmptyState
          title="Your journey starts here"
          description="Explore a product above to start your first application."
        />
      )}
    </ScreenWrapper>
  );
}
const s = StyleSheet.create({
  kicker: { color: '#D6E8FF', fontSize: 11, letterSpacing: 1, ...font.semibold },
  hero: { color: 'white', fontSize: 27, lineHeight: 33, ...font.bold, marginTop: 10 },
  heroText: { color: '#DFEDFF', fontSize: 13, lineHeight: 20, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  title: { color: colors.textPrimary, fontSize: 16, ...font.semibold },
  description: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 16, paddingVertical: 18 },
});
