import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { clearAllData } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { useIdentity } from '../context/IdentityContext';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { useSecurity } from '../context/SecurityContext';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'desktop-outline' },
];

export default function SettingsScreen({ navigation }) {
  const { user, signOut, refreshProfile } = useAuth();
  const { identity, linking, error: identityError } = useIdentity();
  const { clearWallet } = useWallet();
  const {
    biometricAvailable,
    biometricEnabled,
    updateBiometricPreference,
    pinSet,
    setPinCode,
    clearPinCode,
  } = useSecurity();
  const [biometricUpdating, setBiometricUpdating] = useState(false);
  const [pinSheetVisible, setPinSheetVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const walletDid = identity?.did || '';
  const hasIdentity = Boolean(walletDid);
  const identitySubtitle = walletDid
    ? (identityError ? `Sync issue: ${identityError}` : linking ? 'Syncing DID with your account...' : `${walletDid.slice(0, 30)}...`)
    : 'Import your .wpkeystore to link a DID';
  const { theme, themeName, setTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const accountName = (user?.displayName || user?.name || '').trim() || user?.email || 'Profil oluşturulmadı';
  const accountSubtitle = user?.email || 'Devam etmek için oturum aç';

  useEffect(() => {
    refreshProfile().catch(() => {});
  }, [refreshProfile]);

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
            await clearWallet();
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

  const handleQuickCreate = () => {
    navigation.navigate('IdentityCreate');
  };

  const handleBackupShortcut = () => {
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

  const handleBiometricToggle = useCallback(async (value) => {
    setBiometricUpdating(true);
    try {
      await updateBiometricPreference(value);
    } catch (err) {
      Alert.alert('Biometric unlock', err?.message || 'İşlem iptal edildi');
    } finally {
      setBiometricUpdating(false);
    }
  }, [updateBiometricPreference]);

  const openPinSheet = useCallback(() => {
    setPinSheetVisible(true);
    setPinInput('');
    setPinConfirmInput('');
    setPinError('');
  }, []);

  const cancelPinSheet = useCallback(() => {
    setPinSheetVisible(false);
    setPinInput('');
    setPinConfirmInput('');
    setPinError('');
  }, []);

  const handlePrimaryPinChange = (value) => {
    setPinError('');
    setPinInput(value.replace(/[^0-9]/g, ''));
  };

  const handleConfirmPinChange = (value) => {
    setPinError('');
    setPinConfirmInput(value.replace(/[^0-9]/g, ''));
  };

  const handleSavePin = useCallback(async () => {
    if (pinInput.length < 4) {
      setPinError('PIN en az 4 haneli olmalı');
      return;
    }
    if (pinInput !== pinConfirmInput) {
      setPinError('PIN eşleşmiyor');
      return;
    }
    setPinLoading(true);
    try {
      await setPinCode(pinInput);
      cancelPinSheet();
      Alert.alert('PIN hazır', "Cüzdan PIN'in aktif.");
    } catch (err) {
      setPinError(err?.message || 'PIN ayarlanamadı');
    } finally {
      setPinLoading(false);
    }
  }, [pinInput, pinConfirmInput, setPinCode, cancelPinSheet]);

  const handleRemovePin = useCallback(() => {
    Alert.alert(
      "PIN'i kaldır",
      'PIN korumasını devre dışı bırakmak istediğine emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            await clearPinCode();
            cancelPinSheet();
          },
        },
      ],
    );
  }, [clearPinCode, cancelPinSheet]);

  const SettingItem = ({ icon, title, subtitle, onPress, rightElement, isLast }) => (
    <TouchableOpacity
      style={[styles.item, isLast && styles.itemLast]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.85 : 1}
    >
      <View style={styles.itemLeft}>
        <View style={styles.itemIconBadge}>
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.itemText}>
          <Text style={styles.itemTitle}>{title}</Text>
          {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || (onPress && <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />)}
    </TouchableOpacity>
  );

  const renderPinSheet = () => {
    if (!pinSheetVisible) {
      return null;
    }
    return (
      <View style={styles.pinSheet}>
        <Text style={styles.pinSheetTitle}>{pinSet ? 'PIN\'i güncelle' : 'PIN oluştur'}</Text>
        <Text style={styles.pinHint}>PIN sadece bu cihazda saklanır ve en az 4 haneli olmalı.</Text>
        <TextInput
          value={pinInput}
          onChangeText={handlePrimaryPinChange}
          placeholder="Yeni PIN"
          placeholderTextColor={theme.colors.muted}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          style={styles.pinInput}
        />
        <TextInput
          value={pinConfirmInput}
          onChangeText={handleConfirmPinChange}
          placeholder="PIN tekrar"
          placeholderTextColor={theme.colors.muted}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          style={styles.pinInput}
        />
        {pinError ? <Text style={[styles.pinError, { color: theme.colors.danger }]}>{pinError}</Text> : null}
        <View style={styles.pinActions}>
          <TouchableOpacity
            style={[styles.pinButton, styles.pinButtonPrimary]}
            onPress={handleSavePin}
            disabled={pinLoading}
          >
            {pinLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.pinButtonPrimaryText}>Kaydet</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pinButton, styles.pinButtonGhost]}
            onPress={cancelPinSheet}
            disabled={pinLoading}
          >
            <Text style={styles.pinButtonGhostText}>Vazgeç</Text>
          </TouchableOpacity>
          {pinSet && (
            <TouchableOpacity
              style={[styles.pinButton, styles.pinButtonDanger]}
              onPress={handleRemovePin}
              disabled={pinLoading}
            >
              <Text style={styles.pinButtonDangerText}>PIN'i Kaldır</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.heroSection}>
        <View style={[styles.heroCard, theme.shadows.card]}>
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>
                {hasIdentity ? 'Kimliğin seninle' : 'Kimliğini cihaza ekle'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {hasIdentity
                  ? 'Keystore’u yedekleyip aynı DID’i diğer cihazlarda da kullanabilirsin.'
                  : 'Yeni DID oluştur veya var olan .wpkeystore dosyanı içe aktar.'}
              </Text>
            </View>
            <View style={styles.heroPill}>
              {linking ? (
                <>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.heroPillText}>Hesaba bağlanıyor</Text>
                </>
              ) : identityError ? (
                <>
                  <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
                  <Text style={[styles.heroPillText, { color: theme.colors.danger }]}>Sync hatası</Text>
                </>
              ) : hasIdentity ? (
                <>
                  <Ionicons name="shield-checkmark" size={16} color={theme.colors.success} />
                  <Text style={[styles.heroPillText, { color: theme.colors.success }]}>DID aktif</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
                  <Text style={styles.heroPillText}>Kurulum gerekli</Text>
                </>
              )}
            </View>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[styles.heroButton, styles.heroButtonPrimary]}
              onPress={hasIdentity ? handleBackupShortcut : handleQuickCreate}
            >
              <Ionicons name={hasIdentity ? 'download-outline' : 'add'} size={18} color="#fff" />
              <Text style={styles.heroButtonPrimaryText}>
                {hasIdentity ? 'Keystore Yedeği Al' : 'Kimlik Oluştur'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.heroButton, styles.heroButtonSecondary]}
              onPress={handleManageIdentity}
            >
              <Ionicons name="refresh" size={18} color={theme.colors.primary} />
              <Text style={styles.heroButtonSecondaryText}>
                {hasIdentity ? 'Kimliği Yönet' : 'İçe Aktar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={[styles.card, theme.shadows.card]}>
          <SettingItem
            icon="person-circle-outline"
            title={accountName}
            subtitle={accountSubtitle}
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
            isLast
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={[styles.card, theme.shadows.card]}>
          <SettingItem
            icon="shield-half-outline"
            title="Two-Factor Authentication"
            subtitle="Add extra security to your account"
            onPress={() => navigation.navigate('TwoFactor')}
          />
          <SettingItem
            icon="lock-closed-outline"
            title="Wallet PIN"
            subtitle={pinSet ? 'PIN fallback aktif' : 'PIN kurulu değil'}
            onPress={pinSheetVisible ? cancelPinSheet : openPinSheet}
            rightElement={(
              <View style={[styles.badge, pinSet ? styles.badgeActive : styles.badgeMuted]}>
                <Text style={[styles.badgeText, pinSet ? styles.badgeTextActive : styles.badgeTextMuted]}>
                  {pinSet ? 'Aktif' : 'Kapalı'}
                </Text>
              </View>
            )}
          />
          {renderPinSheet()}
          <SettingItem
            icon="finger-print-outline"
            title="Biometric Unlock"
            subtitle={biometricAvailable ? 'Use biometrics for wallet access' : 'Not available on this device'}
            rightElement={
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable || biometricUpdating}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={biometricEnabled ? '#fff' : '#f4f4f5'}
                ios_backgroundColor={theme.colors.border}
              />
            }
            isLast
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payments</Text>
        <View style={[styles.card, theme.shadows.card]}>
          <SettingItem
            icon="receipt-outline"
            title="Transaction History"
            subtitle="View all your payments"
            onPress={() => navigation.navigate('Transactions')}
            isLast
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.cardHeading}>Theme</Text>
          <View style={styles.themeOptionsRow}>
            {THEME_OPTIONS.map((option) => {
              const active = themeName === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.themeOption, active && styles.themeOptionActive]}
                  onPress={() => setTheme(option.value)}
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={active ? '#fff' : theme.colors.text}
                  />
                  <Text style={[styles.themeOptionLabel, active && styles.themeOptionLabelActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data</Text>
        <View style={[styles.card, theme.shadows.card]}>
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
            isLast
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={[styles.card, theme.shadows.card]}>
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
            isLast
          />
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  heroSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  heroCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  heroHeader: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  heroSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.cardSecondary,
  },
  heroPillText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  heroActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  heroButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.sm + 2,
  },
  heroButtonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  heroButtonPrimaryText: {
    color: '#fff',
    fontWeight: theme.typography.weights.semibold,
  },
  heroButtonSecondary: {
    backgroundColor: theme.colors.cardSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroButtonSecondaryText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  section: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  cardHeading: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemLast: {
    borderBottomWidth: 0,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIconBadge: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    marginLeft: theme.spacing.md,
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  itemSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
  },
  badge: {
    borderWidth: 1,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  badgeActive: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.cardSecondary,
  },
  badgeMuted: {
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardSecondary,
  },
  badgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
  },
  badgeTextActive: {
    color: theme.colors.success,
  },
  badgeTextMuted: {
    color: theme.colors.muted,
  },
  pinSheet: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  pinSheetTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  pinHint: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.sizes.lg,
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: theme.colors.cardSecondary,
    color: theme.colors.text,
  },
  pinActions: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  pinButton: {
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  pinButtonPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pinButtonPrimaryText: {
    color: '#fff',
    fontWeight: theme.typography.weights.semibold,
  },
  pinButtonGhost: {
    backgroundColor: theme.colors.cardSecondary,
    borderColor: theme.colors.border,
  },
  pinButtonGhostText: {
    color: theme.colors.text,
    fontWeight: theme.typography.weights.semibold,
  },
  pinButtonDanger: {
    borderColor: theme.colors.danger,
  },
  pinButtonDangerText: {
    color: theme.colors.danger,
    fontWeight: theme.typography.weights.semibold,
  },
  pinError: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.medium,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  themeOption: {
    flex: 1,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm + 2,
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardSecondary,
  },
  themeOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  themeOptionLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
  },
  themeOptionLabelActive: {
    color: '#fff',
  },
});
