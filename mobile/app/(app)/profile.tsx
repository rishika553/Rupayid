import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { useCustomerProfile, useUpdateCustomerProfile } from '@/hooks/use-customer-data';
import { ScreenWrapper, Card, Button, InputField, LoadingScreen, Badge, SectionHeader } from '@/ui/components';
import { colors, font, spacing, radius } from '@/ui/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { data: profile, isLoading } = useCustomerProfile();
  const updateProfile = useUpdateCustomerProfile();
  const [editing, setEditing] = useState(false);

  const confirmLogout = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  const form = useForm({
    defaultValues: {
      firstName: '', lastName: '', phoneNumber: '', occupation: '',
      addressLine1: '', addressLine2: '', city: '', state: '', pincode: '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.personal.firstName || '',
        lastName: profile.personal.lastName || '',
        phoneNumber: profile.contact.phoneNumber || '',
        occupation: profile.personal.occupation || '',
        addressLine1: profile.address.addressLine1 || '',
        addressLine2: profile.address.addressLine2 || '',
        city: profile.address.city || '',
        state: profile.address.state || '',
        pincode: profile.address.pincode || '',
      });
    }
  }, [profile]);

  const handleSave = form.handleSubmit(async (values) => {
    try {
      const body: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v?.trim()) body[k] = v.trim();
      }
      await updateProfile.mutateAsync(body);
      setEditing(false);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update profile');
    }
  });

  if (isLoading) return <LoadingScreen />;
  if (!profile) return <ScreenWrapper><Card><Text>Could not load profile.</Text></Card></ScreenWrapper>;

  return (
    <ScreenWrapper>
      <Card>
        <View style={s.headerRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {(profile.personal.firstName?.[0] || 'U').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{profile.personal.firstName} {profile.personal.lastName}</Text>
            <Text style={s.email}>{profile.contact.email}</Text>
          </View>
        </View>
        <View style={s.badges}>
          <Badge text={profile.account.status} variant={profile.account.status === 'ACTIVE' ? 'success' : 'neutral'} />
          <Badge text={`KYC: ${profile.kyc.status.replace(/_/g, ' ')}`} variant={profile.kyc.completed ? 'success' : 'info'} />
        </View>
        {profile.account.memberSince && (
          <Text style={s.meta}>Member since {profile.account.memberSince.slice(0, 10)}</Text>
        )}
      </Card>

      {!editing ? (
        <>
          <SectionHeader title="Personal" action={{ label: 'Edit', onPress: () => setEditing(true) }} />
          <Card>
            <ProfileRow label="Phone" value={profile.contact.phoneNumber} />
            <ProfileRow label="DOB" value={profile.personal.dateOfBirth?.slice(0, 10)} />
            <ProfileRow label="Gender" value={profile.personal.gender} />
            <ProfileRow label="Occupation" value={profile.personal.occupation} />
            <ProfileRow label="Marital Status" value={profile.personal.maritalStatus} />
          </Card>

          <SectionHeader title="Address" />
          <Card>
            <ProfileRow label="Address" value={[profile.address.addressLine1, profile.address.addressLine2].filter(Boolean).join(', ')} />
            <ProfileRow label="City" value={profile.address.city} />
            <ProfileRow label="State" value={profile.address.state} />
            <ProfileRow label="Pincode" value={profile.address.pincode} />
          </Card>

          {profile.account.panLastFour || profile.account.bankName ? (
            <>
              <SectionHeader title="Identity & Bank" />
              <Card>
                {profile.account.panLastFour && <ProfileRow label="PAN" value={`****${profile.account.panLastFour}`} />}
                {profile.account.aadhaarLastFour && <ProfileRow label="Aadhaar" value={`****${profile.account.aadhaarLastFour}`} />}
                {profile.account.bankName && <ProfileRow label="Bank" value={profile.account.bankName} />}
                {profile.account.accountLastFour && <ProfileRow label="Account" value={`****${profile.account.accountLastFour}`} />}
                {profile.account.identityLocked && <Text style={s.locked}>Identity details are locked after KYC approval</Text>}
              </Card>
            </>
          ) : null}

          <SectionHeader title="More" />
          <Card>
            <Button title="Referrals" variant="ghost" onPress={() => router.push('/(app)/referral' as any)} />
            <Button title="Legal & Policies" variant="ghost" onPress={() => router.push('/(app)/legal' as any)} />
          </Card>

          <Button title="Sign out" variant="danger" onPress={confirmLogout} style={{ marginTop: spacing.xl }} />
        </>
      ) : (
        <>
          <SectionHeader title="Edit Profile" action={{ label: 'Cancel', onPress: () => setEditing(false) }} />
          <Card>
            <Controller name="firstName" control={form.control} render={({ field }) => (
              <InputField label="First Name" value={field.value} onChangeText={field.onChange} />
            )} />
            <Controller name="lastName" control={form.control} render={({ field }) => (
              <InputField label="Last Name" value={field.value} onChangeText={field.onChange} />
            )} />
            <Controller name="phoneNumber" control={form.control} render={({ field }) => (
              <InputField label="Phone" value={field.value} onChangeText={field.onChange} keyboardType="phone-pad" />
            )} />
            <Controller name="occupation" control={form.control} render={({ field }) => (
              <InputField label="Occupation" value={field.value} onChangeText={field.onChange} />
            )} />
            <Controller name="addressLine1" control={form.control} render={({ field }) => (
              <InputField label="Address Line 1" value={field.value} onChangeText={field.onChange} />
            )} />
            <Controller name="addressLine2" control={form.control} render={({ field }) => (
              <InputField label="Address Line 2" value={field.value} onChangeText={field.onChange} />
            )} />
            <Controller name="city" control={form.control} render={({ field }) => (
              <InputField label="City" value={field.value} onChangeText={field.onChange} />
            )} />
            <Controller name="state" control={form.control} render={({ field }) => (
              <InputField label="State" value={field.value} onChangeText={field.onChange} />
            )} />
            <Controller name="pincode" control={form.control} render={({ field }) => (
              <InputField label="Pincode" value={field.value} onChangeText={field.onChange} keyboardType="number-pad" maxLength={6} />
            )} />
            <Button title="Save Changes" onPress={handleSave} loading={updateProfile.isPending} style={{ marginTop: 8 }} />
          </Card>
        </>
      )}
    </ScreenWrapper>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={s.profileRow}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value || '—'}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.textOnPrimary, ...font.bold, fontSize: 22 },
  name: { fontSize: 18, color: colors.textPrimary, ...font.bold },
  email: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: colors.textSecondary, ...font.medium },
  rowValue: { fontSize: 13, color: colors.textPrimary, ...font.semibold, maxWidth: '60%', textAlign: 'right' },
  locked: { fontSize: 12, color: colors.warning, marginTop: 8, fontStyle: 'italic' },
});
