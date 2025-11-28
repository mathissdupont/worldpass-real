import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { verifyCredential } from '../lib/api';
import { useNavigation } from '@react-navigation/native';
import { useIdentity } from '../context/IdentityContext';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { formatRelativeTime } from '../lib/time';

export default function ScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
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

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || scanning) return;
    if (!walletDid) {
      return;
    }
    
    setScanned(true);
    setScanning(true);

    try {
      // Parse QR data
      let vcData;
      try {
        vcData = JSON.parse(data);
      } catch (e) {
        Alert.alert('Invalid QR Code', 'This is not a valid credential QR code');
        resetScanner();
        return;
      }

      // Verify the credential
      const result = await verifyCredential(vcData);

      const subjectDid = vcData?.credentialSubject?.id;
      if (subjectDid && subjectDid !== walletDid) {
        Alert.alert(
          'Wrong identity',
          'This credential is not issued to your DID.',
          [{ text: 'OK', onPress: resetScanner }],
        );
        return;
      }

      if (result.valid) {
        // Save credential
        await addCredentialToWallet(vcData);
        Alert.alert(
          'Success',
          'Credential verified and saved to your wallet!',
          [{ text: 'OK', onPress: resetScanner }]
        );
      } else {
        Alert.alert(
          'Verification Failed',
          result.reason || 'The credential could not be verified',
          [{ text: 'OK', onPress: resetScanner }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error.message || 'Failed to process credential',
        [{ text: 'OK', onPress: resetScanner }]
      );
    } finally {
      setScanning(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
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
      <View style={styles.identityContainer}>
        <Ionicons name="shield-outline" size={72} color={theme.colors.primary} />
        <Text style={styles.identityTitle}>Kimlik olmadan tarama yapamazsın</Text>
        <Text style={styles.identityText}>
          Yeni bir DID oluştur veya var olan `.wpkeystore` dosyanı içe aktar ve ardından QR kodlarını taramaya başla.
        </Text>
        <View style={styles.identityActions}>
          <TouchableOpacity style={styles.identityPrimary} onPress={() => navigation.navigate('IdentityCreate')}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.identityPrimaryText}>Kimlik Oluştur</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.identitySecondary}
            onPress={() => navigation.navigate('Settings', { screen: 'IdentityImport' })}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.identitySecondaryText}>.wpkeystore İçe Aktar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.stateContainer}>
        <Ionicons name="camera-off" size={64} color={theme.colors.danger} />
        <Text style={styles.errorTitle}>Camera Access Required</Text>
        <Text style={styles.errorText}>
          WorldPass needs camera access to scan QR codes
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
      </View>
    );
  }

  return (
    <View style={styles.scannerShell}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barCodeTypes: ['qr'] }}
      >
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
                name={statusBanner.tone === 'error' ? 'alert-circle' : statusBanner.tone === 'info' ? 'refresh' : 'shield-checkmark'}
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
            {scanning ? 'Verifying...' : 'Align QR code within frame'}
          </Text>
          <Text style={styles.helperText}>Her credential ekledikten sonra keystore yedeğini güncellemeyi unutma.</Text>
        </View>
      </CameraView>

      {scanned && !scanning && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.rescanButton}
            onPress={resetScanner}
          >
            <Text style={styles.rescanText}>Tap to Scan Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  scannerShell: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
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
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
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
