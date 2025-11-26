import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { getDID, clearAllData } from '../lib/storage';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen() {
  const { user, signOut, refreshProfile } = useAuth();
  const [did, setDid] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userDid = await getDID();
      setDid(userDid);

      await refreshProfile().catch(() => {});
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    } catch (error) {
      console.log('Failed to load settings:', error);
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all credentials and sign you out. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await signOut();
            Alert.alert('Success', 'All data cleared');
            setDid(null);
          },
        },
      ]
    );
  };

  const handleExportDID = () => {
    if (!did) {
      Alert.alert('No DID', 'You have not created a DID yet');
      return;
    }
    Alert.alert('Your DID', did, [
      { text: 'Copy', onPress: () => {} },
      { text: 'Close' },
    ]);
  };

  const SettingItem = ({ icon, title, subtitle, onPress, rightElement }) => (
    <TouchableOpacity style={styles.item} onPress={onPress} disabled={!onPress}>
      <View style={styles.itemLeft}>
        <Ionicons name={icon} size={24} color="#6366f1" />
        <View style={styles.itemText}>
          <Text style={styles.itemTitle}>{title}</Text>
          {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || (onPress && <Ionicons name="chevron-forward" size={20} color="#9ca3af" />)}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <SettingItem
            icon="person-circle-outline"
            title={user?.name || 'Not logged in'}
            subtitle={user?.email}
          />
          <SettingItem
            icon="key-outline"
            title="Decentralized ID (DID)"
            subtitle={did ? `${did.slice(0, 30)}...` : 'No DID created'}
            onPress={handleExportDID}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          <SettingItem
            icon="finger-print-outline"
            title="Biometric Unlock"
            subtitle={biometricAvailable ? 'Use biometrics for wallet access' : 'Not available on this device'}
            rightElement={
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                disabled={!biometricAvailable}
              />
            }
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={styles.card}>
          <SettingItem
            icon="download-outline"
            title="Backup Credentials"
            subtitle="Export your credentials"
            onPress={() => Alert.alert('Coming Soon', 'Backup feature is under development')}
          />
          <SettingItem
            icon="trash-outline"
            title="Clear All Data"
            subtitle="Remove all credentials and settings"
            onPress={handleClearData}
          />
          <SettingItem
            icon="log-out-outline"
            title="Sign Out"
            subtitle="Sign out of this device"
            onPress={signOut}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <SettingItem
            icon="information-circle-outline"
            title="Version"
            subtitle="1.0.0"
          />
          <SettingItem
            icon="globe-outline"
            title="Website"
            subtitle="worldpass.tech"
            onPress={() => {}}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemText: {
    marginLeft: 16,
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
});
