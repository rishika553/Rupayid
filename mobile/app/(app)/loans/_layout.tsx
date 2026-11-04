import { Stack } from 'expo-router';
import { colors } from '@/ui/theme';

export default function LoansLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: { fontWeight: '600', color: colors.textPrimary },
        headerTintColor: colors.primary,
      }}
    />
  );
}
