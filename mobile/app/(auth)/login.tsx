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
import { Link } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { GoogleSignInButton } from '@/auth/google-sign-in-button';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (loading || googleLoading) return;
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
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
          <Text style={styles.title}>Sign in to your account</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, (loading || googleLoading) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || googleLoading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity style={styles.linkWrap}>
              <Text style={styles.link}>Forgot password?</Text>
            </TouchableOpacity>
          </Link>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleSignInButton
            disabled={loading}
            onError={setError}
            onBusyChange={setGoogleLoading}
          />

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Create an account</Text>
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
  brand: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0866D9',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  title: { fontSize: 16, color: '#64748B' },
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#DCE8F7' },
  dividerText: { marginHorizontal: 12, color: '#94A3B8', fontSize: 14 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#DCE8F7',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: { color: '#334155', fontSize: 16, fontWeight: '500' },
});
