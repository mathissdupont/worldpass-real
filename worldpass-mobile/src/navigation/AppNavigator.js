import React, { useMemo } from 'react';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

import WalletScreen from '../screens/WalletScreen';
import ScannerScreen from '../screens/ScannerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import IdentityImportScreen from '../screens/IdentityImportScreen';
import IdentityCreateScreen from '../screens/IdentityCreateScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TwoFactorScreen from '../screens/TwoFactorScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import VCQRScreen from '../screens/VCQRScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PresentScreen from '../screens/PresentLandingScreen';
import VerifyScreen from '../screens/VerifyScreen';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();
const WalletStack = createNativeStackNavigator();
const PresentStack = createNativeStackNavigator();
const VerifyStack = createNativeStackNavigator();

function useStackScreenOptions(theme) {
  return {
    headerStyle: { backgroundColor: theme.colors.card },
    headerTintColor: theme.colors.primary,
    headerTitleStyle: { color: theme.colors.text, fontWeight: '600' },
    contentStyle: { backgroundColor: theme.colors.background },
  };
}

function WalletStackScreen() {
  const { theme } = useTheme();
  return (
    <WalletStack.Navigator screenOptions={useStackScreenOptions(theme)}>
      <WalletStack.Screen
        name="WalletHome"
        component={WalletScreen}
        options={{ headerShown: false }}
      />
      <WalletStack.Screen
        name="VCQR"
        component={VCQRScreen}
        options={{ title: 'Share Credential' }}
      />
    </WalletStack.Navigator>
  );
}

function PresentStackScreen() {
  const { theme } = useTheme();
  return (
    <PresentStack.Navigator screenOptions={useStackScreenOptions(theme)}>
      <PresentStack.Screen
        name="PresentHome"
        component={PresentScreen}
        options={{ headerShown: false }}
      />
      <PresentStack.Screen
        name="PresentShare"
        component={VCQRScreen}
        options={{ title: 'Credential QR' }}
      />
    </PresentStack.Navigator>
  );
}

function VerifyStackScreen() {
  const { theme } = useTheme();
  return (
    <VerifyStack.Navigator screenOptions={useStackScreenOptions(theme)}>
      <VerifyStack.Screen
        name="VerifyHome"
        component={VerifyScreen}
        options={{ headerShown: false }}
      />
      <VerifyStack.Screen
        name="VerifyScanner"
        component={ScannerScreen}
        options={{ title: 'QR Scanner' }}
      />
    </VerifyStack.Navigator>
  );
}

function SettingsStackScreen() {
  const { theme } = useTheme();
  return (
    <SettingsStack.Navigator screenOptions={useStackScreenOptions(theme)}>
      <SettingsStack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <SettingsStack.Screen
        name="IdentityImport"
        component={IdentityImportScreen}
        options={{ title: 'Import Identity' }}
      />
      <SettingsStack.Screen
        name="IdentityCreate"
        component={IdentityCreateScreen}
        options={{ title: 'Create Identity' }}
      />
      <SettingsStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <SettingsStack.Screen
        name="TwoFactor"
        component={TwoFactorScreen}
        options={{ title: 'Two-Factor Authentication' }}
      />
      <SettingsStack.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: 'Transactions' }}
      />
    </SettingsStack.Navigator>
  );
}

function AppTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Wallet':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Present':
              iconName = focused ? 'color-wand' : 'color-wand-outline';
              break;
            case 'Verify':
              iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
              break;
            default:
              iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Wallet" 
        component={WalletStackScreen}
        options={{ title: 'Wallet' }}
      />
      <Tab.Screen 
        name="Present" 
        component={PresentStackScreen}
        options={{ title: 'Present' }}
      />
      <Tab.Screen 
        name="Verify" 
        component={VerifyStackScreen}
        options={{ title: 'Verify' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStackScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="IdentityImport"
        component={IdentityImportScreen}
        options={{ headerShown: true, title: 'Wallet Identity' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  const navTheme = useMemo(() => ({
    ...(theme.isDark ? NavigationDarkTheme : NavigationDefaultTheme),
    dark: theme.isDark,
    colors: {
      ...(theme.isDark ? NavigationDarkTheme.colors : NavigationDefaultTheme.colors),
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.card,
      border: theme.colors.border,
      text: theme.colors.text,
      notification: theme.colors.danger,
    },
  }), [theme]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
