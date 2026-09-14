'use client';

import { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { theme: string; size: string; text: string; width: number },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

export function GoogleSignInButton({
  onCredential,
  disabled,
}: {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || disabled) {
      return;
    }

    function render() {
      if (!window.google || !buttonRef.current) {
        return;
      }
      buttonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            onCredentialRef.current(response.credential);
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: 352,
      });
    }

    if (window.google) {
      render();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-gsi="true"]');
    if (existing) {
      existing.addEventListener('load', render);
      return () => existing.removeEventListener('load', render);
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = 'true';
    script.addEventListener('load', render);
    document.head.appendChild(script);
    return () => script.removeEventListener('load', render);
  }, [disabled]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        Google sign-in is available after adding NEXT_PUBLIC_GOOGLE_CLIENT_ID.
      </p>
    );
  }

  return <div ref={buttonRef} className="flex min-h-10 justify-center" />;
}
