import { Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { colors, font, radius } from '@/ui/theme';
interface Props {
  referralCode?: string;
  disabled?: boolean;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}

// Some Expo Go runtimes omit ExpoApplication. Defer loading Google's provider
// so an optional sign-in method cannot prevent email login or registration.
export function GoogleSignInButton(props: Props) {
  const nativeReady =
    Platform.OS === 'web' || Boolean(requireOptionalNativeModule('ExpoApplication'));
  const configured =
    Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()) &&
    (Platform.OS === 'web' ||
      Boolean(
        Platform.OS === 'ios'
          ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim()
          : process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim(),
      ));
  if (nativeReady && configured) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Provider = require('./google-sign-in-provider').GoogleSignInProvider;
    return <Provider {...props} />;
  }
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
      accessibilityState={{ disabled: props.disabled }}
      disabled={props.disabled}
      style={[s.button, props.disabled && { opacity: 0.5 }]}
      onPress={() =>
        props.onError(
          nativeReady
            ? 'Google sign-in is not configured for this device. Please use email sign-in.'
            : 'Google sign-in is unavailable in this Expo Go preview. Please use email sign-in.',
        )
      }
    >
      <Text style={s.logo}>G</Text>
      <Text style={s.label}>Continue with Google</Text>
    </TouchableOpacity>
  );
}
const s = StyleSheet.create({
  button: {
    minHeight: 52,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    marginVertical: 8,
  },
  logo: { color: colors.primary, fontSize: 22, ...font.bold },
  label: { color: colors.textPrimary, fontSize: 16, ...font.medium },
});
