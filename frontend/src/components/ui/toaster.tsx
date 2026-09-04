'use client';

import * as React from 'react';
import * as Toast from '@radix-ui/react-toast';
import { cn } from '@rupayaid/ui';

type ToastItem = { id: string; title: string; description?: string; variant?: 'default' | 'destructive' };

const ToastContext = React.createContext<{
  toast: (item: Omit<ToastItem, 'id'>) => void;
} | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = crypto.randomUUID();
    setItems((current) => [...current, { ...item, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {items.map((item) => (
          <Toast.Root
            key={item.id}
            duration={4000}
            onOpenChange={(open) => {
              if (!open) {
                setItems((current) => current.filter((row) => row.id !== item.id));
              }
            }}
            className={cn(
              'fixed bottom-20 right-4 z-[60] w-[min(100%-2rem,360px)] rounded-lg border bg-card p-4 shadow-none sm:bottom-6',
              item.variant === 'destructive' && 'border-destructive text-destructive',
            )}
          >
            <Toast.Title className="text-sm font-semibold">{item.title}</Toast.Title>
            {item.description ? (
              <Toast.Description className="mt-1 text-sm text-muted-foreground">
                {item.description}
              </Toast.Description>
            ) : null}
          </Toast.Root>
        ))}
        <Toast.Viewport />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
