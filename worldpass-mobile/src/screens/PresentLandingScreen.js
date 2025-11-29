import React, { useMemo, useState } from 'react';
import { Platform, ToastAndroid } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
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
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { useIdentity } from '../context/IdentityContext';

export default function PresentScreen({ navigation }) {
  const [selectedVC, setSelectedVC] = useState(null);
  const [selectedFields, setSelectedFields] = useState([]);
  const [nfcStatus, setNfcStatus] = useState('');
    // Alan seçimi için mevcut alanları çıkar
    const getFields = (vc) => {
      if (!vc) return [];
      const subject = vc.credentialSubject || {};
      return Object.keys(subject);
    };

    // Seçili alanlardan yeni bir VC objesi oluştur
    const getPartialVC = () => {
      if (!selectedVC || selectedFields.length === 0) return null;
      const partial = { ...selectedVC };
      partial.credentialSubject = {};
      selectedFields.forEach(f => {
        partial.credentialSubject[f] = selectedVC.credentialSubject[f];
      });
      return partial;
    };
  const { theme } = useTheme();
  const { credentials, loading } = useWallet();
  const { identity, linking } = useIdentity();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const did = identity?.did;
  const identityReady = Boolean(did);

  const navigateToVerifyTab = () => {
    const parent = navigation.getParent?.();
    parent?.navigate('Verify');
  };

  const handleCopyDid = async () => {
    if (!did) return;
    await Clipboard.setStringAsync(did);
    Alert.alert('DID kopyalandı', 'Kimlik adresi panoya gönderildi.');
  };

  const handleShare = (credential) => {
    if (!credential) return;
    navigation.navigate('PresentShare', { credential });
  };

  const openVerifyScanner = () => {
    navigation.getParent?.()?.navigate('Verify', { screen: 'VerifyScanner' });
  };

  const openIdentityCreate = () => {
    navigation.getParent?.()?.navigate('Settings', { screen: 'IdentityCreate' });
  };

  const openIdentityImport = () => {
    navigation.getParent?.()?.navigate('Settings', { screen: 'IdentityImport' });
  };

  const renderStatusPill = () => {
    if (linking) {
      return (
        <View style={[styles.statusPill, styles.statusInfo]}>
          <Ionicons name="refresh" size={14} color={theme.colors.primary} />
          <Text style={styles.statusText}>DID bağlanıyor…</Text>
        </View>
      );
    }
    if (identityReady) {
      return (
        <View style={[styles.statusPill, styles.statusSuccess]}>
          <Ionicons name="shield-checkmark" size={14} color="#10b981" />
          <Text style={styles.statusText}>Kimlik aktif</Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusPill, styles.statusWarning]}>
        <Ionicons name="warning" size={14} color="#f97316" />
        <Text style={styles.statusText}>Kimlik gerekli</Text>
      </View>
    );
  };

  const formatDate = (value) => {
    if (!value) return 'Bilinmiyor';
    try {
      return new Date(value).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (err) {
      return value;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, theme.shadows.card]}>
        {renderStatusPill()}
        <Text style={styles.title}>Credential sunum merkezi</Text>
        <Text style={styles.subtitle}>
          Doğrulayıcı taleplerini tara, uygun credential seç, DID ile imzala ve QR/NFC ile paylaş.
        </Text>

        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.primaryButton} onPress={navigateToVerifyTab}>
            <Ionicons name="qr-code" size={18} color="#fff" />
            <Text style={styles.primaryButtonText}>Talep Tara</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={openVerifyScanner}
          >
            <Ionicons name="scan-circle" size={18} color={theme.colors.primary} />
            <Text style={styles.secondaryButtonText}>Hızlı Sunum</Text>
          </TouchableOpacity>
        </View>

        {did ? (
          <TouchableOpacity style={styles.didCard} onPress={handleCopyDid}>
            <Ionicons name="key-outline" size={16} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.didLabel}>Aktif DID</Text>
              <Text style={styles.didValue} numberOfLines={1}>{did}</Text>
            </View>
            <Ionicons name="copy" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.didCardEmpty}>
            <Text style={styles.didLabel}>Hiç DID bağlı değil</Text>
            <View style={styles.didEmptyActions}>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={openIdentityCreate}
              >
                <Ionicons name="sparkles" size={14} color="#fff" />
                <Text style={styles.linkButtonText}>Yeni oluştur</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={openIdentityImport}
              >
                <Ionicons name="cloud-upload" size={14} color={theme.colors.primary} />
                <Text style={styles.outlineButtonText}>Yedeği içe aktar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.sectionCard, theme.shadows.card]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sunum adımları</Text>
          <Text style={styles.sectionSubtitle}>3 adımdan sonra hazır</Text>
        </View>
        {[
          {
            icon: 'qr-code-outline',
            title: 'Talebi Tara',
            text: 'Doğrulayıcı QR kodunu tarayarak hangi alanların istendiğini öğren.',
          },
          {
            icon: 'id-card-outline',
            title: 'Credential seç',
            text: 'Wallet içerisinden paylaşılacak credentialı ve alanlarını seç.',
          },
          {
            icon: 'flash-outline',
            title: 'DID ile imzala',
            text: 'Seçili alanları Ed25519 ile imzala ve QR/NFC üzerinden paylaş.',
          },
        ].map((step, idx) => (
          <View key={step.title} style={styles.stepRow}>
            <View style={styles.stepIconWrapper}>
              <Ionicons name={step.icon} size={18} color={theme.colors.primary} />
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{idx + 1}</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.sectionCard, theme.shadows.card]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Credential kasası</Text>
            <Text style={styles.sectionSubtitle}>
              {loading ? 'Yükleniyor…' : `${credentials.length} credential hazır`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.getParent?.()?.navigate('Wallet')}>
            <Text style={styles.linkText}>Wallet&apos;i aç</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={styles.emptyText}>Credential listesi yükleniyor…</Text>
        ) : credentials.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-outline" size={20} color={theme.colors.textMuted} />
            <Text style={styles.emptyTitle}>Henüz credential yok</Text>
            <Text style={styles.emptyText}>Web uygulamasından credential al veya Verify sekmesinden doğrulayıcı isteğini tara.</Text>
            <TouchableOpacity style={styles.primaryGhost} onPress={navigateToVerifyTab}>
              <Text style={styles.primaryGhostText}>Verify sekmesine git</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.credentialList}>
            {credentials.map((vc, index) => {
              const vcId = vc.jti || vc.id || vc.credentialSubject?.id || `vc-${index}`;
              const vcTypes = Array.isArray(vc.type) ? vc.type : [vc.type];
              const primaryType = vcTypes?.find((t) => t !== 'VerifiableCredential') || vcTypes?.[0] || 'Credential';
              const issuerLabel = typeof vc.issuer === 'string' ? vc.issuer : vc.issuer?.name || vc.issuer?.id || 'Bilinmeyen Issuer';

              return (
                <View key={vcId} style={styles.credentialCard}>
                  <View style={styles.credentialHeader}>
                    <View style={styles.typePill}>
                      <Text style={styles.typePillText}>{primaryType}</Text>
                    </View>
                    <Text style={styles.issueDate}>{formatDate(vc.issuanceDate)}</Text>
                  </View>
                  <Text style={styles.issuerLabel}>{issuerLabel}</Text>
                  <View style={styles.credentialActions}>
                    <TouchableOpacity style={styles.shareButton} onPress={() => {
                      setSelectedVC(vc);
                      setSelectedFields(getFields(vc));
                    }}>
                      <Ionicons name="qr-code" size={16} color={theme.colors.primary} />
                      <Text style={styles.shareButtonText}>Alan Seç & Paylaş</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.outlineButtonCompact}
                      onPress={() => navigation.getParent?.()?.navigate('Wallet')}
                    >
                      <Text style={styles.outlineButtonText}>Detay</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Alan seçimi ve paylaşım kutusu */}
        {selectedVC && (
          <View style={{ marginTop: 24, padding: 16, backgroundColor: theme.colors.cardSecondary, borderRadius: 12 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Paylaşılacak Alanları Seç</Text>
            {getFields(selectedVC).map(field => (
              <TouchableOpacity
                key={field}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
                onPress={() => setSelectedFields(f => f.includes(field) ? f.filter(x => x !== field) : [...f, field])}
              >
                <Ionicons name={selectedFields.includes(field) ? 'checkbox' : 'square-outline'} size={20} color={theme.colors.primary} />
                <Text style={{ marginLeft: 8 }}>{field}</Text>
              </TouchableOpacity>
            ))}
            <View style={{ alignItems: 'center', marginVertical: 12 }}>
              {selectedFields.length > 0 && (
                <QRCode value={JSON.stringify(getPartialVC())} size={180} />
              )}
            </View>
            <TouchableOpacity
              style={{ backgroundColor: theme.colors.primary, padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 8 }}
              onPress={() => {
                setNfcStatus('NFC ile aktarılıyor...');
                sendNfc(getPartialVC(), ok => setNfcStatus(ok ? 'NFC ile gönderildi (simülasyon)' : 'NFC ile gönderilemedi.'));
              }}
              disabled={selectedFields.length === 0}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>NFC ile Paylaş</Text>
            </TouchableOpacity>
            {nfcStatus ? <Text style={{ color: theme.colors.primary, marginTop: 4 }}>{nfcStatus}</Text> : null}
            <TouchableOpacity
              style={{ marginTop: 8, alignItems: 'center' }}
              onPress={() => { setSelectedVC(null); setSelectedFields([]); setNfcStatus(''); }}
            >
              <Text style={{ color: theme.colors.danger }}>Kapat</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  didCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.cardSecondary,
  },
  didCardEmpty: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.cardSecondary,
  },
  didLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  didValue: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  didEmptyActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radii.lg,
  },
  linkButtonText: {
    color: '#fff',
    fontWeight: theme.typography.weights.semibold,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: theme.colors.card,
  },
  outlineButtonCompact: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  outlineButtonText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
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
    color: theme.colors.text,
    fontWeight: theme.typography.weights.medium,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  linkText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  stepRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  stepIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardSecondary,
  },
  stepNumber: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: theme.typography.weights.bold,
  },
  stepTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  stepText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
  },
  credentialList: {
    gap: theme.spacing.md,
  },
  credentialCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.cardSecondary,
  },
  credentialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typePill: {
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
  },
  issuerLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  issueDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  credentialActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shareButtonText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  primaryGhost: {
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.primarySurface,
  },
  primaryGhostText: {
    textAlign: 'center',
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.medium,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.cardSecondary,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  emptyText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
