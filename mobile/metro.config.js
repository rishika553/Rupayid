const { getDefaultConfig } = require('expo/metro-config');

// Expo 58 discovers workspace packages and hoisted dependencies automatically.
const config = getDefaultConfig(__dirname);
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList) ? existingBlockList : existingBlockList ? [existingBlockList] : []),
  /[\\/]\.dependency-backup[\\/].*/,
];

module.exports = config;
