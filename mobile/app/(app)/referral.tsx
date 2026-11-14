import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Share, Pressable } from 'react-native';
import { useMyReferral } from '@/hooks/use-customer-data';
import { useReferralHistory, useReferralStatistics, useSubmitReferral } from '@/hooks/use-referrals';
import { errorMessage } from '@/lib/error-message';
import { ScreenWrapper, Card, Button, InputField, Badge, LoadingScreen, SectionHeader } from '@/ui/components';
import { GradientCard, ReferralIllustration } from '@/ui/premium';
import { colors, font, spacing } from '@/ui/theme';

export default function ReferralScreen() {
  const code = useMyReferral();
  const [page, setPage] = useState(1);
  const history = useReferralHistory(page);
  const stats = useReferralStatistics();
  const submit = useSubmitReferral();
  const busy = useRef(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function share() {
    if (!code.data?.code) return;
    try {
      await Share.share({ message: `Join RupayAid with my referral code ${code.data.code}` });
    } catch {
      setFailed(true);
      setMessage('Unable to open sharing. Please try again.');
    }
  }

  async function send() {
    if (busy.current) return;
    setFailed(true);
    const fullName = name.trim().replace(/\s+/g, ' ');
    const mobile = phone.trim().replace(/[\s()-]/g, '');
    if (fullName.length < 2 || fullName.length > 100 || !/^[\p{L}\p{M}][\p{L}\p{M} .'-]+$/u.test(fullName)) {
      setMessage('Enter the referred person’s full name (2–100 characters).'); return;
    }
    if (!/^(\+91)?[6-9]\d{9}$/.test(mobile)) {
      setMessage('Enter a valid 10-digit Indian mobile number.'); return;
    }
    if (!consent) {
      setMessage('Please obtain their permission and confirm consent before submitting.'); return;
    }
    busy.current = true;
    setMessage('');
    try {
      await submit.mutateAsync({ referredName: fullName, referredPhone: mobile, consentConfirmed: true });
      setName(''); setPhone(''); setConsent(false); setPage(1);
      setFailed(false); setMessage('Referral submitted successfully. You can track it below.');
    } catch (error) {
      setFailed(true); setMessage(errorMessage(error, 'Unable to submit referral. Please try again.'));
    } finally { busy.current = false; }
  }

  if (code.isLoading) return <LoadingScreen />;
  if (code.isError || !code.data) return <ScreenWrapper><Card>
    <Text style={s.body}>Unable to load your referral code.</Text>
    <Button title="Retry" onPress={() => void code.refetch()} />
  </Card></ScreenWrapper>;

  return <ScreenWrapper>
    <GradientCard tone="referral">
      <View style={s.row}>
        <View style={{ flex: 1 }}><Text style={s.title}>Refer a friend</Text>
          <Text style={s.body}>Help someone take their next step with RupayAid.</Text></View>
        <ReferralIllustration />
      </View>
      <Text style={s.label}>YOUR REFERRAL CODE</Text>
      <Text selectable style={s.code}>{code.data.code || 'Unavailable'}</Text>
      <Button title="Share referral code" onPress={share} disabled={!code.data.code} />
    </GradientCard>

    {stats.data ? <View style={s.row}>
      {([['Total', stats.data.total], ['Pending', stats.data.pending], ['Converted', stats.data.converted]] as const).map(([label, value]) =>
        <View key={label} style={s.stat}><Text style={s.number}>{value}</Text><Text style={s.label}>{label}</Text></View>)}
    </View> : <Card><Text style={s.body}>{stats.isError ? 'Unable to load referral counts.' : 'Loading referral counts…'}</Text>
      {stats.isError && <Button title="Retry counts" onPress={() => void stats.refetch()} />}</Card>}

    <Card>
      <SectionHeader title="Refer someone you know" />
      <Text style={s.body}>With their permission, share their name and mobile number so RupayAid can contact them about its services. Do not submit Aadhaar or documents.</Text>
      <InputField label="Full name" value={name} onChangeText={setName} maxLength={100} editable={!submit.isPending} autoCapitalize="words" />
      <InputField label="Mobile number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={20} placeholder="10-digit Indian mobile number" editable={!submit.isPending} />
      <Pressable accessibilityRole="checkbox" accessibilityLabel="Confirm contact consent" accessibilityState={{ checked: consent, disabled: submit.isPending }}
        disabled={submit.isPending} onPress={() => setConsent(!consent)} style={s.consent}>
        <Text style={s.check}>{consent ? '☑' : '☐'}</Text>
        <Text style={[s.body, { flex: 1 }]}>I confirm this person agreed to share their name and mobile number with RupayAid and be contacted about its services.</Text>
      </Pressable>
      <Button title="Submit referral" onPress={send} loading={submit.isPending} />
      {!!message && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.message, { color: failed ? colors.danger : colors.primary }]}>{message}</Text>}
    </Card>

    <Card>
      <SectionHeader title="Referral history" />
      <Text style={s.body}>Track the people you have submitted for contact.</Text>
      {history.isLoading && <Text style={s.body}>Loading referrals…</Text>}
      {history.isError && <><Text style={s.body}>Unable to load referral history.</Text><Button title="Retry history" onPress={() => void history.refetch()} /></>}
      {history.data?.data.length === 0 && <Text style={s.body}>No referrals yet.</Text>}
      {history.data?.data.map(row => <View key={row.id} style={s.historyRow}>
        <View style={{ flex: 1 }}><Text style={s.name}>{row.referredName}</Text>
          <Text style={s.body}>{row.referredPhone}</Text><Text style={s.label}>{row.createdAt.slice(0, 10)}</Text></View>
        <Badge text={row.status} variant={row.status === 'CONVERTED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'info'} />
      </View>)}
      {history.data && history.data.totalPages > 1 && <View style={s.row}>
        <Button title="Previous" variant="outline" disabled={page <= 1} onPress={() => setPage(page - 1)} />
        <Text style={s.body}>Page {page}</Text>
        <Button title="Next" variant="outline" disabled={page >= history.data.totalPages} onPress={() => setPage(page + 1)} />
      </View>}
    </Card>
    {!!code.data.referred.length && <Card><SectionHeader title="Signups using your code" />
      {code.data.referred.map((row, index) => <Text key={`${row.createdAt}-${index}`} style={s.body}>{row.firstName} {row.lastName} · {row.status}</Text>)}
    </Card>}
  </ScreenWrapper>;
}
const s = StyleSheet.create({
  title: { fontSize: 26, color: colors.textPrimary, ...font.bold },
  body: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 10 },
  label: { fontSize: 11, color: colors.textSecondary },
  code: { fontSize: 24, color: colors.primary, ...font.bold, marginVertical: spacing.md, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: colors.surface, padding: 12, borderRadius: 16, alignItems: 'center' },
  number: { fontSize: 24, color: colors.primary, ...font.bold },
  consent: { flexDirection: 'row', gap: 10, paddingVertical: 12 },
  check: { fontSize: 25, color: colors.primary },
  message: { marginTop: 12, fontSize: 14, lineHeight: 20 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderColor: colors.border, paddingVertical: 12 },
  name: { fontSize: 15, color: colors.textPrimary, ...font.semibold },
});
