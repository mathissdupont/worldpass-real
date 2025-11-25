/**
 * Main App Navigation
 * Bottom tabs for Home, Credentials, and Profile screens
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import CredentialsScreen from '../screens/CredentialsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { Colors, FontSizes } from '../constants/theme';

const Tab = createBottomTabNavigator();

type Props = {
  userEmail: string;
  onLogout: () => void;
};

// Simple icon component using emoji
function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 24 }}>{emoji}</Text>;
}

export default function MainTabs({ userEmail, onLogout }: Props) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.light.panel,
          borderBottomWidth: 1,
          borderBottomColor: Colors.light.border,
        },
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: FontSizes.lg,
          color: Colors.light.text,
        },
        tabBarStyle: {
          backgroundColor: Colors.light.panel,
          borderTopWidth: 1,
          borderTopColor: Colors.light.border,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: Colors.light.brand,
        tabBarInactiveTintColor: Colors.light.muted,
        tabBarLabelStyle: {
          fontSize: FontSizes.xs,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? '🏠' : '🏡'} />
          ),
        }}
      >
        {() => <HomeScreen userEmail={userEmail} />}
      </Tab.Screen>

      <Tab.Screen
        name="Credentials"
        component={CredentialsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? '📜' : '📋'} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji={focused ? '👤' : '👥'} />
          ),
        }}
      >
        {() => <ProfileScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
