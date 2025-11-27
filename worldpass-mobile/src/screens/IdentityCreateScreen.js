import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIdentity } from '../context/IdentityContext';
import { generateIdentity, encryptKeystore, bytesToBase64Url } from '../lib/crypto';
import { saveIdentity as persistIdentity } from '../lib/storage';
import { linkDid } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function IdentityCreateScreen({ navigation }) {
  const { setIdentity, identity } = useIdentity();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createdDid, setCreatedDid] = useState(null);
  const [status, setStatus] = useState(null);

  const passwordStrength = (() => {
    if (!password) return { score: 0, label: '', color: '#e5e7eb' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' };
    if (score <= 2) return { score: 2, label: 'Fair', color: '#f59e0b' };
    if (score <= 3) return { score: 3, label: 'Good', color: '#22c55e' };
    return { score: 4, label: 'Strong', color: '#10b981' };
  })();

  const canProceed = () => {
    if (step === 1) {
      return password.length >= 8 && password === confirmPassword;
    }
    return true;
  };

  const handleCreate = async () => {
    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    if (password.length < 8) {
      setStatus({ type: 'error', message: 'Password must be at least 8 characters' });
      return;
    }

    setBusy(true);
    setStatus(null);

    try {
      // Generate new identity (Ed25519 keypair)
      const newIdentity = await generateIdentity();
      
      // Save to secure storage
      await persistIdentity(newIdentity);
      
      // Update context
      await setIdentity(newIdentity);
      
      // Link to account if logged in
      if (user) {
        try {
          await linkDid(newIdentity.did);
        } catch (linkErr) {
          // DID already set is okay
          if (!linkErr.message?.includes('already')) {
            console.warn('Failed to link DID:', linkErr);
          }
        }
      }

      setCreatedDid(newIdentity.did);
      setStep(2);
      setStatus({ type: 'success', message: 'Identity created successfully!' });
    } catch (err) {
      console.error('Create identity error:', err);
      setStatus({ type: 'error', message: err?.message || 'Failed to create identity' });
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    if (!identity) {
      Alert.alert('Error', 'No identity to export');
      return;
    }

    setBusy(true);
    try {
      const keystore = await encryptKeystore(password, identity);
      const keystoreJson = JSON.stringify(keystore, null, 2);
      
      // For mobile, we'll show the JSON and let user copy it
      Alert.alert(
        'Export Keystore',
        'Your encrypted keystore has been prepared. You can copy it to a secure location.',
        [
          {
            text: 'Copy to Clipboard',
            onPress: async () => {
              const Clipboard = require('expo-clipboard');
              await Clipboard.setStringAsync(keystoreJson);
              Alert.alert('Copied', 'Keystore copied to clipboard');
            },
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
    } catch (err) {
      console.error('Export error:', err);
      Alert.alert('Error', 'Failed to export keystore');
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]}>
            {step > 1 ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={[styles.progressDotText, step >= 1 && styles.progressDotTextActive]}>1</Text>
            )}
          </View>
          <Text style={[styles.progressLabel, step >= 1 && styles.progressLabelActive]}>Create</Text>
        </View>
        <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
        <View style={styles.progressStep}>
          <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]}>
            <Text style={[styles.progressDotText, step >= 2 && styles.progressDotTextActive]}>2</Text>
          </View>
          <Text style={[styles.progressLabel, step >= 2 && styles.progressLabelActive]}>Backup</Text>
        </View>
      </View>

      {step === 1 && (
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons name="key" size={40} color="#4f46e5" />
          </View>
          
          <Text style={styles.title}>Create New Identity</Text>
          <Text style={styles.subtitle}>
            Generate a new decentralized identity (DID) with a secure password.
            This password will be used to encrypt your private key.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter a strong password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={22} 
                  color="#6b7280" 
                />
              </TouchableOpacity>
            </View>
            
            {/* Password Strength */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4].map((level) => (
                    <View 
                      key={level}
                      style={[
                        styles.strengthSegment,
                        { backgroundColor: level <= passwordStrength.score ? passwordStrength.color : '#e5e7eb' }
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                  {passwordStrength.label}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}
          </View>

          {status && (
            <View style={[
              styles.statusBox,
              status.type === 'error' ? styles.statusError : styles.statusSuccess
            ]}>
              <Ionicons 
                name={status.type === 'error' ? 'alert-circle' : 'checkmark-circle'} 
                size={18} 
                color={status.type === 'error' ? '#dc2626' : '#16a34a'} 
              />
              <Text style={[
                styles.statusText,
                status.type === 'error' ? styles.statusTextError : styles.statusTextSuccess
              ]}>
                {status.message}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, (!canProceed() || busy) && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={!canProceed() || busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="key" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>Generate Identity</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.warningBox}>
            <Ionicons name="warning" size={18} color="#d97706" />
            <Text style={styles.warningText}>
              Make sure to remember your password! It cannot be recovered if lost.
            </Text>
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={styles.card}>
          <View style={[styles.iconContainer, styles.successIcon]}>
            <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
          </View>
          
          <Text style={styles.title}>Identity Created!</Text>
          <Text style={styles.subtitle}>
            Your new decentralized identity has been generated and saved securely.
          </Text>

          <View style={styles.didBox}>
            <Text style={styles.didLabel}>Your DID</Text>
            <Text style={styles.didValue} numberOfLines={3}>
              {createdDid}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleExport}
              disabled={busy}
            >
              <Ionicons name="download-outline" size={20} color="#4f46e5" />
              <Text style={styles.secondaryButtonText}>Export Keystore</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleFinish}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tipBox}>
            <Ionicons name="bulb-outline" size={18} color="#4f46e5" />
            <Text style={styles.tipText}>
              Export your keystore now for backup. You'll need it to recover your identity on another device.
            </Text>
          </View>
        </View>
      )}

      {/* Existing Identity Warning */}
      {identity?.did && step === 1 && (
        <View style={styles.warningCard}>
          <Ionicons name="alert-circle" size={24} color="#f59e0b" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Identity Already Exists</Text>
            <Text style={styles.warningDescription}>
              You already have an identity. Creating a new one will replace it.
              Make sure you have a backup of your current identity.
            </Text>
          </View>
        </View>
      )}
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: '#4f46e5',
  },
  progressDotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  progressDotTextActive: {
    color: '#fff',
  },
  progressLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  progressLabelActive: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
    marginBottom: 20,
  },
  progressLineActive: {
    backgroundColor: '#4f46e5',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  successIcon: {
    backgroundColor: '#dcfce7',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  strengthBar: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    width: 50,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  statusSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusText: {
    flex: 1,
    fontSize: 13,
  },
  statusTextError: {
    color: '#dc2626',
  },
  statusTextSuccess: {
    color: '#16a34a',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#eef2ff',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#4f46e5',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  didBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  didLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  didValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'monospace',
  },
  actionButtons: {
    gap: 12,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    marginTop: 16,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#3730a3',
    lineHeight: 18,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  warningDescription: {
    fontSize: 13,
    color: '#a16207',
    lineHeight: 18,
  },
});
