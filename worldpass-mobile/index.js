import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';

// Polyfill for setCustomSourceTransformer issue in React Native 0.81.5
if (typeof global !== 'undefined' && typeof require !== 'undefined') {
  try {
    // @ts-ignore - This is a polyfill for React Native compatibility
    const resolveAssetSource = require('react-native/Libraries/Image/resolveAssetSource').default;
    if (resolveAssetSource && typeof resolveAssetSource.setCustomSourceTransformer !== 'function') {
      resolveAssetSource.setCustomSourceTransformer = () => {};
    }
  } catch (e) {
    // Silently fail if module not available
    console.log('Polyfill not needed:', e.message);
  }
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
