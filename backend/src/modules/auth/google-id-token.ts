import { UnauthorizedException } from '@nestjs/common';

export type GoogleIdentity = {
  googleId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
};

type GoogleTokenInfo = {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  given_name?: string;
  family_name?: string;
  name?: string;
};

export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleIdentity> {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!response.ok) {
    throw new UnauthorizedException('Google sign-in failed');
  }

  const payload = (await response.json()) as GoogleTokenInfo;
  const verified = payload.email_verified === true || payload.email_verified === 'true';
  if (payload.aud !== clientId || !payload.sub || !payload.email || !verified) {
    throw new UnauthorizedException('Google sign-in failed');
  }

  const names = (payload.name || '').trim().split(/\s+/);
  return {
    googleId: payload.sub,
    email: payload.email.trim().toLowerCase(),
    emailVerified: true,
    firstName: payload.given_name?.trim() || names[0] || 'Customer',
    lastName: payload.family_name?.trim() || names.slice(1).join(' ') || 'User',
  };
}
