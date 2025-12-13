import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useIdentity } from '../context/IdentityContext';
import { useWallet } from '../context/WalletContext';
import { verifyVC } from '../lib/crypto';
import { readNdefOnce } from '../lib/nfc';
import { verifyCredential as verifyCredentialAPI } from '../lib/api';

export default function VerifyScreen() {
  const { theme } = useTheme();
  const { identity } = useIdentity();
  const { credentials } = useWallet();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [vcText, setVcText] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  const did = identity?.did;
  const identityReady = Boolean(did);
  
  // Request camera permission when scanner is opened
  useEffect(() => {
    if (showScanner) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    }
  }, [showScanner]);

  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);
    setVcText(data);
    setShowScanner(false);
    setVerifyResult({ info: 'QR ile veri alındı. JSON kutusuna yapıştırıldı.' });
    setScanned(false);
  };
  
  // Verification function
  const handleVerify = async () => {
    setLoadingVerify(true);
    setVerifyResult(null);
    
    try {
      // Parse the VC JSON
      const vcObj = JSON.parse(vcText);

      // Try backend verification first (checks revocation status)
      try {
        const backendResult = await verifyCredentialAPI(vcObj);
        setVerifyResult({
          valid: backendResult.valid,
          issuer: backendResult.issuer,
          subject: backendResult.subject,
          reason: backendResult.reason,
          revoked: backendResult.revoked,
          proof: vcObj.proof,
          issuanceDate: vcObj.issuanceDate,
          expirationDate: vcObj.expirationDate,
          type: vcObj.type,
          verifiedBy: 'backend',
        });
        setLoadingVerify(false);
        return;
      } catch (err) {
        console.warn('Backend verification failed, using local verification:', err?.message);
      }

      // Fallback to local crypto verification (offline mode)
      const localResult = await verifyVC(vcObj);

      if (localResult.valid) {
        setVerifyResult({
          valid: true,
          issuer: localResult.issuer,
          subject: localResult.subject,
          reason: localResult.reason,
          proof: vcObj.proof,
          issuanceDate: vcObj.issuanceDate,
          expirationDate: vcObj.expirationDate,
          type: vcObj.type,
          verifiedBy: 'offline',
        });
      } else {
        setVerifyResult({
          valid: false,
          reason: localResult.reason,
          error: `Verification failed: ${localResult.reason}`,
        });
      }
    } catch (e) {
      setVerifyResult({ 
        valid: false, 
        error: 'Verification error: ' + e.message 
      });
    }
    setLoadingVerify(false);
  };

  const handleNfcReceive = async () => {
    setVerifyResult(null);
    setVcText('');
    const result = await readNdefOnce();
    if (result.ok && result.data) {
      setVcText(result.data);
      setVerifyResult({ info: 'NFC ile veri alındı. JSON kutusuna yapıştırıldı.' });
    } else {
      Alert.alert('NFC', result.reason === 'unavailable' ? 'Bu cihazda NFC desteklenmiyor.' : 'NFC okuma başarısız');
      setVerifyResult({ error: 'NFC ile veri alınamadı.' });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons
            name="shield-checkmark-outline"
            size={32}
            color={theme.colors.primary}
          />
          <Text style={styles.title}>Credential Doğrulama</Text>
          <Text style={styles.subtitle}>
            QR, NFC veya manuel JSON ile VC doğrula
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <TouchableOpacity 
            style={[styles.primaryButton, { flex: 1 }]} 
            onPress={() => setShowScanner(true)}
          >
            <Ionicons name="qr-code" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>QR Tara</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.secondaryButton, { flex: 1 }]} 
            onPress={handleNfcReceive}
          >
            <Ionicons name="swap-horizontal" size={18} color={theme.colors.primary} />
            <Text style={styles.secondaryButtonText}>NFC ile Al</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>VC JSON</Text>
          <TextInput
            style={styles.textArea}
            value={vcText}
            onChangeText={setVcText}
            multiline
            numberOfLines={6}
            placeholder="VC JSON'u buraya yapıştır veya tara/NFC ile al"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.sectionHint}>
            Tam VC gövdesini buraya yapıştırmalısın.
          </Text>
        </View>

        <TouchableOpacity 
          style={[
            styles.primaryButton, 
            { marginBottom: 16 },
            (loadingVerify || !vcText) && styles.buttonDisabled
          ]} 
          onPress={handleVerify} 
          disabled={loadingVerify || !vcText}
        >
          {loadingVerify ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Doğrula</Text>
            </>
          )}
        </TouchableOpacity>

        <Modal
          visible={showScanner}
          animationType="slide"
          onRequestClose={() => setShowScanner(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            {hasPermission === null ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff' }}>Kamera izni isteniyor...</Text>
              </View>
            ) : hasPermission === false ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <Ionicons name="camera-off" size={64} color="#999" />
                <Text style={{ color: '#fff', marginTop: 16, textAlign: 'center' }}>
                  Kamera izni gerekli
                </Text>
                <TouchableOpacity
                  style={{
                    marginTop: 20,
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 8,
                  }}
                  onPress={async () => {
                    const { status } = await Camera.requestCameraPermissionsAsync();
                    setHasPermission(status === 'granted');
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>İzin Ver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginTop: 12 }}
                  onPress={() => setShowScanner(false)}
                >
                  <Text style={{ color: '#007aff' }}>İptal</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  barcodeScannerSettings={{ barCodeTypes: ['qr'] }}
                />
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 250,
                      height: 250,
                      borderWidth: 3,
                      borderColor: theme.colors.primary,
                      borderRadius: 16,
                      backgroundColor: 'transparent',
                    }}
                  />
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: '600',
                      marginTop: 24,
                      textAlign: 'center',
                    }}
                  >
                    QR kodu çerçeveye hizala
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    top: 50,
                    right: 20,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: 12,
                    borderRadius: 20,
                  }}
                  onPress={() => {
                    setShowScanner(false);
                    setScanned(false);
                  }}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </Modal>

        {verifyResult && (
          <View style={{ 
            marginTop: 12, 
            padding: 12, 
            borderRadius: 8, 
            backgroundColor: verifyResult.valid ? '#e0ffe0' : verifyResult.info ? '#e0f0ff' : '#ffe0e0' 
          }}>
            {verifyResult.info && <Text style={{ color: '#007aff' }}>{verifyResult.info}</Text>}
            {verifyResult.valid !== undefined && (
              <>
                <Text style={{ 
                  fontWeight: 'bold', 
                  color: verifyResult.valid ? 'green' : 'red', 
                  fontSize: 16, 
                  marginBottom: 8 
                }}>
                  {verifyResult.valid ? '✅ Valid Credential' : '❌ Invalid Credential'}
                </Text>
                
                {verifyResult.valid && verifyResult.proof && (
                  <View style={{ 
                    marginTop: 8, 
                    padding: 8, 
                    backgroundColor: 'rgba(0,0,0,0.05)', 
                    borderRadius: 6 
                  }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>
                      Signature & Proof:
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: 'monospace' }}>
                      Type: {verifyResult.proof.type}
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: 'monospace' }}>
                      Created: {verifyResult.proof.created}
                    </Text>
                    <Text style={{ fontSize: 10, fontFamily: 'monospace' }}>
                      Verification Method: {verifyResult.proof.verificationMethod}
                    </Text>
                    <Text 
                      style={{ fontSize: 10, fontFamily: 'monospace' }} 
                      numberOfLines={1} 
                      ellipsizeMode="middle"
                    >
                      JWS: {verifyResult.proof.jws}
                    </Text>
                    <Text 
                      style={{ fontSize: 10, fontFamily: 'monospace' }} 
                      numberOfLines={1} 
                      ellipsizeMode="middle"
                    >
                      Issuer PK: {verifyResult.proof.issuer_pk_b64u}
                    </Text>
                  </View>
                )}
                
                {verifyResult.valid && (
                  <View style={{ marginTop: 8 }}>
                    {verifyResult.issuer && (
                      <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>
                        Issuer: {verifyResult.issuer}
                      </Text>
                    )}
                    {verifyResult.subject && (
                      <Text style={{ fontSize: 11, fontFamily: 'monospace' }}>
                        Subject: {verifyResult.subject}
                      </Text>
                    )}
                    {verifyResult.issuanceDate && (
                      <Text style={{ fontSize: 11 }}>
                        Issued: {new Date(verifyResult.issuanceDate).toLocaleString()}
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}
            {verifyResult.error && (
              <Text style={{ color: 'red', marginTop: 4 }}>{verifyResult.error}</Text>
            )}
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Creds</Text>
            <Text style={styles.metaValue}>{credentials.length}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Kimlik</Text>
            <Text style={styles.metaValue}>{identityReady ? 'Bağlı' : 'Eksik'}</Text>
          </View>
        </View>

        <View style={styles.footerInfo}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={theme.colors.textMuted}
          />
          <Text style={styles.footerText}>
            QR ile credential tarayıp cüzdana eklemek için Wallet sekmesindeki
            Scanner ekranını kullanabilirsin. Bu ekran, özellikle manuel JSON
            doğrulama ve ileride NFC senaryoları için tasarlandı.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    header: {
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: '700',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
      lineHeight: 20,
    },
    section: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    sectionLabel: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    sectionHint: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.xs,
    },
    textArea: {
      minHeight: 140,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      backgroundColor: theme.colors.card,
      textAlignVertical: 'top',
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    primaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm + 4,
      borderRadius: theme.radii.lg,
    },
    primaryButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: theme.typography.sizes.sm,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm + 4,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.card,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: theme.typography.sizes.xs,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      marginTop: theme.spacing.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    metaItem: {
      alignItems: 'center',
    },
    metaDivider: {
      width: 1,
      height: 32,
      backgroundColor: theme.colors.border,
    },
    metaLabel: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textMuted,
      marginBottom: 4,
    },
    metaValue: {
      fontSize: theme.typography.sizes.md,
      fontWeight: '600',
      color: theme.colors.text,
    },
    footerInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: theme.spacing.md,
    },
    footerText: {
      flex: 1,
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textMuted,
      lineHeight: 18,
    },
  });
