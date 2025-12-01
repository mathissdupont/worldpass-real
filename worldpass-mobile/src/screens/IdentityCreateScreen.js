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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const styles = useMemo(() => createStyles(theme), [theme]);

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: theme.colors.border };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) {
      return { score: 1, label: 'Weak', color: theme.colors.danger || '#ef4444' };
    }
    if (score <= 2) {
      return { score: 2, label: 'Fair', color: theme.colors.warning || '#f59e0b' };
    }
    if (score <= 3) {
      return { score: 3, label: 'Good', color: theme.colors.success || '#22c55e' };
    }
    return { score: 4, label: 'Strong', color: theme.colors.success || '#10b981' };
  }, [password, theme.colors]);

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
      const newIdentity = await generateIdentity();

      await persistIdentity(newIdentity);
      await setIdentity(newIdentity);

      if (user) {
        try {
          await linkDid(newIdentity.did);
        } catch (linkErr) {
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
      setStatus({
        type: 'error',
        message: err?.message || 'Failed to create identity',
      });
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
      Alert.alert(
        'Password required',
        'Use the password you just created to encrypt the backup.'
      );
      return;
    }

    setExporting(true);
    setBusy(true);
    try {
      const keystore = await encryptKeystore(password, identity);
      const keystoreJson = JSON.stringify(keystore, null, 2);
      const filename = `worldpass-keystore-${Date.now()}.wpkeystore`;
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const fileUri = `${dir}${filename}`;

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
        Alert.alert(
          'Sharing unavailable',
          'Keystore copied to clipboard. Paste it into a secure note.'
        );
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
        <View
          style={[
            styles.chip,
            {
              backgroundColor: theme.colors.cardMuted,
              borderColor: theme.colors.primary,
            },
          ]}
        >
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.chipText}>Linking…</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View
          style={[
            styles.chip,
            {
              backgroundColor: theme.colors.errorMuted || '#fee2e2',
              borderColor: theme.colors.danger,
            },
          ]}
        >
          <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
          <Text style={[styles.chipText, { color: theme.colors.danger }]}>
            Link failed
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.chip,
          {
            backgroundColor: theme.colors.successMuted || '#dcfce7',
            borderColor: theme.colors.success,
          },
        ]}
      >
        <Ionicons
          name="checkmark-circle"
          size={16}
          color={theme.colors.success}
        />
        <Text style={[styles.chipText, { color: theme.colors.success }]}>
          Linked
        </Text>
      </View>
    );
  }, [identity?.did, linking, error, styles.chip, styles.chipText, theme.colors]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  step >= 1 && styles.progressDotActive,
                ]}
              >
                {step > 1 ? (
                  <Ionicons name="checkmark" size={16} color={theme.colors.onPrimary} />
                ) : (
                  <Text
                    style={[
                      styles.progressDotText,
                      step >= 1 && styles.progressDotTextActive,
                    ]}
                  >
                    1
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.progressLabel,
                  step >= 1 && styles.progressLabelActive,
                ]}
              >
                Create
              </Text>
            </View>

            <View
              style={[
                styles.progressLine,
                step >= 2 && styles.progressLineActive,
              ]}
            />

            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  step >= 2 && styles.progressDotActive,
                ]}
              >
                <Text
                  style={[
                    styles.progressDotText,
                    step >= 2 && styles.progressDotTextActive,
                  ]}
                >
                  2
                </Text>
              </View>
              <Text
                style={[
                  styles.progressLabel,
                  step >= 2 && styles.progressLabelActive,
                ]}
              >
                Backup
              </Text>
            </View>
          </View>

          {/* STEP 1 */}
          {step === 1 && (
            <View style={styles.card}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="key"
                  size={40}
                  color={theme.colors.primary}
                />
              </View>

              <Text style={styles.title}>Create New Identity</Text>
              <Text style={styles.subtitle}>
                Generate a new decentralized identity (DID) with a secure
                password. This password will be used to encrypt your private
                key.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter a strong password"
                    placeholderTextColor={theme.colors.textMuted}
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
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBar}>
                      {[1, 2, 3, 4].map((level) => (
                        <View
                          key={level}
                          style={{
                            ...styles.strengthSegment,
                            backgroundColor:
                              level <= passwordStrength.score
                                ? passwordStrength.color
                                : theme.colors.border,
                          }}
                        />
                      ))}
                    </View>
                    <Text
                      style={[
                        styles.strengthLabel,
                        { color: passwordStrength.color },
                      ]}
                    >
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
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                {confirmPassword.length > 0 &&
                  password !== confirmPassword && (
                    <Text style={styles.errorText}>
                      Passwords do not match
                    </Text>
                  )}
              </View>

              {status && (
                <View
                  style={[
                    styles.statusBox,
                    status.type === 'error'
                      ? styles.statusError
                      : styles.statusSuccess,
                  ]}
                >
                  <Ionicons
                    name={
                      status.type === 'error'
                        ? 'alert-circle'
                        : 'checkmark-circle'
                    }
                    size={18}
                    color={
                      status.type === 'error'
                        ? theme.colors.danger
                        : theme.colors.success
                    }
                  />
                  <Text
                    style={[
                      styles.statusText,
                      status.type === 'error'
                        ? styles.statusTextError
                        : styles.statusTextSuccess,
                    ]}
                  >
                    {status.message}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!canProceed() || busy) && styles.buttonDisabled,
                ]}
                onPress={handleCreate}
                disabled={!canProceed() || busy}
                activeOpacity={0.8}
              >
                {busy ? (
                  <ActivityIndicator color={theme.colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons
                      name="key"
                      size={20}
                      color={theme.colors.onPrimary}
                    />
                    <Text style={styles.primaryButtonText}>
                      Generate Identity
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.warningBox}>
                <Ionicons
                  name="warning"
                  size={18}
                  color={theme.colors.warning || '#d97706'}
                />
                <Text style={styles.warningText}>
                  Make sure to remember your password! It cannot be recovered if
                  lost.
                </Text>
              </View>
            </View>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <View style={styles.card}>
              <View style={[styles.iconContainer, styles.successIcon]}>
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color={theme.colors.success}
                />
              </View>

              <Text style={styles.title}>Identity Created!</Text>
              <Text style={styles.subtitle}>
                Your new decentralized identity has been generated and saved
                securely.
              </Text>

              <View style={styles.identityPreview}>
                <VisualIDCard
                  did={createdDid}
                  name={user?.name}
                  email={user?.email}
                />
              </View>

              <View style={styles.didBox}>
                <View style={styles.didHeaderRow}>
                  <Text style={styles.didLabel}>Your DID</Text>
                  {linkingStatusChip}
                </View>
                <Text style={styles.didValue} numberOfLines={3}>
                  {createdDid}
                </Text>
                <TouchableOpacity
                  style={styles.copyRow}
                  onPress={handleCopyDid}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={copiedDid ? 'checkmark' : 'copy-outline'}
                    size={18}
                    color={
                      copiedDid ? theme.colors.success : theme.colors.primary
                    }
                  />
                  <Text
                    style={[
                      styles.copyText,
                      copiedDid && styles.copyTextSuccess,
                    ]}
                  >
                    {copiedDid ? 'Copied' : 'Copy DID'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.backupCard}>
                <View style={styles.backupHeader}>
                  <Ionicons
                    name="shield-checkmark"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.backupTitle}>
                    Step 2 — Backup keystore
                  </Text>
                </View>
                <Text style={styles.backupText}>
                  Download the encrypted `.wpkeystore` file and store it
                  somewhere offline. You can bring the same identity to another
                  device with this file and your password.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    (exporting || busy) && styles.buttonDisabled,
                  ]}
                  onPress={handleExport}
                  disabled={exporting || busy}
                  activeOpacity={0.8}
                >
                  {exporting ? (
                    <ActivityIndicator color={theme.colors.primary} />
                  ) : (
                    <>
                      <Ionicons
                        name="download-outline"
                        size={20}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.secondaryButtonText}>
                        Download Encrypted Keystore
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleFinish}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.tipBox}>
                <Ionicons
                  name="bulb-outline"
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={styles.tipText}>
                  Export your keystore now for backup. You'll need it to recover
                  your identity on another device.
                </Text>
              </View>
            </View>
          )}

          {/* Existing Identity Warning */}
          {identity?.did && step === 1 && (
            <View style={styles.warningCard}>
              <Ionicons
                name="alert-circle"
                size={24}
                color={theme.colors.warning || '#f59e0b'}
              />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Identity Already Exists</Text>
                <Text style={styles.warningDescription}>
                  You already have an identity. Creating a new one will replace
                  it. Make sure you have a backup of your current identity.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
      paddingHorizontal: 40,
    },
    progressStep: {
      alignItems: 'center',
    },
    progressDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.cardMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    progressDotActive: {
      backgroundColor: theme.colors.primary,
    },
    progressDotText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    progressDotTextActive: {
      color: theme.colors.onPrimary,
    },
    progressLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    progressLabelActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    progressLine: {
      flex: 1,
      height: 2,
      backgroundColor: theme.colors.border,
      marginHorizontal: 8,
      marginBottom: 20,
    },
    progressLineActive: {
      backgroundColor: theme.colors.primary,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
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
      backgroundColor: theme.colors.cardMuted,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: theme.spacing.md,
    },
    successIcon: {
      backgroundColor: theme.colors.successMuted || '#dcfce7',
    },
    title: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: theme.spacing.lg,
    },
    inputGroup: {
      marginBottom: theme.spacing.md,
    },
    inputLabel: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: theme.typography.sizes.md,
      color: theme.colors.text,
      backgroundColor: theme.colors.cardMuted,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.cardMuted,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: theme.typography.sizes.md,
      color: theme.colors.text,
    },
    eyeButton: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    strengthContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.xs,
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
      width: 60,
      textAlign: 'right',
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.danger,
      marginTop: 4,
    },
    statusBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: theme.spacing.sm,
      borderRadius: theme.radii.md,
      marginBottom: theme.spacing.md,
    },
    statusError: {
      backgroundColor: theme.colors.errorMuted || '#fef2f2',
      borderWidth: 1,
      borderColor: theme.colors.dangerMuted || '#fecaca',
    },
    statusSuccess: {
      backgroundColor: theme.colors.successMuted || '#f0fdf4',
      borderWidth: 1,
      borderColor: '#bbf7d0',
    },
    statusText: {
      flex: 1,
      fontSize: 13,
    },
    statusTextError: {
      color: theme.colors.danger,
    },
    statusTextSuccess: {
      color: theme.colors.success,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.lg,
      marginBottom: theme.spacing.md,
    },
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semibold,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.cardMuted,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.lg,
      marginBottom: theme.spacing.sm,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semibold,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.warningMuted || '#fffbeb',
      borderRadius: theme.radii.md,
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
      backgroundColor: theme.colors.cardMuted,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    didLabel: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginBottom: 4,
    },
    didValue: {
      fontSize: 14,
      color: theme.colors.text,
      fontFamily: 'monospace',
    },
    actionButtons: {
      gap: 12,
    },
    tipBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.cardMuted,
      borderRadius: theme.radii.md,
      marginTop: theme.spacing.md,
    },
    tipText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.textMuted,
      lineHeight: 18,
    },
    identityPreview: {
      alignItems: 'center',
      marginBottom: theme.spacing.md,
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
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semibold,
    },
    copyTextSuccess: {
      color: theme.colors.success,
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
      color: theme.colors.primary,
    },
    backupCard: {
      backgroundColor: theme.colors.cardMuted,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    backupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: theme.spacing.xs,
    },
    backupTitle: {
      fontSize: 15,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
    },
    backupText: {
      fontSize: 13,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.sm,
    },
    warningCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: theme.colors.warningMuted || '#fffbeb',
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: '#fde68a',
    },
    warningContent: {
      flex: 1,
    },
    warningTitle: {
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
      color: '#92400e',
      marginBottom: 4,
    },
    warningDescription: {
      fontSize: 13,
      color: '#a16207',
      lineHeight: 18,
    },
  });
}
