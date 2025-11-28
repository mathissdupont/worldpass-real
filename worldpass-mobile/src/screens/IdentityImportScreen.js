import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { useIdentity } from '../context/IdentityContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import VisualIDCard from '../components/VisualIDCard';
import { encryptKeystore } from '../lib/crypto';

export default function IdentityImportScreen() {
  const { identity, importFromKeystore, clearIdentity, linking } = useIdentity();
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [showBackupPassword, setShowBackupPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copiedDid, setCopiedDid] = useState(false);

  const fileLabel = useMemo(() => {
    if (!file) return 'No file selected';
    const sizeKB = file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'Unknown size';
    return `${file.name} • ${sizeKB}`;
  }, [file]);

  const selectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || result.type === 'cancel') {
        return;
      }

      const asset = Array.isArray(result.assets) ? result.assets[0] : result;
      if (!asset) return;

      const name = asset.name || 'keystore.wpkeystore';
      if (!/\.wpkeystore$/i.test(name)) {
        setStatus({ type: 'error', message: 'Unsupported file type. Please choose a .wpkeystore file.' });
        return;
      }

      setFile({
        name,
        size: asset.size ?? 0,
        uri: asset.fileCopyUri || asset.uri,
        mimeType: asset.mimeType,
      });
      setStatus(null);
    } catch (err) {
      setStatus({ type: 'error', message: err?.message || 'Failed to pick a file.' });
    }
  };

  const readKeystore = async () => {
    if (!file?.uri) {
      throw new Error('Select a keystore file first.');
    }
    const contents = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    try {
      return JSON.parse(contents);
    } catch (err) {
      throw new Error('Invalid keystore JSON.');
    }
  };

  const handleImport = async () => {
    if (!password.trim()) {
      setStatus({ type: 'error', message: 'Enter the password that was used while exporting the keystore.' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const blob = await readKeystore();
      const imported = await importFromKeystore(password, blob);
      setStatus({ type: 'success', message: `Identity imported. DID: ${imported.did}` });
      setPassword('');
    } catch (err) {
      const raw = err?.message || 'Failed to decrypt the keystore.';
      let message = raw;
      if (raw === 'invalid_password') {
        message = 'Password is incorrect for this keystore.';
      } else if (raw === 'unsupported_kdf') {
        message = 'This keystore format is not supported on mobile yet.';
      } else if (raw === 'argon2_unavailable') {
        message = 'This keystore was encrypted with Argon2 and iOS cannot run WebAssembly. Import it on the web/CLI once and re-export (PBKDF2) before trying again on this device.';
      }
      setStatus({ type: 'error', message });
    } finally {
      setBusy(false);
    }
  };

  const handleBackupExport = async () => {
    if (!identity) {
      setStatus({ type: 'error', message: 'Import or create an identity first.' });
      return;
    }
    if (backupPassword.length < 8) {
      setStatus({ type: 'error', message: 'Backup password must be at least 8 characters.' });
      return;
    }
    setExporting(true);
    setStatus(null);
    try {
      const keystore = await encryptKeystore(backupPassword, identity);
      const keystoreJson = JSON.stringify(keystore, null, 2);
      const filename = `worldpass-keystore-${Date.now()}.wpkeystore`;
      const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, keystoreJson, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'WorldPass Keystore Backup',
        });
      } else {
        await Clipboard.setStringAsync(keystoreJson);
        Alert.alert('Sharing unavailable', 'Keystore copied to clipboard. Paste it into a secure note.');
      }

      setStatus({ type: 'success', message: 'Encrypted backup prepared. Store it somewhere safe.' });
    } catch (err) {
      console.error('Backup export error:', err);
      setStatus({ type: 'error', message: err?.message || 'Failed to prepare backup.' });
    } finally {
      setExporting(false);
    }
  };

  const handleCopyDid = async () => {
    if (!identity?.did) return;
    await Clipboard.setStringAsync(identity.did);
    setCopiedDid(true);
    setTimeout(() => setCopiedDid(false), 2000);
  };

  const confirmClearIdentity = () => {
    if (!identity) return;
    Alert.alert(
      'Remove Identity',
      'This will remove the imported DID and private key from this device. Credentials remain untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await clearIdentity();
            setStatus({ type: 'info', message: 'Identity removed from device.' });
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.card, theme.shadows.card]}>
        <Text style={styles.title}>Import Wallet Identity</Text>
        <Text style={styles.subtitle}>
          Load your .wpkeystore file to unlock credentials issued to your DID. We only store it securely on this device.
        </Text>

        <TouchableOpacity style={styles.filePicker} onPress={selectFile}>
          <Ionicons name="document-text-outline" size={24} color="#4f46e5" />
          <View style={styles.fileInfo}>
            <Text style={styles.fileLabel}>{fileLabel}</Text>
            <Text style={styles.fileHint}>Tap to choose another file</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>

        <Text style={styles.inputLabel}>Keystore Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            value={password}
            secureTextEntry={!showPassword}
            onChangeText={setPassword}
            placeholder="Enter password"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.passwordInput}
          />
          <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {status && (
          <View style={[
            styles.status,
            status.type === 'error' ? styles.statusError : status.type === 'success' ? styles.statusSuccess : styles.statusInfo,
          ]}
          >
            <Text style={[
              styles.statusText,
              status.type === 'error'
                ? styles.statusErrorText
                : status.type === 'success'
                ? styles.statusSuccessText
                : styles.statusInfoText,
            ]}
            >
              {status.message}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, busy && styles.buttonDisabled]}
          onPress={handleImport}
          disabled={busy || !file}
        >
          <Text style={styles.primaryText}>{busy ? 'Decrypting...' : 'Import Identity'}</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, theme.shadows.card]}>
        <Text style={styles.sectionTitle}>Current Identity</Text>
        {identity?.did ? (
          <View>
            <View style={styles.identityPreview}>
              <VisualIDCard did={identity.did} name={user?.name} email={user?.email} />
            </View>
            <View style={styles.identityMetaRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.didLabel}>Linked DID</Text>
                <Text style={styles.didValue}>{identity.did}</Text>
              </View>
              <View style={[
                styles.statusChip,
                linking ? styles.statusChipInfo : styles.statusChipSuccess,
              ]}
              >
                {linking ? (
                  <>
                    <ActivityIndicator size="small" color={theme.colors.info} />
                    <Text style={[styles.statusChipText, { color: theme.colors.info }]}>Linking…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                    <Text style={[styles.statusChipText, { color: theme.colors.success }]}>Linked</Text>
                  </>
                )}
              </View>
            </View>
            <View style={styles.identityActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleCopyDid}>
                <Ionicons
                  name={copiedDid ? 'checkmark' : 'copy-outline'}
                  size={18}
                  color={copiedDid ? theme.colors.success : theme.colors.primary}
                />
                <Text style={[styles.secondaryButtonText, copiedDid && { color: theme.colors.success }]}>
                  {copiedDid ? 'Copied' : 'Copy DID'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.outlineDangerButton} onPress={confirmClearIdentity}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                <Text style={styles.outlineDangerText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.metaText}>
              {linking ? 'Syncing with your account…' : 'Keys stay encrypted locally on this device.'}
            </Text>

            <View style={styles.backupCard}>
              <View style={styles.backupHeader}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
                <Text style={styles.backupTitle}>Backup keystore</Text>
              </View>
              <Text style={styles.backupHint}>
                Choose a password (can be different from the original) and export the encrypted `.wpkeystore` file.
              </Text>
              <View style={styles.passwordRow}>
                <TextInput
                  value={backupPassword}
                  secureTextEntry={!showBackupPassword}
                  onChangeText={setBackupPassword}
                  placeholder="Backup password"
                  placeholderTextColor={theme.colors.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.passwordInput}
                />
                <TouchableOpacity onPress={() => setShowBackupPassword(v => !v)}>
                  <Ionicons
                    name={showBackupPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={theme.colors.muted}
                  />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, (exporting || backupPassword.length < 8) && styles.buttonDisabled]}
                onPress={handleBackupExport}
                disabled={exporting || backupPassword.length < 8}
              >
                <Text style={styles.primaryText}>{exporting ? 'Preparing…' : 'Export Encrypted Keystore'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.metaText}>No identity has been imported on this device yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  filePicker: {
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.cardMuted,
  },
  fileInfo: {
    flex: 1,
  },
  fileLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  fileHint: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
  },
  inputLabel: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  passwordRow: {
    marginTop: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.cardMuted,
    gap: theme.spacing.sm,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },
  status: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
  },
  statusErrorText: {
    color: theme.colors.danger,
  },
  statusSuccessText: {
    color: theme.colors.success,
  },
  statusInfoText: {
    color: theme.colors.info,
  },
  statusError: {
    backgroundColor: theme.colors.dangerSurface,
    borderColor: theme.colors.dangerBorder,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: theme.colors.successSurface,
    borderColor: theme.colors.successBorder,
    borderWidth: 1,
  },
  statusInfo: {
    backgroundColor: theme.colors.infoSurface,
    borderColor: theme.colors.infoBorder,
    borderWidth: 1,
  },
  primaryButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.sm + 6,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: theme.typography.sizes.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  didLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
  },
  didValue: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  metaText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
    marginTop: theme.spacing.sm,
  },
  identityPreview: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  identityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  identityActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.cardMuted,
  },
  secondaryButtonText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  outlineDangerButton: {
    flex: 1,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.dangerSurface,
  },
  outlineDangerText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 1.5,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
  },
  statusChipInfo: {
    backgroundColor: theme.colors.infoSurface,
    borderColor: theme.colors.infoBorder,
  },
  statusChipSuccess: {
    backgroundColor: theme.colors.successSurface,
    borderColor: theme.colors.successBorder,
  },
  statusChipText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
  },
  backupCard: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardMuted,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  backupTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '700',
    color: theme.colors.text,
  },
  backupHint: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
});
