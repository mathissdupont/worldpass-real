import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useIdentity } from '../context/IdentityContext';

export default function TestQRScreen() {
  const { identity } = useIdentity();
  const walletDid = identity?.did || 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
  
  const [subjectDid, setSubjectDid] = useState(walletDid);
  const [includeProof, setIncludeProof] = useState(false);

  // Test credential - uses YOUR wallet DID as subject
  const buildTestCredential = () => {
    const base = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://worldpass.id/contexts/v1"
      ],
      "type": ["VerifiableCredential", "TestCredential"],
      "issuer": "did:web:worldpass.id:issuer",
      "issuanceDate": "2025-12-02T00:00:00Z",
      "credentialSubject": {
        "id": subjectDid,
        "name": "Test User",
        "email": "test@example.com",
        "testField": "This is a test credential"
      }
    };

    // Only add proof if enabled
    if (includeProof) {
      base.proof = {
        "type": "Ed25519Signature2020",
        "created": "2025-12-02T00:00:00Z",
        "verificationMethod": "did:web:worldpass.id:issuer#key-1",
        "proofPurpose": "assertionMethod",
        "jws": "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.test-invalid-signature",
        "issuer_pk_b64u": "test-public-key-base64url"
      };
    }

    return base;
  };

  const testCredential = buildTestCredential();
  const qrData = JSON.stringify(testCredential);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Test QR Code</Text>
      <Text style={styles.subtitle}>Scan this with the Scanner tab</Text>
      
      <View style={styles.qrContainer}>
        <QRCode
          value={qrData}
          size={280}
          backgroundColor="white"
        />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Your Wallet DID:</Text>
        <Text style={styles.infoText} numberOfLines={2}>{walletDid}</Text>
      </View>

      <View style={styles.controlBox}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Include Proof (will fail verification)</Text>
          <Switch
            value={includeProof}
            onValueChange={setIncludeProof}
            trackColor={{ false: '#ddd', true: '#4caf50' }}
            thumbColor={includeProof ? '#fff' : '#f4f4f4'}
          />
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Credential Info:</Text>
        <Text style={styles.infoText}>Type: TestCredential</Text>
        <Text style={styles.infoText}>Issuer: did:web:worldpass.id:issuer</Text>
        <Text style={styles.infoText} numberOfLines={1}>Subject: {subjectDid.substring(0, 30)}...</Text>
      </View>

      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={() => setSubjectDid(walletDid)}
      >
        <Text style={styles.refreshButtonText}>🔄 Use My Wallet DID</Text>
      </TouchableOpacity>

      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          {includeProof 
            ? '⚠️ Proof is included but signature is INVALID. Scanner will reject it.'
            : '✅ No proof - Scanner will skip verification and add directly to wallet!'}
        </Text>
      </View>

      <View style={styles.debugBox}>
        <Text style={styles.debugTitle}>QR Data Length:</Text>
        <Text style={styles.debugText}>{qrData.length} characters</Text>
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
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  warningBox: {
    width: '100%',
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 13,
    color: '#e65100',
    lineHeight: 20,
  },
  debugBox: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#666',
  },
  debugText: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'monospace',
  },
  refreshButton: {
    width: '100%',
    backgroundColor: '#4caf50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlBox: {
    width: '100%',
    backgroundColor: '#f3e5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});
