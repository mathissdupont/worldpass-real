import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Platform, ScrollView } from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { useWallet } from '../context/WalletContext';
import { ToastAndroid } from 'react-native';

// NFC alma simülasyonu (gerçek NFC için native modül gerekir)
const receiveNfc = async (onResult) => {
  if (Platform.OS === 'android') {
    setTimeout(() => onResult && onResult('{"nfc":"simulated"}'), 1200);
    ToastAndroid.show('NFC ile alma simüle edildi', ToastAndroid.SHORT);
  } else {
    alert('NFC alma sadece Android cihazlarda desteklenir.');
    onResult && onResult(null);
  }
};

export default function ReceiveInfoScreen() {
  const { addCredential } = useWallet();
  const [vcText, setVcText] = useState('');
  const [status, setStatus] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const handleAdd = () => {
    try {
      const obj = JSON.parse(vcText);
      addCredential(obj);
      setStatus('Credential başarıyla eklendi!');
      setVcText('');
    } catch {
      setStatus('Geçersiz JSON veya credential.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>VC Al</Text>
      <TouchableOpacity style={styles.scanBtn} onPress={() => setShowScanner(true)}>
        <Text style={styles.scanBtnText}>QR ile Tara</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.nfcBtn} onPress={() => {
        setStatus('NFC ile bekleniyor...');
        receiveNfc(data => {
          if (data) {
            setVcText(data);
            setStatus('NFC ile veri alındı. JSON kutusuna yapıştırıldı.');
          } else {
            setStatus('NFC ile veri alınamadı.');
          }
        });
      }}>
        <Text style={styles.nfcBtnText}>NFC ile Al</Text>
      </TouchableOpacity>
      <Text style={styles.label}>VC JSON</Text>
      <TextInput
        style={styles.input}
        value={vcText}
        onChangeText={setVcText}
        placeholder="VC JSON'u buraya yapıştır veya tara/NFC ile al"
        multiline
        numberOfLines={6}
      />
      <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
        <Text style={styles.addBtnText}>Cüzdana Ekle</Text>
      </TouchableOpacity>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {showScanner && (
        <QRCodeScanner
          onRead={e => {
            setVcText(e.data);
            setShowScanner(false);
            setStatus('QR ile veri alındı. JSON kutusuna yapıştırıldı.');
          }}
          topContent={<Text>QR kodu tara</Text>}
          bottomContent={
            <TouchableOpacity onPress={() => setShowScanner(false)}>
              <Text style={{ color: '#007aff', marginTop: 16 }}>Kapat</Text>
            </TouchableOpacity>
          }
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'stretch' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  scanBtn: { backgroundColor: '#4f8cff', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  scanBtnText: { color: '#fff', fontWeight: 'bold' },
  nfcBtn: { backgroundColor: '#007aff', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  nfcBtnText: { color: '#fff', fontWeight: 'bold' },
  label: { fontWeight: 'bold', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top' },
  addBtn: { backgroundColor: '#2ecc40', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  status: { marginTop: 10, color: '#007aff' },
});
