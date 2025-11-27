import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();
const WalletStack = createNativeStackNavigator();

function WalletStackScreen() {
  return (
    <WalletStack.Navigator>
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

function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator>
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
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Wallet') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Scanner') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Wallet" 
        component={WalletStackScreen}
        options={{ title: 'My Credentials' }}
      />
      <Tab.Screen 
        name="Scanner" 
        component={ScannerScreen}
        options={{ title: 'Scan QR' }}
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

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
