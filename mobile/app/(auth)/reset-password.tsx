import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Link } from 'expo-router';
import { apiClient, requireApi } from '@/api/client';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('This reset link is missing a token. Request a new one.');
      return;
    }
    setLoading(true);
    try {
      await requireApi(apiClient.post('/auth/reset-password', { token, password }));
      router.replace('/(auth)/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.brand}>RupayAid</Text>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>Choose a password with at least 8 characters.</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <Text style={styles.label}>New password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            placeholder="New password"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            placeholder="Confirm password"
            placeholderTextColor="#94A3B8"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update password</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.linkWrap}>
              <Text style={styles.link}>Back to sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FD' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { marginBottom: 32, alignItems: 'center' },
  brand: { fontSize: 28, fontWeight: '700', color: '#0866D9', letterSpacing: 0.5, marginBottom: 8 },
  title: { fontSize: 16, color: '#64748B' },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  error: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    overflow: 'hidden',
  },
  form: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE8F7',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#172554',
  },
  button: {
    backgroundColor: '#0866D9',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  linkWrap: { alignItems: 'center', marginTop: 12 },
  link: { color: '#0866D9', fontSize: 14 },
});
