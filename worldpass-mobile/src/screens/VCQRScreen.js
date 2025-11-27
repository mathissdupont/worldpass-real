import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function VCQRScreen({ route, navigation }) {
  const { credential } = route.params || {};
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  if (!credential) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>No credential provided</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const vcData = JSON.stringify({ type: 'vc', jti: credential.jti, issuer: credential.issuer });
  const vcTypes = Array.isArray(credential.type) ? credential.type : [credential.type];
  const primaryType = vcTypes.find(t => t !== 'VerifiableCredential') || vcTypes[0] || 'Credential';

  const copyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(JSON.stringify(credential, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const copyJti = async () => {
    try {
      await Clipboard.setStringAsync(credential.jti || '');
      Alert.alert('Copied', 'JTI copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy');
    }
  };

  const shareCredential = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
        return;
      }

      // Sanitize filename to prevent path injection
      const sanitizeFilename = (str) => {
        if (!str) return 'credential';
        // Remove any path traversal characters and special chars
        return str.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
      };
      
      const safeFilename = sanitizeFilename(credential.jti);
      const fileUri = `${FileSystem.cacheDirectory}${safeFilename}.wpvc`;
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(credential, null, 2));
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Share Credential',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share credential');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const shortString = (str, maxLen = 20) => {
    if (!str) return 'N/A';
    if (str.length <= maxLen) return str;
    return `${str.slice(0, maxLen / 2)}...${str.slice(-maxLen / 2)}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* QR Code Card */}
      <View style={styles.qrCard}>
        <View style={styles.qrContainer}>
          <QRCode
            value={vcData}
            size={220}
            backgroundColor="#fff"
            color="#111827"
            getRef={(ref) => (qrRef.current = ref)}
          />
        </View>
        <Text style={styles.qrHint}>
          Scan this QR code to verify the credential
        </Text>
      </View>

      {/* Credential Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View style={styles.typeIcon}>
            <Ionicons name="document-text" size={24} color="#4f46e5" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.credentialType}>{primaryType}</Text>
            <Text style={styles.credentialSubtype}>
              {vcTypes.join(', ')}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>JTI (ID)</Text>
          <TouchableOpacity style={styles.infoValueRow} onPress={copyJti}>
            <Text style={styles.infoValueMono}>{shortString(credential.jti, 30)}</Text>
            <Ionicons name="copy-outline" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Issuer</Text>
          <Text style={styles.infoValueMono}>{shortString(credential.issuer, 30)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Issued</Text>
          <Text style={styles.infoValue}>{formatDate(credential.issuanceDate)}</Text>
        </View>

        {credential.expirationDate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expires</Text>
            <Text style={styles.infoValue}>{formatDate(credential.expirationDate)}</Text>
          </View>
        )}

        {credential.credentialSubject?.id && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subject</Text>
            <Text style={styles.infoValueMono}>
              {shortString(credential.credentialSubject.id, 30)}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, copied && styles.actionButtonSuccess]}
          onPress={copyToClipboard}
        >
          <Ionicons 
            name={copied ? 'checkmark' : 'copy-outline'} 
            size={20} 
            color={copied ? '#22c55e' : '#4f46e5'} 
          />
          <Text style={[styles.actionButtonText, copied && styles.actionButtonTextSuccess]}>
            {copied ? 'Copied!' : 'Copy JSON'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={shareCredential}
        >
          <Ionicons name="share-outline" size={20} color="#4f46e5" />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* JSON Preview */}
      <View style={styles.jsonCard}>
        <View style={styles.jsonHeader}>
          <Text style={styles.jsonTitle}>Credential JSON</Text>
          <TouchableOpacity onPress={copyToClipboard}>
            <Ionicons name="copy-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.jsonScroll} horizontal>
          <Text style={styles.jsonText}>
            {JSON.stringify(credential, null, 2)}
          </Text>
        </ScrollView>
      </View>

      {/* Warning */}
      <View style={styles.warningBox}>
        <Ionicons name="information-circle" size={20} color="#3b82f6" />
        <Text style={styles.warningText}>
          This QR code contains a reference to your credential. 
          Share only with trusted parties for verification purposes.
        </Text>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  qrHint: {
    marginTop: 16,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  credentialType: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  credentialSubtype: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
  },
  infoValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoValueMono: {
    fontSize: 13,
    color: '#111827',
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionButtonSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
  },
  actionButtonTextSuccess: {
    color: '#22c55e',
  },
  jsonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  jsonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jsonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  jsonScroll: {
    maxHeight: 200,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  jsonText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#374151',
    lineHeight: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
