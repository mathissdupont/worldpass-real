import 'react-native-get-random-values';
import { registerRootComponent } from 'expo';
import { setCustomSourceTransformer } from 'expo-asset';

// Ensure setCustomSourceTransformer exists without using deprecated deep imports
try {
  if (typeof setCustomSourceTransformer === 'function') {
    setCustomSourceTransformer(() => {});
  }
} catch (e) {
  console.log('Asset transformer polyfill skipped:', e?.message || e);
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
