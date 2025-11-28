const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  path: require.resolve('path-browserify'),
  fs: path.resolve(__dirname, 'shims/fs.js'),
  '@tokens': path.resolve(__dirname, '..', 'shared', 'design-tokens.js'),
};

config.resolver.unstable_enablePackageExports = true;

config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, '..'),
];

module.exports = config;
