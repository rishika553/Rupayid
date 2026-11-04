import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Button, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/auth/auth-context';

export function AuthGate() {
  const { id, isReady, isAuthenticated, recoveryError, refreshUser, logout } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady || recoveryError) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(app)/dashboard');
    }
  }, [isReady, isAuthenticated, recoveryError, segments, router]);

  if (isReady && !isAuthenticated && recoveryError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text accessibilityRole="alert">{recoveryError}</Text>
        <Button title="Retry" onPress={() => void refreshUser()} />
        <Button title="Sign out" onPress={() => void logout()} />
      </View>
    );
  }

  // Redirect effects run after render; withhold protected content immediately.
  if (!isReady || (!isAuthenticated && segments[0] !== '(auth)')) {
    return null;
  }

  return <Slot key={isAuthenticated ? id : 'auth'} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <AuthGate />
    </AuthProvider>
  );
}
