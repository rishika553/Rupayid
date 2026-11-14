import { Tabs, useRouter } from 'expo-router';
import { AppHeader, BottomNavigation } from '@/ui/premium';
import { colors } from '@/ui/theme';

export default function AppLayout() {
  const router = useRouter();
  return (
    <Tabs
      tabBar={(props) => <BottomNavigation {...props} />}
      screenOptions={{
        sceneStyle: { backgroundColor: colors.bg },
        tabBarHideOnKeyboard: true,
        header: ({ route, options }) => (
          <AppHeader
            brand={route.name === 'dashboard'}
            title={options.title ?? route.name}
            onProfile={() => router.push('/(app)/profile')}
          />
        ),
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Home' }} />
      <Tabs.Screen name="loans" options={{ title: 'Loans', headerShown: false }} />
      <Tabs.Screen name="kyc" options={{ title: 'KYC', headerShown: false }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alerts' }} />
      {/* The custom bar filters these routes. SDK 58 href:null redirects them. */}
      <Tabs.Screen name="repayments" options={{ title: 'Repayments' }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Your profile',
          header: () => <AppHeader title="Your profile" onBack={() => router.back()} />,
        }}
      />
      <Tabs.Screen name="referral" options={{ title: 'Referrals' }} />
      <Tabs.Screen name="legal" options={{ title: 'Legal & policies' }} />
    </Tabs>
  );
}
