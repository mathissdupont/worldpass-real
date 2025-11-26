import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import { verifyCredential } from '../lib/api';
import { addCredential } from '../lib/storage';

export default function ScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      setRequestingPermission(true);
      const { status } = await BarCodeScanner.requestPermissionsAsync();
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
      <BarCodeScanner
        style={StyleSheet.absoluteFillObject}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.instructions}>
            {scanning ? 'Verifying...' : 'Align QR code within frame'}
          </Text>
        </View>
      </BarCodeScanner>

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
