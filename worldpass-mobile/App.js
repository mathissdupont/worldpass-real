import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { IdentityProvider } from './src/context/IdentityContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { WalletProvider } from './src/context/WalletContext';
import { SecurityProvider } from './src/context/SecurityContext';
import SecurityGate from './src/components/SecurityGate';

function ThemedAppShell() {
  const { theme } = useTheme();
  return (
    <AuthProvider>
      <IdentityProvider>
        <WalletProvider>
          <SecurityProvider>
            <ToastProvider>
              <AppNavigator />
              <SecurityGate />
              <StatusBar
                style={theme.isDark ? 'light' : 'dark'}
                backgroundColor={theme.colors.background}
              />
            </ToastProvider>
          </SecurityProvider>
        </WalletProvider>
      </IdentityProvider>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedAppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
