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
import * as Clipboard from 'expo-clipboard';
import { clearAllData } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { useIdentity } from '../context/IdentityContext';

export default function SettingsScreen({ navigation }) {
  const { user, signOut, refreshProfile } = useAuth();
  const { identity, linking, error: identityError } = useIdentity();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const walletDid = identity?.did || '';
  const identitySubtitle = walletDid
    ? (identityError ? `Sync issue: ${identityError}` : linking ? 'Syncing DID with your account...' : `${walletDid.slice(0, 30)}...`)
    : 'Import your .wpkeystore to link a DID';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
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
          },
        },
      ]
    );
  };

  const handleManageIdentity = () => {
    navigation.navigate('IdentityImport');
  };

  const handleExportDID = async () => {
    if (!walletDid) {
      Alert.alert('No DID', 'Import your wallet identity first.');
      return;
    }
    Alert.alert('Wallet DID', walletDid, [
      {
        text: 'Copy',
        onPress: async () => {
          await Clipboard.setStringAsync(walletDid);
        },
      },
      { text: 'Manage', onPress: handleManageIdentity },
      { text: 'Close', style: 'cancel' },
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
            onPress={() => navigation.navigate('Profile')}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            title="Wallet Identity"
            subtitle={identitySubtitle}
            onPress={handleManageIdentity}
          />
          <SettingItem
            icon="add-circle-outline"
            title="Create New Identity"
            subtitle="Generate a new DID"
            onPress={() => navigation.navigate('IdentityCreate')}
          />
          <SettingItem
            icon="key-outline"
            title="Decentralized ID (DID)"
            subtitle={walletDid ? `${walletDid.slice(0, 30)}...` : 'No DID created'}
            onPress={handleExportDID}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          <SettingItem
            icon="shield-half-outline"
            title="Two-Factor Authentication"
            subtitle="Add extra security to your account"
            onPress={() => navigation.navigate('TwoFactor')}
          />
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
        <Text style={styles.sectionTitle}>Payments</Text>
        <View style={styles.card}>
          <SettingItem
            icon="receipt-outline"
            title="Transaction History"
            subtitle="View all your payments"
            onPress={() => navigation.navigate('Transactions')}
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
