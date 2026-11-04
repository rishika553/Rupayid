import * as Linking from 'expo-linking';

export const LINKING_PREFIX = Linking.createURL('/');

export function parseResetPasswordToken(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('token');
  } catch {
    return null;
  }
}
