import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useIdentity } from '../context/IdentityContext';
import { useAuth } from '../context/AuthContext';
import { 
  loginIssuer, 
  registerIssuer, 
  getIssuerProfile,
  listTemplates,
  createTemplate,
} from '../lib/api';
import { signVC } from '../lib/crypto';
import { createCredentialQR } from '../lib/qr';
import QRCode from 'react-native-qrcode-svg';

export default function IssuerScreen() {
  const { theme } = useTheme();
  const { identity } = useIdentity();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Auth state
  const [isIssuerLoggedIn, setIsIssuerLoggedIn] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [issuerEmail, setIssuerEmail] = useState('');
  const [issuerPassword, setIssuerPassword] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [issuerProfile, setIssuerProfile] = useState(null);

  // Issuance state
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [subjectDid, setSubjectDid] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [vcType, setVcType] = useState('IdentityCredential');
  const [loading, setLoading] = useState(false);
  const [issuedVC, setIssuedVC] = useState(null);
  const [qrValue, setQrValue] = useState('');

  const issuerDid = identity?.did;
  const issuerReady = Boolean(issuerDid);

  useEffect(() => {
    if (issuerReady) {
      loadTemplates();
    }
  }, [issuerReady]);

  const loadTemplates = async () => {
    try {
      const result = await listTemplates();
      setTemplates(result?.templates || []);
    } catch (err) {
      console.warn('Failed to load templates:', err?.message || err);
    }
  };

  const handleIssuerAuth = async () => {
    if (!issuerEmail || !issuerPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (authMode === 'login') {
        result = await loginIssuer({ email: issuerEmail, password: issuerPassword });
      } else {
        if (!issuerName) {
          Alert.alert('Error', 'Please enter your name');
          return;
        }
        result = await registerIssuer({
          email: issuerEmail,
          password: issuerPassword,
          name: issuerName,
        });
      }

      setIsIssuerLoggedIn(true);
      setShowAuth(false);
      
      // Load profile
      const profile = await getIssuerProfile();
      setIssuerProfile(profile?.issuer || null);
      
      Alert.alert('Success', `${authMode === 'login' ? 'Logged in' : 'Registered'} successfully`);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCredential = async () => {
    if (!issuerReady) {
      Alert.alert('Error', 'You need a DID identity to issue credentials');
      return;
    }

    if (!subjectDid || !subjectName) {
      Alert.alert('Error', 'Please fill in subject DID and name');
      return;
    }

    if (!subjectDid.startsWith('did:')) {
      Alert.alert('Error', 'Subject DID must start with "did:"');
      return;
    }

    setLoading(true);
    setIssuedVC(null);
    setQrValue('');

    try {
      // Build VC body
      const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      const vcBody = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://w3id.org/security/suites/ed25519-2020/v1',
        ],
        type: ['VerifiableCredential', vcType],
        issuer: issuerDid,
        issuanceDate: nowIso,
        credentialSubject: {
          id: subjectDid,
          name: subjectName,
        },
      };

      // Sign the credential
      const sk_b64u = identity.sk_b64u;
      const pk_b64u = identity.pk_b64u;
      const verificationMethod = `${issuerDid}#key-1`;

      const signedVC = await signVC(vcBody, sk_b64u, pk_b64u, verificationMethod);

      setIssuedVC(signedVC);
      setQrValue(createCredentialQR(signedVC));

      Alert.alert('Success', 'Credential issued and signed successfully!');
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to issue credential');
    } finally {
      setLoading(false);
    }
  };

  if (!issuerReady) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.card, theme.shadows.card]}>
          <Ionicons name="shield-outline" size={48} color={theme.colors.muted} />
          <Text style={styles.title}>Issuer Console</Text>
          <Text style={styles.subtitle}>
            You need to create or import a DID identity first to issue credentials.
          </Text>
          <Text style={styles.hint}>
            Go to Settings → Identity to get started.
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (showAuth) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.card, theme.shadows.card]}>
          <Text style={styles.title}>
            {authMode === 'login' ? 'Issuer Login' : 'Register as Issuer'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={theme.colors.muted}
            value={issuerEmail}
            onChangeText={setIssuerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={theme.colors.muted}
            value={issuerPassword}
            onChangeText={setIssuerPassword}
            secureTextEntry
          />

          {authMode === 'register' && (
            <TextInput
              style={styles.input}
              placeholder="Organization Name"
              placeholderTextColor={theme.colors.muted}
              value={issuerName}
              onChangeText={setIssuerName}
            />
          )}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleIssuerAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {authMode === 'login' ? 'Login' : 'Register'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
          >
            <Text style={styles.secondaryButtonText}>
              {authMode === 'login' ? 'Need to register?' : 'Already have an account?'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowAuth(false)}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Issuer Identity Card */}
      <View style={[styles.card, theme.shadows.card]}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>Issuer Identity</Text>
        </View>
        <View style={styles.didContainer}>
          <Text style={styles.label}>DID</Text>
          <Text style={styles.didText}>{issuerDid}</Text>
        </View>
        {user && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Logged in as:</Text>
            <Text style={styles.value}>{user.email || user.name || 'User'}</Text>
          </View>
        )}
      </View>

      {/* Issue Credential Section */}
      <View style={[styles.card, theme.shadows.card]}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text" size={24} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>Issue Credential</Text>
        </View>

        <Text style={styles.label}>Credential Type</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., IdentityCredential, StudentCard"
          placeholderTextColor={theme.colors.muted}
          value={vcType}
          onChangeText={setVcType}
        />

        <Text style={styles.label}>Subject DID</Text>
        <TextInput
          style={styles.input}
          placeholder="did:key:z..."
          placeholderTextColor={theme.colors.muted}
          value={subjectDid}
          onChangeText={setSubjectDid}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Subject Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={theme.colors.muted}
          value={subjectName}
          onChangeText={setSubjectName}
        />

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleIssueCredential}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="create" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Issue & Sign Credential</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Issued Credential Display */}
      {issuedVC && (
        <View style={[styles.card, theme.shadows.card]}>
          <View style={styles.cardHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={[styles.cardTitle, { color: '#10b981' }]}>
              Credential Issued Successfully
            </Text>
          </View>

          {/* QR Code */}
          {qrValue && (
            <View style={styles.qrContainer}>
              <QRCode
                value={qrValue}
                size={200}
                backgroundColor="white"
                color="black"
              />
            </View>
          )}

          {/* Signature Details */}
          <View style={styles.proofSection}>
            <Text style={styles.sectionTitle}>Signature & Proof</Text>
            <View style={styles.proofItem}>
              <Text style={styles.proofLabel}>Type:</Text>
              <Text style={styles.proofValue}>{issuedVC.proof?.type}</Text>
            </View>
            <View style={styles.proofItem}>
              <Text style={styles.proofLabel}>Created:</Text>
              <Text style={styles.proofValue}>{issuedVC.proof?.created}</Text>
            </View>
            <View style={styles.proofItem}>
              <Text style={styles.proofLabel}>JWS Signature:</Text>
              <Text style={styles.proofValue} numberOfLines={2} ellipsizeMode="middle">
                {issuedVC.proof?.jws}
              </Text>
            </View>
            <View style={styles.proofItem}>
              <Text style={styles.proofLabel}>Issuer Public Key:</Text>
              <Text style={styles.proofValue} numberOfLines={2} ellipsizeMode="middle">
                {issuedVC.proof?.issuer_pk_b64u}
              </Text>
            </View>
          </View>

          {/* Credential JSON */}
          <View style={styles.jsonSection}>
            <Text style={styles.sectionTitle}>Full Credential (JSON)</Text>
            <ScrollView horizontal style={styles.jsonScroll}>
              <Text style={styles.jsonText}>
                {JSON.stringify(issuedVC, null, 2)}
              </Text>
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginLeft: 8,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginTop: 16,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.muted,
      textAlign: 'center',
      marginBottom: 8,
    },
    hint: {
      fontSize: 12,
      color: theme.colors.primary,
      textAlign: 'center',
      marginTop: 8,
    },
    didContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    didText: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: theme.colors.text,
      marginTop: 4,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.muted,
      marginTop: 12,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    value: {
      fontSize: 14,
      color: theme.colors.text,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 14,
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: 'center',
      marginTop: 8,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    disabledButton: {
      opacity: 0.6,
    },
    qrContainer: {
      alignItems: 'center',
      padding: 20,
      backgroundColor: 'white',
      borderRadius: 12,
      marginVertical: 16,
    },
    proofSection: {
      marginTop: 16,
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    proofItem: {
      marginBottom: 8,
    },
    proofLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.muted,
      textTransform: 'uppercase',
    },
    proofValue: {
      fontSize: 12,
      fontFamily: 'monospace',
      color: theme.colors.text,
      marginTop: 2,
    },
    jsonSection: {
      marginTop: 16,
    },
    jsonScroll: {
      maxHeight: 200,
    },
    jsonText: {
      fontSize: 10,
      fontFamily: 'monospace',
      color: theme.colors.text,
      backgroundColor: theme.colors.background,
      padding: 12,
      borderRadius: 8,
    },
  });
