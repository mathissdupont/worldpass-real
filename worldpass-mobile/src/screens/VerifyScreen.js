import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useIdentity } from '../context/IdentityContext';
import { useWallet } from '../context/WalletContext';

export default function VerifyScreen({ navigation }) {
  const [vcText, setVcText] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
    // Backend doğrulama fonksiyonu
    const handleVerify = async () => {
      setLoadingVerify(true);
      setVerifyResult(null);
      try {
        const resp = await fetch('https://worldpass-beta.heptapusgroup.com/api/vc/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: vcText,
        });
        const data = await resp.json();
        setVerifyResult(data);
      } catch (e) {
        setVerifyResult({ valid: false, error: 'Doğrulama hatası: ' + e.message });
      }
      setLoadingVerify(false);
    };
  const { theme } = useTheme();
  const { identity, linking } = useIdentity();
  const { credentials } = useWallet();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const did = identity?.did;
  const identityReady = Boolean(did);

  const openScanner = () => {
    navigation.navigate('VerifyScanner');
  };

  const openIdentity = (screen) => {
    const parent = navigation.getParent?.();
    if (screen) {
      parent?.navigate('Settings', { screen });
    } else {
      parent?.navigate('Settings');
    }
  };

  const statusPill = () => {
    if (linking) {
      return (
        <View style={[styles.statusPill, styles.statusInfo]}>
          <Ionicons name="refresh" size={14} color={theme.colors.primary} />
          <Text style={styles.statusText}>Bağlantı kuruluyor…</Text>
        </View>
      );
    }
    if (identityReady) {
      return (
        <View style={[styles.statusPill, styles.statusSuccess]}>
          <Ionicons name="shield-checkmark" size={14} color="#10b981" />
          <Text style={styles.statusText}>DID hazır</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusPill, styles.statusWarning]}>
        <Ionicons name="alert-circle" size={14} color="#f97316" />
        <Text style={styles.statusText}>Kimlik yok</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, theme.shadows.card]}>
        {statusPill()}
        <Text style={styles.title}>Verify merkezi</Text>
        <Text style={styles.subtitle}>
          Credential doğrulamayı QR, bağlantı veya NFC isteği üzerinden tamamla. Zararlı istekleri anında reddet.
        </Text>

        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.primaryButton} onPress={openScanner}>
            <Ionicons name="qr-code" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>QR Tara</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => openIdentity('IdentityImport')}
          >
            <Ionicons name="shield" size={18} color={theme.colors.primary} />
            <Text style={styles.secondaryButtonText}>Kimlik yönet</Text>
          </TouchableOpacity>
        </View>

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
      </View>

      <View style={[styles.sectionCard, theme.shadows.card]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Doğrulama</Text>
          <Text style={styles.sectionSubtitle}>QR, NFC veya manuel JSON ile VC doğrula</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={() => setShowScanner(true)}>
            <Ionicons name="qr-code" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>QR Tara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={() => {
            setVerifyResult(null);
            setVcText('');
            receiveNfc(data => {
              if (data) {
                setVcText(data);
                setVerifyResult({ info: 'NFC ile veri alındı. JSON kutusuna yapıştırıldı.' });
              } else {
                setVerifyResult({ error: 'NFC ile veri alınamadı.' });
              }
            });
          }}>
            <Ionicons name="swap-horizontal" size={18} color={theme.colors.primary} />
            <Text style={styles.secondaryButtonText}>NFC ile Al</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.metaLabel}>VC JSON</Text>
        <TextInput
          style={{ backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top', marginBottom: 8 }}
          value={vcText}
          onChangeText={setVcText}
          placeholder="VC JSON'u buraya yapıştır veya tara/NFC ile al"
          multiline
          numberOfLines={6}
        />
        <TouchableOpacity style={[styles.primaryButton, { marginBottom: 8 }]} onPress={handleVerify} disabled={loadingVerify || !vcText}>
          <Text style={styles.primaryButtonText}>{loadingVerify ? 'Doğrulanıyor...' : 'Doğrula'}</Text>
        </TouchableOpacity>
        {showScanner && (
          <QRCodeScanner
            onRead={e => {
              setVcText(e.data);
              setShowScanner(false);
              setVerifyResult({ info: 'QR ile veri alındı. JSON kutusuna yapıştırıldı.' });
            }}
            topContent={<Text>QR kodu tara</Text>}
            bottomContent={
              <TouchableOpacity onPress={() => setShowScanner(false)}>
                <Text style={{ color: '#007aff', marginTop: 16 }}>Kapat</Text>
              </TouchableOpacity>
            }
          />
        )}
        {verifyResult && (
          <View style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: verifyResult.valid ? '#e0ffe0' : '#ffe0e0' }}>
            {verifyResult.info && <Text style={{ color: '#007aff' }}>{verifyResult.info}</Text>}
            {verifyResult.valid !== undefined && (
              <Text style={{ fontWeight: 'bold', color: verifyResult.valid ? 'green' : 'red' }}>
                {verifyResult.valid ? 'Geçerli Credential ✅' : 'Geçersiz Credential ❌'}
              </Text>
            )}
            {verifyResult.error && <Text style={{ color: 'red' }}>{verifyResult.error}</Text>}
            {verifyResult.details && <Text style={{ color: '#333', marginTop: 4 }}>{JSON.stringify(verifyResult.details, null, 2)}</Text>}
          </View>
        )}
      </View>

      <View style={[styles.sectionCard, theme.shadows.card]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Güvenlik kontrol listesi</Text>
          <Text style={styles.sectionSubtitle}>Tarama öncesi hatırlatma</Text>
        </View>
        {[
          {
            icon: 'lock-closed-outline',
            text: 'Talep sahibinin DID veya host adresini doğrula.',
          },
          {
            icon: 'finger-print-outline',
            text: 'İmzalamadan önce istenen alanların gerekli olup olmadığını kontrol et.',
          },
          {
            icon: 'cloud-download-outline',
            text: 'Yeni credential aldıysan Wallet > Backup ile keystore yedeğini güncelle.',
          },
        ].map((item) => (
          <View key={item.text} style={styles.checkRow}>
            <View style={styles.checkIcon}>
              <Ionicons name={item.icon} size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.checkText}>{item.text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.scannerBanner} onPress={openScanner}>
        <View style={styles.bannerIcon}>
          <Ionicons name="scan" size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Scanner&apos;a geç</Text>
          <Text style={styles.bannerText}>Canlı kamera ile QR kodları anında doğrula.</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  heroCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  heroActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.lg,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: theme.typography.weights.semibold,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardSecondary,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusSuccess: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  statusWarning: {
    backgroundColor: 'rgba(249,115,22,0.15)',
  },
  statusInfo: {
    backgroundColor: theme.colors.infoSurface,
  },
  statusText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.sm,
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  metaDivider: {
    width: 1,
    height: 32,
    backgroundColor: theme.colors.border,
  },
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.cardSecondary,
  },
  actionRowDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  actionTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  actionText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.muted,
  },
  checkRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  checkIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  scannerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
    gap: theme.spacing.md,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
  },
  bannerTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  bannerText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
});
