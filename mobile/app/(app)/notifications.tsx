import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import {
  useMyNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-customer-data';
import {
  ScreenWrapper,
  Button,
  LoadingScreen,
  EmptyState,
  SectionHeader,
  ErrorState,
  PickerField,
} from '@/ui/components';
import { IconTile } from '@/ui/premium';
import { colors, font, radius } from '@/ui/theme';
function category(type: string) {
  const t = type.toUpperCase();
  return t.includes('KYC')
    ? 'KYC'
    : /PAYMENT|REPAYMENT|EMI/.test(t)
      ? 'Payments'
      : /LOAN|APPLICATION|DISBURS/.test(t)
        ? 'Loans'
        : 'Account';
}
export default function NotificationsScreen() {
  const query = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [filter, setFilter] = useState('All');
  if (query.isLoading) return <LoadingScreen />;
  const notifications = query.data?.data ?? [];
  const rows = notifications.filter(
    (n) => filter === 'All' || (filter === 'Unread' ? !n.isRead : category(n.type) === filter),
  );
  return (
    <ScreenWrapper scroll={false} style={{ padding: 0 }}>
      <FlatList
        data={query.error ? [] : rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        ListHeaderComponent={
          <>
            <SectionHeader
              title="Your notification center"
              subtitle="Stay in the loop, every step of the way."
            />
            <View style={s.header}>
              <Text style={s.count}>{query.data?.unreadCount ?? 0} unread alerts</Text>
              {!!query.data?.unreadCount && (
                <Button
                  title="Mark all read"
                  variant="ghost"
                  onPress={() => markAllRead.mutate()}
                  loading={markAllRead.isPending}
                />
              )}
            </View>
            <PickerField
              label="Filter notifications"
              value={filter}
              onChange={setFilter}
              options={['All', 'Unread', 'Loans', 'KYC', 'Payments', 'Account'].map((value) => ({
                value,
                label: value,
              }))}
            />
            {query.error && (
              <ErrorState
                message="We couldn't load your alerts."
                onRetry={() => void query.refetch()}
              />
            )}
            {(markRead.error || markAllRead.error) && (
              <ErrorState message="Couldn't mark notifications as read. Please try again." />
            )}
          </>
        }
        ListEmptyComponent={
          !query.error ? (
            <EmptyState
              title="You're all caught up"
              description={
                filter === 'All'
                  ? 'New alerts about your KYC, loans and payments will appear here.'
                  : `No ${filter.toLowerCase()} notifications in the loaded results.`
              }
            />
          ) : undefined
        }
        ListFooterComponent={
          query.data && query.data.total > notifications.length ? (
            <Text style={s.time}>
              Showing {notifications.length} of {query.data.total} notifications.
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`${item.isRead ? 'Read' : 'Unread'}: ${item.title || item.type}`}
            disabled={markRead.isPending}
            onPress={() => {
              if (!item.isRead) markRead.mutate(item.id);
            }}
            style={[s.card, !item.isRead && s.unread]}
            activeOpacity={0.75}
          >
            <IconTile
              name={
                category(item.type) === 'KYC'
                  ? 'shield-checkmark-outline'
                  : category(item.type) === 'Payments'
                    ? 'card-outline'
                    : 'notifications-outline'
              }
            />
            <View style={{ flex: 1 }}>
              <Text style={s.category}>{category(item.type)}</Text>
              <Text style={s.title}>{item.title || item.type.replace(/_/g, ' ')}</Text>
              {!!item.body && <Text style={s.body}>{item.body}</Text>}
              <Text style={s.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            {!item.isRead && <View style={s.dot} />}
          </TouchableOpacity>
        )}
      />
    </ScreenWrapper>
  );
}
const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  count: { color: colors.primary, fontSize: 13, ...font.semibold },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 10,
  },
  unread: { backgroundColor: '#EFF6FF', borderColor: '#C7DDFA' },
  category: {
    fontSize: 10,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    ...font.semibold,
    marginBottom: 5,
  },
  title: { fontSize: 14, color: colors.textPrimary, ...font.semibold },
  body: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginTop: 5 },
  time: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, marginTop: 5 },
});
