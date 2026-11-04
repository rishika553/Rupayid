import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useMyNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-customer-data';
import { ScreenWrapper, Button, LoadingScreen, EmptyState, SectionHeader } from '@/ui/components';
import { colors, font, spacing, radius } from '@/ui/theme';

export default function NotificationsScreen() {
  const { data, isLoading } = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  if (isLoading) return <LoadingScreen />;

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  if (notifications.length === 0) {
    return (
      <ScreenWrapper>
        <SectionHeader title="Notifications" />
        <EmptyState title="You're all caught up" description="New alerts about your KYC, loan and payments will appear here." />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scroll={false}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.unreadCount}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <Button
            title="Mark all read"
            variant="ghost"
            onPress={() => markAllRead.mutate()}
            loading={markAllRead.isPending}
            style={{ minHeight: 32, paddingHorizontal: 10, paddingVertical: 4 }}
          />
        ) : null}
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.notifCard, !item.isRead && s.unread]}
            onPress={() => {
              if (!item.isRead) markRead.mutate(item.id);
            }}
            activeOpacity={0.7}
          >
            {!item.isRead && <View style={s.dot} />}
            <View style={{ flex: 1 }}>
              {item.title ? <Text style={s.title}>{item.title}</Text> : null}
              {item.body ? <Text style={s.body}>{item.body}</Text> : null}
              <Text style={s.time}>{formatDate(item.createdAt)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </ScreenWrapper>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  unreadCount: { fontSize: 14, color: colors.textSecondary, ...font.semibold },
  notifCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  title: { fontSize: 14, color: colors.textPrimary, ...font.semibold, marginBottom: 2 },
  body: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 4 },
});
