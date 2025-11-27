import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useIdentity } from '../context/IdentityContext';

export default function IdentityImportScreen() {
  const { identity, importFromKeystore, clearIdentity, linking } = useIdentity();
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

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
      <View style={styles.card}>
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

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current Identity</Text>
        {identity?.did ? (
          <View>
            <Text style={styles.didLabel}>Linked DID</Text>
            <Text style={styles.didValue}>{identity.did}</Text>
            <Text style={styles.metaText}>{linking ? 'Syncing with your account…' : 'This DID stays encrypted locally.'}</Text>
            <TouchableOpacity style={styles.dangerButton} onPress={confirmClearIdentity}>
              <Text style={styles.dangerText}>Remove Identity</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.metaText}>No identity has been imported on this device yet.</Text>
        )}
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
    gap: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  filePicker: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  fileHint: {
    fontSize: 12,
    color: '#9ca3af',
  },
  inputLabel: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  passwordRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  status: {
    marginTop: 16,
    borderRadius: 12,
    padding: 12,
  },
  statusText: {
    fontSize: 13,
  },
  statusErrorText: {
    color: '#991b1b',
  },
  statusSuccessText: {
    color: '#065f46',
  },
  statusInfoText: {
    color: '#3730a3',
  },
  statusError: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
    borderWidth: 1,
  },
  statusInfo: {
    backgroundColor: '#e0e7ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  didLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  didValue: {
    fontSize: 14,
    color: '#111827',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 12,
  },
  dangerButton: {
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
  },
  dangerText: {
    color: '#b91c1c',
    fontWeight: '600',
  },
});
