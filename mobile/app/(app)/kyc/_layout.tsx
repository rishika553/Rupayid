import { Stack, useRouter } from 'expo-router';
import { AppHeader } from '@/ui/premium';
import { colors } from '@/ui/theme';
export default function Layout() {
  const router = useRouter();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.bg },
        header: ({ options, back }) => (
          <AppHeader
            title={options.title}
            onBack={back ? () => router.back() : undefined}
            onProfile={() => router.push('/(app)/profile')}
          />
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'KYC Verification' }} />
      <Stack.Screen name="documents" options={{ title: 'Your documents' }} />
      <Stack.Screen name="review" options={{ title: 'Review & submit' }} />
      <Stack.Screen name="status" options={{ title: 'Verification status' }} />
    </Stack>
  );
}
