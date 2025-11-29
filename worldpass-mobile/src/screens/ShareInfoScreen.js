import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useWallet } from '../context/WalletContext';
import QRCode from 'react-native-qrcode-svg';
import { ToastAndroid } from 'react-native';

// NFC paylaşım simülasyonu (gerçek NFC için native modül gerekir)
const sendNfc = async (payload, onResult) => {
  if (Platform.OS === 'android') {
    setTimeout(() => onResult && onResult(true), 1200);
    ToastAndroid.show('NFC ile paylaşım simüle edildi', ToastAndroid.SHORT);
  } else {
    alert('NFC paylaşımı sadece Android cihazlarda desteklenir.');
    onResult && onResult(false);
  }
};

export default function ShareInfoScreen() {
  const { credentials } = useWallet();
  const [selected, setSelected] = useState(null);
  const [nfcStatus, setNfcStatus] = useState('');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Paylaşmak için bir VC seç</Text>
      {credentials.length === 0 && (
        <Text style={styles.info}>Cüzdanında paylaşılacak credential yok.</Text>
      )}
      {credentials.map((cred, idx) => (
        <TouchableOpacity
          key={cred.jti || cred.id || idx}
          style={[styles.credBtn, selected === cred ? styles.credBtnActive : null]}
          onPress={() => setSelected(cred)}
        >
          <Text style={styles.credBtnText}>{cred.type?.slice(-1)[0] || 'VC'} - {cred.issuer?.slice(0, 16)}</Text>
        </TouchableOpacity>
      ))}
      {selected && (
        <View style={styles.shareBox}>
          <Text style={styles.label}>QR ile Paylaş</Text>
          <View style={{ alignItems: 'center', marginVertical: 12 }}>
            <QRCode value={JSON.stringify(selected)} size={180} />
          </View>
          <TouchableOpacity
            style={styles.nfcBtn}
            onPress={() => {
              setNfcStatus('NFC ile aktarılıyor...');
              sendNfc(selected, ok => setNfcStatus(ok ? 'NFC ile gönderildi (simülasyon)' : 'NFC ile gönderilemedi.'));
            }}
          >
            <Text style={styles.nfcBtnText}>NFC ile Paylaş</Text>
          </TouchableOpacity>
          {nfcStatus ? <Text style={styles.nfcStatus}>{nfcStatus}</Text> : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'stretch' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  info: { color: '#888', marginBottom: 16 },
  credBtn: { backgroundColor: '#eee', padding: 14, borderRadius: 8, marginBottom: 10 },
  credBtnActive: { backgroundColor: '#cce5ff' },
  credBtnText: { fontSize: 16 },
  shareBox: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 16, marginTop: 18 },
  label: { fontWeight: 'bold', marginBottom: 8 },
  nfcBtn: { backgroundColor: '#007aff', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  nfcBtnText: { color: '#fff', fontWeight: 'bold' },
  nfcStatus: { marginTop: 8, color: '#007aff' },
});
