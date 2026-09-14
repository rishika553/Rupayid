'use client';

import { Button } from '@rupayaid/ui';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/feedback';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarkNotificationRead, useMyNotifications } from '@/hooks/use-customer-data';
import { formatDateTime, statusLabel } from '@/lib/format';
import { useToast } from '@/components/ui/toaster';
import { cn } from '@rupayaid/ui';

export default function NotificationsPage() {
  const { toast } = useToast();
  const query = useMyNotifications();
  const markRead = useMarkNotificationRead();

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (query.error) {
    return <ErrorState message="Unable to load alerts." onRetry={() => void query.refetch()} />;
  }

  const items = Array.isArray(query.data?.data) ? query.data.data : [];

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Account, KYC, loan, and repayment updates."
      />
      {items.length === 0 ? (
        <EmptyState title="No notifications" description="You will see EMI reminders and status updates here." />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                'rounded-lg border p-4',
                item.isRead ? 'bg-card' : 'border-primary/30 bg-primary/5',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.title || 'Update'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="info">{statusLabel(item.type)}</Badge>
                  {!item.isRead ? <Badge tone="warning">Unread</Badge> : <Badge>Read</Badge>}
                </div>
              </div>
              {!item.isRead ? (
                <Button
                  className="mt-3"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void markRead.mutateAsync(item.id).then(
                      () => toast({ title: 'Marked as read' }),
                      (error: unknown) =>
                        toast({
                          title: 'Could not update',
                          description: error instanceof Error ? error.message : 'Try again',
                          variant: 'destructive',
                        }),
                    );
                  }}
                >
                  Mark read
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
