import { useState } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { useMyReferral } from '@/hooks/use-customer-data';
import { requireApi } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import { ScreenWrapper, Card, Button, InputField, Badge, LoadingScreen, SectionHeader } from '@/ui/components';
import { colors, font, spacing } from '@/ui/theme';

function statusVariant(status: string) {
  if (['CONVERTED', 'APPROVED', 'ACTIVE'].includes(status)) return 'success' as const;
  if (['REJECTED', 'EXPIRED'].includes(status)) return 'danger' as const;
  return 'info' as const;
}

function formatDate(d?: string | null) {
  if (!d) return '—';
  return d.slice(0, 10);
}

export default function ReferralScreen() {
  const { client: apiClient } = useAuth();
  const { data, isLoading, error, refetch } = useMyReferral();
  const [codeInput, setCodeInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  if (isLoading) return <LoadingScreen />;

  if (error || !data) {
    return (
      <ScreenWrapper>
        <Card>
          <Text style={s.body}>Unable to load your referral code.</Text>
          <Button title="Retry" variant="outline" onPress={() => void refetch()} style={{ marginTop: 12 }} />
        </Card>
      </ScreenWrapper>
    );
  }

  const shareUrl = data.code ? `https://rupayaid.com/login?ref=${data.code}` : '';

  async function handleShare() {
    if (!data?.code) return;
    try {
      await Share.share({
        message: `Use my RupayAid referral code ${data.code}\n${shareUrl}`,
      });
    } catch {
      // user cancelled
    }
  }

  async function validateCode() {
    const trimmed = codeInput.trim().toUpperCase();
    if (!/^RAP-[A-Za-z0-9]{8}$/i.test(trimmed)) {
      setCheckResult('Enter a code like RAP-ABCD2345');
      return;
    }
    setChecking(true);
    setCheckResult(null);
    try {
      const result = await requireApi(
        apiClient.post<{ valid: boolean; reason?: string }>('/referrals/validate', { code: trimmed }),
      );
      if (result.valid) {
        setCheckResult('This referral code is valid.');
      } else {
        const reason = result.reason;
        if (reason === 'self') setCheckResult('You cannot use your own referral code.');
        else if (reason === 'limit') setCheckResult('This code cannot accept more referrals.');
        else setCheckResult('That referral code is not valid.');
      }
    } catch (e: any) {
      setCheckResult(e.message || 'Could not check that code');
    } finally {
      setChecking(false);
    }
  }

  return (
    <ScreenWrapper>
      <SectionHeader title="Referrals" />
      <Text style={s.subtitle}>Share your unique code when someone opens a RupayAid account.</Text>

      <Card>
        <Text style={s.label}>YOUR CODE</Text>
        <Text style={s.code} selectable>{data.code || '—'}</Text>
        {data.code ? <Text style={s.hint}>Long-press the code to copy.</Text> : null}
        {data.codeCreatedAt && <Text style={s.date}>Created {formatDate(data.codeCreatedAt)}</Text>}
        <Button title="Share invite" onPress={handleShare} disabled={!data.code} style={{ marginTop: spacing.md }} />
      </Card>

      <Card>
        <Text style={s.cardTitle}>Check a referral code</Text>
        <Text style={s.cardDesc}>Confirm a code before someone uses it at sign-in.</Text>
        <InputField
          label="Code"
          value={codeInput}
          onChangeText={setCodeInput}
          placeholder="RAP-ABCD2345"
          autoCapitalize="characters"
        />
        <Button title={checking ? 'Checking...' : 'Validate'} variant="outline" onPress={validateCode} loading={checking} />
        {checkResult && <Text style={s.checkResult}>{checkResult}</Text>}
      </Card>

      {data.referredBy && (
        <Card>
          <Text style={s.cardTitle}>You joined with a referral</Text>
          <Text style={s.cardDesc}>
            {data.referredBy.firstName} {data.referredBy.lastName} · {formatDate(data.referredBy.acceptedAt)}
          </Text>
          <Badge text={data.referredBy.status.replace(/_/g, ' ')} variant={statusVariant(data.referredBy.status)} />
        </Card>
      )}

      <Card>
        <Text style={s.cardTitle}>Referral history</Text>
        <Text style={s.cardDesc}>
          {data.referredCount} sign-up{data.referredCount === 1 ? '' : 's'} with your code
        </Text>
        {data.referred.length === 0 ? (
          <Text style={s.empty}>No one has used your code yet.</Text>
        ) : (
          data.referred.map((row, i) => (
            <View key={`${row.createdAt}-${i}`} style={s.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.historyName}>{row.firstName} {row.lastName}</Text>
                <Text style={s.date}>{formatDate(row.createdAt)}</Text>
              </View>
              <Badge text={row.status.replace(/_/g, ' ')} variant={statusVariant(row.status)} />
            </View>
          ))
        )}
      </Card>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 16, lineHeight: 18 },
  body: { fontSize: 14, color: colors.textSecondary },
  label: { fontSize: 11, color: colors.textMuted, ...font.medium, textTransform: 'uppercase', letterSpacing: 0.5 },
  code: { fontSize: 24, color: colors.textPrimary, ...font.bold, fontFamily: 'monospace', letterSpacing: 2, marginVertical: 8 },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  date: { fontSize: 12, color: colors.textMuted },
  buttonRow: { flexDirection: 'row', marginTop: spacing.md },
  cardTitle: { fontSize: 16, color: colors.textPrimary, ...font.semibold, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 12, lineHeight: 18 },
  checkResult: { fontSize: 13, color: colors.textSecondary, marginTop: 12 },
  empty: { fontSize: 13, color: colors.textMuted },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  historyName: { fontSize: 14, color: colors.textPrimary, ...font.medium },
});
