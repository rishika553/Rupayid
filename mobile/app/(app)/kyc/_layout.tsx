import { Stack } from 'expo-router';

export default function KycLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#F8FAFC' },
        headerTitleStyle: { fontWeight: '600', color: '#111827' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'KYC' }} />
      <Stack.Screen name="documents" options={{ title: 'Documents' }} />
      <Stack.Screen name="review" options={{ title: 'Review & Submit' }} />
      <Stack.Screen name="status" options={{ title: 'KYC Status' }} />
    </Stack>
  );
}
