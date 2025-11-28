import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useIdentity } from '../context/IdentityContext';
import { useWallet } from '../context/WalletContext';

export default function VerifyScreen({ navigation }) {
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
          <Text style={styles.sectionTitle}>Hızlı işlemler</Text>
          <Text style={styles.sectionSubtitle}>Verify akışının kısa yolu</Text>
        </View>
        {[
          {
            icon: 'scan-outline',
            title: 'Canlı QR taraması',
            text: 'Cihaz kamerası ile doğrulayıcı isteğini okur ve Scanner ekranını açar.',
            action: openScanner,
          },
          {
            icon: 'document-attach-outline',
            title: '.wpvp yükle',
            text: 'Dosya yöneticisinden gelen sunum talebini seçerek doğrulama yap.',
            action: () => {},
            disabled: true,
            helper: 'Dosya seçme desteği yakında',
          },
          {
            icon: 'shield-half-outline',
            title: 'Politikaları incele',
            text: 'Her talep için alan eşleşmelerini ve imza gerekliliklerini kontrol et.',
            action: () => openIdentity('SettingsHome'),
          },
        ].map((item) => (
          <TouchableOpacity
            key={item.title}
            style={[styles.actionRow, item.disabled && styles.actionRowDisabled]}
            onPress={item.action}
            disabled={item.disabled}
          >
            <View style={styles.actionIcon}>
              <Ionicons name={item.icon} size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>{item.title}</Text>
              <Text style={styles.actionText}>{item.text}</Text>
              {item.helper && <Text style={styles.helperText}>{item.helper}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ))}
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
