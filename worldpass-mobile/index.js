import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';

// Polyfill for setCustomSourceTransformer issue in React Native 0.81.5
if (typeof global !== 'undefined') {
  const resolveAssetSource = require('react-native/Libraries/Image/resolveAssetSource');
  if (resolveAssetSource && !resolveAssetSource.setCustomSourceTransformer) {
    resolveAssetSource.setCustomSourceTransformer = () => {};
  }
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
