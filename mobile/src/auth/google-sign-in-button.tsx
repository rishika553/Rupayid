import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from './auth-context';

WebBrowser.maybeCompleteAuthSession();

interface Props {
  disabled?: boolean;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}

export function GoogleSignInButton({ disabled, onError, onBusyChange }: Props) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: webClientId,
    iosClientId: iosClientId || undefined,
    androidClientId: androidClientId || undefined,
  });

  const finish = (err?: string) => {
    if (!mounted.current) return;
    if (err) onError(err);
    setLoading(false);
    pending.current = false;
    onBusyChange(false);
  };

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = (response.params as { id_token?: string } | undefined)?.id_token;
      if (!idToken) {
        finish('Google did not return a sign-in token. Please try again.');
        return;
      }
      void signInWithGoogle(idToken)
        .then(() => finish())
        .catch((e: unknown) => finish(e instanceof Error ? e.message : 'Google sign-in failed.'));
    } else if (response.type === 'error') {
      finish(response.error?.message || 'Google sign-in failed.');
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      finish();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  async function handlePress() {
    if (disabled || pending.current || loading) return;
    if (!webClientId) {
      onError('Google sign-in is not configured. Please use email sign-in.');
      return;
    }
    if (!request) return;
    pending.current = true;
    setLoading(true);
    onBusyChange(true);
    onError('');
    try {
      await promptAsync();
    } catch (e) {
      finish(e instanceof Error ? e.message : 'Could not open Google sign-in.');
    }
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: Boolean(disabled || loading || !request), busy: loading }}
      style={[styles.button, (disabled || loading || !request) && styles.disabled]}
      disabled={disabled || loading || !request}
      onPress={() => void handlePress()}
      activeOpacity={0.8}
    >
      {loading ? <ActivityIndicator color="#4285F4" /> : <Text style={styles.logo} accessible={false}>G</Text>}
      <Text style={styles.label}>{loading ? 'Connecting to Google…' : 'Continue with Google'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DADCE0', borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 14, marginVertical: 8 },
  disabled: { opacity: 0.6 },
  logo: { color: '#4285F4', fontSize: 22, fontWeight: '700' },
  label: { color: '#334155', fontSize: 16, fontWeight: '500' },
});
