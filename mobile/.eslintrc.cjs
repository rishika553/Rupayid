module.exports = {
  root: true,
  extends: ['../packages/config/eslint.js'],
  globals: { __DEV__: 'readonly' },
  ignorePatterns: ['.expo/', 'android/', 'ios/', 'dist/'],
};
