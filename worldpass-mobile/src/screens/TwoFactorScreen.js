import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { apiRequest, getToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function TwoFactorScreen({ navigation }) {
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const profile = await refreshProfile();
      setIs2FAEnabled(!!profile?.otp_enabled);
    } catch (error) {
      console.error('Failed to check 2FA status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const result = await apiRequest('/api/user/2fa/setup', {
        method: 'POST',
      });
      setSecret(result.secret);
      setOtpauthUrl(result.otpauth_url);
      setSetupMode(true);
    } catch (error) {
      console.error('2FA setup error:', error);
      setStatus({ type: 'error', message: error?.message || 'Failed to setup 2FA' });
    } finally {
      setBusy(false);
    }
  };

  const handleEnable = async () => {
    if (verificationCode.length !== 6) {
      setStatus({ type: 'error', message: 'Please enter a 6-digit code' });
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      await apiRequest('/api/user/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ secret, code: verificationCode }),
      });
      setIs2FAEnabled(true);
      setSetupMode(false);
      setVerificationCode('');
      setStatus({ type: 'success', message: '2FA enabled successfully!' });
      await refreshProfile();
    } catch (error) {
      console.error('2FA enable error:', error);
      setStatus({ type: 'error', message: error?.message || 'Invalid code. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    Alert.alert(
      'Disable 2FA',
      'Are you sure you want to disable two-factor authentication? This will make your account less secure.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            setStatus(null);
            try {
              await apiRequest('/api/user/2fa/disable', {
                method: 'POST',
              });
              setIs2FAEnabled(false);
              setStatus({ type: 'success', message: '2FA has been disabled' });
              await refreshProfile();
            } catch (error) {
              console.error('2FA disable error:', error);
              setStatus({ type: 'error', message: error?.message || 'Failed to disable 2FA' });
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const copySecret = async () => {
    await Clipboard.setStringAsync(secret);
    Alert.alert('Copied', 'Secret key copied to clipboard');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Badge */}
      <View style={styles.statusCard}>
        <View style={[styles.statusBadge, is2FAEnabled ? styles.statusEnabled : styles.statusDisabled]}>
          <Ionicons 
            name={is2FAEnabled ? 'shield-checkmark' : 'shield-outline'} 
            size={24} 
            color={is2FAEnabled ? '#22c55e' : '#6b7280'} 
          />
          <Text style={[styles.statusText, is2FAEnabled ? styles.statusTextEnabled : styles.statusTextDisabled]}>
            {is2FAEnabled ? '2FA Enabled' : '2FA Disabled'}
          </Text>
        </View>
        <Text style={styles.statusDescription}>
          {is2FAEnabled 
            ? 'Your account is protected with two-factor authentication.'
            : 'Enable two-factor authentication for enhanced security.'
          }
        </Text>
      </View>

      {/* Alert Messages */}
      {status && (
        <View style={[styles.alertBox, status.type === 'error' ? styles.alertError : styles.alertSuccess]}>
          <Ionicons 
            name={status.type === 'error' ? 'alert-circle' : 'checkmark-circle'} 
            size={20} 
            color={status.type === 'error' ? '#dc2626' : '#16a34a'} 
          />
          <Text style={[styles.alertText, status.type === 'error' ? styles.alertTextError : styles.alertTextSuccess]}>
            {status.message}
          </Text>
        </View>
      )}

      {/* Setup Mode */}
      {setupMode && !is2FAEnabled && (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Setup Two-Factor Authentication</Text>
          
          {/* Step 1: QR Code */}
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </Text>
          </View>
          
          <View style={styles.qrContainer}>
            {otpauthUrl ? (
              <QRCode
                value={otpauthUrl}
                size={200}
                backgroundColor="#fff"
                color="#111827"
              />
            ) : (
              <View style={styles.qrPlaceholder}>
                <ActivityIndicator size="small" color="#4f46e5" />
              </View>
            )}
          </View>

          {/* Step 2: Manual Entry */}
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Or manually enter this secret key:
            </Text>
          </View>
          
          <TouchableOpacity style={styles.secretBox} onPress={copySecret}>
            <Text style={styles.secretText}>{secret}</Text>
            <Ionicons name="copy-outline" size={20} color="#6b7280" />
          </TouchableOpacity>

          {/* Step 3: Verify */}
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Enter the 6-digit code from your authenticator app:
            </Text>
          </View>
          
          <TextInput
            style={styles.codeInput}
            value={verificationCode}
            onChangeText={(text) => setVerificationCode(text.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setSetupMode(false);
                setVerificationCode('');
                setStatus(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.enableButton, (verificationCode.length !== 6 || busy) && styles.buttonDisabled]}
              onPress={handleEnable}
              disabled={verificationCode.length !== 6 || busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.enableButtonText}>Enable 2FA</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {!setupMode && (
        <View style={styles.actionsCard}>
          {is2FAEnabled ? (
            <TouchableOpacity 
              style={styles.disableButton}
              onPress={handleDisable}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <>
                  <Ionicons name="shield-outline" size={20} color="#ef4444" />
                  <Text style={styles.disableButtonText}>Disable 2FA</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.setupButton}
              onPress={handleSetup}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={20} color="#fff" />
                  <Text style={styles.setupButtonText}>Setup 2FA</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Info Section */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color="#3b82f6" />
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>About Two-Factor Authentication</Text>
          <Text style={styles.infoText}>
            Two-factor authentication adds an extra layer of security to your account. 
            When enabled, you'll need to enter a code from your authenticator app 
            in addition to your password when signing in.
          </Text>
        </View>
      </View>

      {/* Supported Apps */}
      <View style={styles.appsCard}>
        <Text style={styles.appsTitle}>Supported Authenticator Apps</Text>
        <View style={styles.appsList}>
          <View style={styles.appItem}>
            <View style={styles.appIcon}>
              <Ionicons name="phone-portrait-outline" size={20} color="#4f46e5" />
            </View>
            <Text style={styles.appName}>Google Authenticator</Text>
          </View>
          <View style={styles.appItem}>
            <View style={styles.appIcon}>
              <Ionicons name="key-outline" size={20} color="#4f46e5" />
            </View>
            <Text style={styles.appName}>Authy</Text>
          </View>
          <View style={styles.appItem}>
            <View style={styles.appIcon}>
              <Ionicons name="lock-closed-outline" size={20} color="#4f46e5" />
            </View>
            <Text style={styles.appName}>1Password</Text>
          </View>
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
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusEnabled: {
    backgroundColor: '#dcfce7',
  },
  statusDisabled: {
    backgroundColor: '#f3f4f6',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusTextEnabled: {
    color: '#166534',
  },
  statusTextDisabled: {
    color: '#6b7280',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  alertError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  alertSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  alertText: {
    flex: 1,
    fontSize: 14,
  },
  alertTextError: {
    color: '#dc2626',
  },
  alertTextSuccess: {
    color: '#16a34a',
  },
  setupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secretBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secretText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#111827',
    flex: 1,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 8,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  enableButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  enableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  disableButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#3b82f6',
    lineHeight: 18,
  },
  appsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  appsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  appsList: {
    gap: 12,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 14,
    color: '#374151',
  },
});
