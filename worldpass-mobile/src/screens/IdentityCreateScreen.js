import React, { useMemo, useState } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useIdentity } from '../context/IdentityContext';
import { generateIdentity, encryptKeystore } from '../lib/crypto';
import { saveIdentity as persistIdentity } from '../lib/storage';
import { linkDid } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import VisualIDCard from '../components/VisualIDCard';
import { useTheme } from '../context/ThemeContext';

export default function IdentityCreateScreen({ navigation }) {
  const { setIdentity, identity, linking, error } = useIdentity();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createdDid, setCreatedDid] = useState(null);
  const [status, setStatus] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [copiedDid, setCopiedDid] = useState(false);

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

    if (!password) {
      Alert.alert('Password required', 'Use the password you just created to encrypt the backup.');
      return;
    }

    setExporting(true);
    setBusy(true);
    try {
      const keystore = await encryptKeystore(password, identity);
      const keystoreJson = JSON.stringify(keystore, null, 2);
      const filename = `worldpass-keystore-${Date.now()}.wpkeystore`;
      const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, keystoreJson, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'WorldPass Keystore Backup',
        });
      } else {
        await Clipboard.setStringAsync(keystoreJson);
        Alert.alert('Sharing unavailable', 'Keystore copied to clipboard. Paste it into a secure note.');
      }
    } catch (err) {
      console.error('Export error:', err);
      Alert.alert('Error', 'Failed to export keystore');
    } finally {
      setExporting(false);
      setBusy(false);
    }
  };

  const handleCopyDid = async () => {
    const activeDid = createdDid || identity?.did;
    if (!activeDid) return;
    await Clipboard.setStringAsync(activeDid);
    setCopiedDid(true);
    setTimeout(() => setCopiedDid(false), 2000);
  };

  const handleFinish = () => {
    navigation.goBack();
  };

  const linkingStatusChip = useMemo(() => {
    if (!identity?.did) return null;
    if (linking) {
      return (
        <View style={[styles.chip, { backgroundColor: '#eef2ff', borderColor: theme.colors.primary }]}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.chipText}>Linking…</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={[styles.chip, { backgroundColor: '#fee2e2', borderColor: theme.colors.danger }]}>
          <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
          <Text style={[styles.chipText, { color: theme.colors.danger }]}>Link failed</Text>
        </View>
      );
    }
    return (
      <View style={[styles.chip, { backgroundColor: '#dcfce7', borderColor: theme.colors.success }]}>
        <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
        <Text style={[styles.chipText, { color: theme.colors.success }]}>Linked</Text>
      </View>
    );
  }, [identity?.did, linking, error, theme.colors]);

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

          <View style={styles.identityPreview}>
            <VisualIDCard did={createdDid} name={user?.name} email={user?.email} />
          </View>

          <View style={styles.didBox}>
            <View style={styles.didHeaderRow}>
              <Text style={styles.didLabel}>Your DID</Text>
              {linkingStatusChip}
            </View>
            <Text style={styles.didValue} numberOfLines={3}>
              {createdDid}
            </Text>
            <TouchableOpacity style={styles.copyRow} onPress={handleCopyDid}>
              <Ionicons
                name={copiedDid ? 'checkmark' : 'copy-outline'}
                size={18}
                color={copiedDid ? '#16a34a' : '#4f46e5'}
              />
              <Text style={[styles.copyText, copiedDid && styles.copyTextSuccess]}>
                {copiedDid ? 'Copied' : 'Copy DID'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.backupCard}>
            <View style={styles.backupHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#4f46e5" />
              <Text style={styles.backupTitle}>Step 2 — Backup keystore</Text>
            </View>
            <Text style={styles.backupText}>
              Download the encrypted `.wpkeystore` file and store it somewhere offline. You can bring the same identity to another device with this file and your password.
            </Text>
            <TouchableOpacity
              style={[styles.secondaryButton, (exporting || busy) && styles.buttonDisabled]}
              onPress={handleExport}
              disabled={exporting || busy}
            >
              {exporting ? (
                <ActivityIndicator color="#4f46e5" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#4f46e5" />
                  <Text style={styles.secondaryButtonText}>Download Encrypted Keystore</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
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
  identityPreview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  didHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  copyText: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  copyTextSuccess: {
    color: '#16a34a',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
  },
  backupCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  backupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  backupText: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 12,
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
