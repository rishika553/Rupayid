import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function AppLayout() {
  const router = useRouter();
  const headerRight = () => (
    <TouchableOpacity
      onPress={() => router.push('/(app)/profile' as never)}
      accessibilityLabel="Open profile"
      hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
      style={{ marginRight: 12 }}
    >
      <Ionicons name="person-circle-outline" size={28} color="#0284C7" />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#F8FAFC' },
        headerTitleStyle: { fontWeight: '600', color: '#111827' },
        tabBarActiveTintColor: '#0284C7',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { borderTopColor: '#E2E8F0' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          headerRight,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Loans',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="kyc"
        options={{
          title: 'KYC',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="repayments"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="profile"
        options={{ href: null, title: 'Profile' }}
      />
      <Tabs.Screen
        name="referral"
        options={{ href: null, title: 'Referrals' }}
      />
      <Tabs.Screen
        name="legal"
        options={{ href: null, title: 'Legal' }}
      />
    </Tabs>
  );
}
