module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  return {
    ...config,
    // Android is autolinked. The non-Firebase plugin only adds the iOS URL scheme.
    plugins: [
      ...(config.plugins || []),
      '@react-native-community/datetimepicker',
      ...(iosClientId ? [[
        '@react-native-google-signin/google-signin',
        { iosUrlScheme: `com.googleusercontent.apps.${iosClientId.replace(/\.apps\.googleusercontent\.com$/, '')}` },
      ]] : []),
    ],
  };
};
