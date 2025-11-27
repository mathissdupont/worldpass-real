import React, { useState, useEffect } from 'react';
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
import { addCredential } from '../lib/storage';
import { useNavigation } from '@react-navigation/native';
import { useIdentity } from '../context/IdentityContext';

export default function ScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const { identity } = useIdentity();
  const navigation = useNavigation();
  const walletDid = identity?.did || '';

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
      Alert.alert(
        'Import identity',
        'You need to import your wallet identity before adding new credentials.',
        [
          {
            text: 'Go to Identity',
            onPress: () => navigation.navigate('Settings', { screen: 'IdentityImport' }),
          },
          { text: 'Cancel', style: 'cancel', onPress: resetScanner },
        ],
      );
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
        await addCredential(vcData);
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
      <View style={styles.container}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!walletDid) {
    return (
      <View style={styles.identityContainer}>
        <Ionicons name="shield-outline" size={72} color="#6366f1" />
        <Text style={styles.identityTitle}>Import your identity</Text>
        <Text style={styles.identityText}>
          Load your .wpkeystore in Settings before scanning credentials.
        </Text>
        <TouchableOpacity
          style={styles.identityButton}
          onPress={() => navigation.navigate('Settings', { screen: 'IdentityImport' })}
        >
          <Text style={styles.identityButtonText}>Manage Identity</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-off" size={64} color="#ef4444" />
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
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barCodeTypes: ['qr'] }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.instructions}>
            {scanning ? 'Verifying...' : 'Align QR code within frame'}
          </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#6366f1',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  instructions: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 32,
    textAlign: 'center',
  },
  identityContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  identityTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  identityText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  identityButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  identityButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
  },
  rescanButton: {
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  rescanText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
