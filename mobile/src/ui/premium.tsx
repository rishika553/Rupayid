import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Image,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
type BottomTabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
import { colors, font, gradients, radius, shadow } from './theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function IconTile({
  name,
  size = 24,
  success = false,
}: {
  name: IconName;
  size?: number;
  success?: boolean;
}) {
  return (
    <View style={[s.iconTile, success && { backgroundColor: colors.successSoft }]}>
      <Ionicons name={name} size={size} color={success ? colors.success : colors.primary} />
    </View>
  );
}
export function AppHeader({
  title,
  brand,
  onProfile,
  onBack,
}: {
  title?: string;
  brand?: boolean;
  onProfile?: () => void;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + 10 }]}>
      {onBack && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={s.headerButton}
        >
          <Ionicons name="arrow-back" size={23} color={colors.primary} />
        </TouchableOpacity>
      )}
      {brand && (
        <Text accessibilityElementsHidden style={s.logo}>
          R
        </Text>
      )}
      <Text style={s.headerTitle}>{brand ? 'RupayAid' : title}</Text>
      {onProfile && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={onProfile}
          style={s.headerButton}
        >
          <IconTile name="person" size={21} />
        </TouchableOpacity>
      )}
    </View>
  );
}
const tabs: Record<string, { label: string; icon: IconName; active: IconName }> = {
  dashboard: { label: 'Home', icon: 'home-outline', active: 'home' },
  loans: { label: 'Loans', icon: 'wallet-outline', active: 'wallet' },
  kyc: { label: 'KYC', icon: 'shield-checkmark-outline', active: 'shield-checkmark' },
  payments: { label: 'Payments', icon: 'card-outline', active: 'card' },
  notifications: { label: 'Alerts', icon: 'notifications-outline', active: 'notifications' },
};
export function BottomNavigation({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  if (keyboardVisible) return null;
  return (
    <View style={[s.navArea, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={s.nav}>
        {state.routes
          .filter((route) => tabs[route.name])
          .map((route) => {
            const item = tabs[route.name];
            const active = state.routes[state.index].key === route.key;
            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={item.label}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                onPress={() => {
                  const event = emitter.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!event.defaultPrevented) navigateToTab(route.key);
                }}
                style={s.navItem}
              >
                <View style={[s.navIcon, active && { backgroundColor: colors.primarySoft }]}>
                  <Ionicons
                    name={active ? item.active : item.icon}
                    size={22}
                    color={active ? colors.primary : colors.textMuted}
                  />
                </View>
                <Text style={[s.navLabel, active && { color: colors.primary, ...font.semibold }]}>
                  {item.label}
                </Text>
                <View
                  style={[
                    s.indicator,
                    { backgroundColor: active ? colors.primary : 'transparent' },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
      </View>
    </View>
  );
}
export function GradientCard({
  children,
  tone = 'primary',
  style,
}: {
  children: React.ReactNode;
  tone?: keyof typeof gradients;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        s.gradient,
        {
          backgroundColor: tone === 'primary' ? colors.primary : colors.primarySoft,
          backgroundImage: gradients[tone],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function QuickActionCard({
  label,
  icon,
  onPress,
  unread,
}: {
  label: string;
  icon: IconName;
  onPress: () => void;
  unread?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={unread ? `${label}, unread notifications` : label}
      onPress={onPress}
      style={s.quick}
      activeOpacity={0.75}
    >
      <View>
        <IconTile name={icon} />
        {unread && <View style={s.dot} />}
      </View>
      <Text style={s.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}
export function LoanIllustration() {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={s.illustration}>
      <View style={s.orbit} />
      <View style={s.paper}>
        <Text style={s.paperTitle}>Loan</Text>
        {[0, 1, 2].map((i) => (
          <View key={i} style={s.paperRow}>
            <Ionicons name="checkmark-circle" size={14} color={colors.secondary} />
            <View style={[s.line, { width: 32 - i * 5 }]} />
          </View>
        ))}
      </View>
      <View style={s.check}>
        <Ionicons name="checkmark" size={26} color="white" />
      </View>
    </View>
  );
}
export function ReferralIllustration() {
  return (
    <Image
      source={require('../../assets/referral-friends.png')}
      accessible={false}
      style={{ width: 120, height: 146, alignSelf: 'flex-end' }}
      resizeMode="contain"
    />
  );
}
export function InfoCard({
  title,
  description,
  icon = 'information-circle-outline',
}: {
  title: string;
  description: string;
  icon?: IconName;
}) {
  return (
    <View style={s.info}>
      <IconTile name={icon} />
      <View style={{ flex: 1 }}>
        <Text style={s.infoTitle}>{title}</Text>
        <Text style={s.infoText}>{description}</Text>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  header: {
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  logo: {
    color: colors.bright,
    fontSize: 32,
    fontWeight: '900',
    fontStyle: 'italic',
    lineHeight: 38,
  },
  headerTitle: { flex: 1, color: colors.textPrimary, fontSize: 21, ...font.bold },
  headerButton: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E2EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArea: { backgroundColor: colors.bg, paddingHorizontal: 12, paddingTop: 6 },
  nav: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: 7,
    ...shadow.card,
  },
  navItem: { flex: 1, alignItems: 'center', minHeight: 58, gap: 2 },
  navIcon: { paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12 },
  navLabel: { fontSize: 10, color: colors.textMuted },
  indicator: { height: 3, width: 22, borderRadius: 3, marginTop: 4 },
  gradient: {
    padding: 20,
    borderRadius: radius.lg,
    marginBottom: 16,
    overflow: 'hidden',
    ...shadow.card,
  },
  quick: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  quickLabel: { fontSize: 12, color: colors.textPrimary, ...font.medium },
  dot: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: 7,
    width: 7,
    borderRadius: 4,
    backgroundColor: '#F56363',
  },
  illustration: { width: 104, height: 140, alignSelf: 'center' },
  orbit: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FFFFFF15',
    top: 4,
    left: 0,
  },
  paper: {
    backgroundColor: '#F4FAFF',
    borderRadius: 8,
    width: 76,
    height: 103,
    position: 'absolute',
    top: 24,
    left: 10,
    padding: 11,
    transform: [{ rotate: '10deg' }],
    ...shadow.elevated,
  },
  paperTitle: {
    color: colors.primary,
    fontSize: 15,
    ...font.bold,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  paperRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 5 },
  line: { height: 3, backgroundColor: '#BBD5F5', borderRadius: 2 },
  check: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: '#11C5B0',
    borderWidth: 3,
    borderColor: '#72E0CE',
    position: 'absolute',
    bottom: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: { color: colors.textPrimary, fontSize: 14, ...font.semibold },
  infoText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
});
