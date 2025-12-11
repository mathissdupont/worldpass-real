import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
  ToastAndroid,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, Camera } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { verifyCredential } from '../lib/api';
import { useIdentity } from '../context/IdentityContext';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { formatRelativeTime } from '../lib/time';
import { parseQRData } from '../lib/qr';
import { verifyVC } from '../lib/crypto';

export default function ScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [pasting, setPasting] = useState(false);

  const { identity, linking, error: identityError, linkTelemetry } = useIdentity();
  const { addCredential: addCredentialToWallet } = useWallet();
  const navigation = useNavigation();
  const walletDid = identity?.did || '';
  const identityMissing = !walletDid;

  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const lastSuccessfulSync = linkTelemetry?.lastSuccessAt
    ? formatRelativeTime(linkTelemetry.lastSuccessAt)
    : '';

  const statusBanner = useMemo(() => {
    if (identityError) {
      return {
        text: 'DID hesabına bağlanırken sorun oluştu. Settings > Identity bölümünden yeniden deneyebilirsin.',
        tone: 'error',
      };
    }
    if (linking) {
      return {
        text: 'DID hesaba bağlanıyor…',
        tone: 'info',
      };
    }
    if (lastSuccessfulSync) {
      return {
        text: `DID synced ${lastSuccessfulSync}`,
        tone: 'success',
      };
    }
    return null;
  }, [identityError, lastSuccessfulSync, linking]);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      setRequestingPermission(true);
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.warn('Camera permission request failed', error);
      setHasPermission(false);
    } finally {
      setRequestingPermission(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
  };

  const extractVcFromPayload = (raw) => {
    // QR payload’ını olabildiğince esnek yorumla
    let parsed = raw;

    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        // string ama JSON değil -> desteklemiyoruz (URL vs.)
        return null;
      }
    }

    if (!parsed || typeof parsed !== 'object') return null;

    // { vc: {...} } diye geldiyse
    if (parsed.vc && typeof parsed.vc === 'object') {
      return parsed.vc;
    }

    // { credential: {...} } diye geldiyse
    if (parsed.credential && typeof parsed.credential === 'object') {
      return parsed.credential;
    }

    // Doğrudan VC objesi gibi görünüyorsa
    if (
      parsed['@context'] &&
      parsed.type &&
      parsed.issuer &&
      parsed.credentialSubject
    ) {
      return parsed;
    }

    return null;
  };

  const handleBarCodeScanned = async ({ data }, force = false) => {
    if (!force && (scanned || scanning)) {
      console.log('Scanner busy, ignoring scan');
      if (Platform.OS === 'android') {
        ToastAndroid.show('Scanner meşgul...', ToastAndroid.SHORT);
      }
      return;
    }
    if (!walletDid) {
      console.log('No wallet DID, ignoring scan');
      Alert.alert('Hata', 'Wallet DID bulunamadı!');
      return;
    }

    console.log('🔍 QR Code scanned! Data length:', data?.length);
    if (Platform.OS === 'android') {
      ToastAndroid.show('QR tarandı! İşleniyor...', ToastAndroid.SHORT);
    }
    
    setScanned(true);
    setScanning(true);

    try {
      // Parse QR data to determine type
      const parsed = parseQRData(data);
      console.log('📦 Parsed QR type:', parsed.type);
      console.log('📄 Full parsed data:', JSON.stringify(parsed.data, null, 2));
      
      if (parsed.type === 'credential') {
        const vcData = parsed.data;
        console.log('✅ Credential found!');
        console.log('  Type:', vcData?.type);
        console.log('  Issuer:', vcData?.issuer);
        console.log('  Subject:', vcData?.credentialSubject?.id);
        
        if (Platform.OS === 'android') {
          ToastAndroid.show('Credential bulundu! Doğrulanıyor...', ToastAndroid.LONG);
        }
        
        // Verify the credential locally
        console.log('🔐 Verifying credential...');
        const verifyResult = await verifyVC(vcData);
        console.log('🔐 Verification result:', JSON.stringify(verifyResult, null, 2));

        if (!verifyResult.valid) {
          setScanning(false);
          Alert.alert(
            'Invalid Credential',
            `Verification failed: ${verifyResult.reason}`,
            [{ text: 'OK', onPress: resetScanner }]
          );
          return;
        }

        const subjectDid = vcData?.credentialSubject?.id;
        console.log('Subject DID:', subjectDid, 'Wallet DID:', walletDid);
        
        if (subjectDid && subjectDid !== walletDid) {
          setScanning(false);
          Alert.alert(
            'Wrong identity',
            'This credential is not issued to your DID.',
            [{ text: 'OK', onPress: resetScanner }]
          );
          return;
        }

        // Add to wallet
        console.log('💾 Adding credential to wallet...');
        await addCredentialToWallet(vcData);
        console.log('✅ Credential added successfully!');
        
        if (Platform.OS === 'android') {
          ToastAndroid.show('✅ Credential eklendi!', ToastAndroid.LONG);
        }
        
        setScanning(false);
        Alert.alert(
          '✅ Credential Eklendi',
          'Credential doğrulandı ve wallet\'a eklendi.',
          [{ text: 'Tamam', onPress: () => {
            resetScanner();
            navigation.navigate('Wallet');
          }}]
        );
      } else if (parsed.type === 'did') {
        setScanning(false);
        Alert.alert(
          'DID Scanned',
          `DID: ${parsed.data.did}`,
          [{ text: 'OK', onPress: resetScanner }]
        );
      } else {
        setScanning(false);
        Alert.alert(
          'QR Code Scanned',
          `Type: ${parsed.type}\nData: ${JSON.stringify(parsed.data).substring(0, 100)}`,
          [{ text: 'OK', onPress: resetScanner }]
        );
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      setScanning(false);
      Alert.alert(
        'Error',
        error.message || 'Failed to process QR code',
        [{ text: 'OK', onPress: resetScanner }]
      );
    }
  };

  const handlePasteFromClipboard = async () => {
    setPasting(true);
    try {
      const text = await Clipboard.getStringAsync();
      if (!text) {
        Alert.alert('Panoda veri yok', 'Panoda JSON/QR içeriği bulunamadı.');
        return;
      }
      await handleBarCodeScanned({ data: text }, true);
    } catch (err) {
      Alert.alert('Hata', err?.message || 'Panodan okuma başarısız');
    } finally {
      setPasting(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (identityMissing) {
    return (
      <SafeAreaView style={styles.identityContainer}>
        <Ionicons name="shield-outline" size={72} color={theme.colors.primary} />
        <Text style={styles.identityTitle}>Identity Required</Text>
        <Text style={styles.identityText}>
          Create a new DID or import an existing `.wpkeystore` file to start scanning QR codes.
        </Text>
        <View style={styles.identityActions}>
          <TouchableOpacity
            style={styles.identityPrimary}
            onPress={() => navigation.navigate('IdentityCreate')}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.identityPrimaryText}>Create Identity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.identitySecondary}
            onPress={() =>
              navigation.navigate('Settings', { screen: 'IdentityImport' })
            }
          >
            <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.identitySecondaryText}>Import .wpkeystore</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.stateContainer}>
        <Ionicons name="camera-off" size={64} color={theme.colors.danger} />
        <Text style={styles.errorTitle}>Camera Access Required</Text>
        <Text style={styles.errorText}>
          WorldPass, QR kodlarını taramak için kamera erişimine ihtiyaç duyar.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestCameraPermission}
          disabled={requestingPermission}
        >
          <Text style={styles.buttonText}>
            {requestingPermission ? 'Requesting...' : 'Grant Permission'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.scannerShell}>
      {/* Kamera **tek başına**, children YOK */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barCodeTypes: ['qr'] }}
        enableTorch={torchOn}
      />

      {/* Overlay’i dışarıda, absolute ile üstüne koyuyoruz */}
      <View style={styles.overlay}>
        {statusBanner && (
          <View
            style={[
              styles.statusBanner,
              statusBanner.tone === 'error' && styles.statusBannerError,
              statusBanner.tone === 'info' && styles.statusBannerInfo,
              statusBanner.tone === 'success' && styles.statusBannerSuccess,
            ]}
          >
            <Ionicons
              name={
                statusBanner.tone === 'error'
                  ? 'alert-circle'
                  : statusBanner.tone === 'info'
                  ? 'refresh'
                  : 'shield-checkmark'
              }
              size={16}
              color={
                statusBanner.tone === 'error'
                  ? theme.colors.danger
                  : statusBanner.tone === 'info'
                  ? theme.colors.info
                  : theme.colors.success
              }
            />
            <Text
              style={[
                styles.statusBannerText,
                {
                  color:
                    statusBanner.tone === 'error'
                      ? theme.colors.danger
                      : statusBanner.tone === 'info'
                      ? theme.colors.info
                      : theme.colors.success,
                },
              ]}
            >
              {statusBanner.text}
            </Text>
          </View>
        )}

        <View style={styles.scanFrame} />
        <Text style={styles.instructions}>
          {scanning ? 'İşleniyor...' : scanned ? 'QR kod tarandı!' : 'QR kodu kareye hizalayın'}
        </Text>
        <Text style={styles.helperText}>
          {scanned && !scanning
            ? 'Yeni bir QR taramak için aşağıdaki butona basın'
            : 'Credential ekledikten sonra keystore yedeğini güncellemeyi unutmayın'}
        </Text>
        <View style={styles.toolRow}>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={() => setTorchOn((v) => !v)}
          >
            <Ionicons name={torchOn ? 'flash' : 'flash-off'} size={18} color="#fff" />
            <Text style={styles.toolText}>{torchOn ? 'Fener Açık' : 'Fener'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolButton}
            onPress={handlePasteFromClipboard}
            disabled={pasting}
          >
            {pasting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="clipboard-outline" size={18} color="#fff" />
            )}
            <Text style={styles.toolText}>Panodan</Text>
          </TouchableOpacity>
        </View>
      </View>

      {scanned && !scanning && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.rescanButton} onPress={resetScanner}>
            <Ionicons name="scan" size={20} color="#fff" />
            <Text style={styles.rescanText}>Tekrar Tara</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    scannerShell: {
      flex: 1,
      backgroundColor: '#000',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      gap: 16,
    },
    scanFrame: {
      width: 250,
      height: 250,
      borderWidth: 3,
      borderColor: theme.colors.primary,
      borderRadius: 18,
      backgroundColor: 'transparent',
    },
    instructions: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginTop: 32,
      textAlign: 'center',
    },
    helperText: {
      color: '#f3f4f6',
      fontSize: 13,
      textAlign: 'center',
    },
    toolRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    toolButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    toolText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 13,
    },
    stateContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    loadingText: {
      color: theme.colors.text,
      fontSize: 16,
    },
    identityContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 16,
    },
    identityTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
    },
    identityText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    identityActions: {
      width: '100%',
      gap: 12,
    },
    identityPrimary: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: theme.radii.lg,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    identityPrimaryText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
    identitySecondary: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.cardSecondary,
    },
    identitySecondaryText: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      padding: 20,
    },
    rescanButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      padding: 16,
      borderRadius: 10,
      justifyContent: 'center',
    },
    rescanText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.danger,
      marginTop: 16,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginTop: 8,
      textAlign: 'center',
    },
    button: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 10,
      marginTop: 24,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    statusBanner: {
      position: 'absolute',
      top: 40,
      left: 24,
      right: 24,
      borderRadius: theme.radii.md,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusBannerInfo: {
      backgroundColor: theme.colors.infoSurface,
    },
    statusBannerError: {
      backgroundColor: theme.colors.dangerSurface,
    },
    statusBannerSuccess: {
      backgroundColor: theme.colors.successSurface,
    },
    statusBannerText: {
      flex: 1,
      fontSize: 13,
    },
  });
