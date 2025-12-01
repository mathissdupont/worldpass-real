import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigator from './src/navigation/AppNavigator';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { IdentityProvider } from './src/context/IdentityContext';
import { WalletProvider } from './src/context/WalletContext';
import { SecurityProvider } from './src/context/SecurityContext';
import { ToastProvider } from './src/context/ToastContext';

import SecurityGate from './src/components/SecurityGate';

function ThemedAppShell() {
  const { theme } = useTheme();

  return (
    <>
      <AuthProvider>
        <IdentityProvider>
          <WalletProvider>
            <SecurityProvider>
              <ToastProvider>
                <AppNavigator />
                <SecurityGate />
              </ToastProvider>
            </SecurityProvider>
          </WalletProvider>
        </IdentityProvider>
      </AuthProvider>

      <StatusBar
        style={theme.isDark ? 'light' : 'dark'}
        backgroundColor={theme.colors.background}
      />
    </>
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
