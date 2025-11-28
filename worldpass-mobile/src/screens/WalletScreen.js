import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useIdentity } from '../context/IdentityContext';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { formatRelativeTime } from '../lib/time';

export default function WalletScreen() {
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { identity, linking, error: identityError, linkTelemetry } = useIdentity();
  const navigation = useNavigation();
  const walletDid = identity?.did || '';
  const { theme } = useTheme();
  const { credentials, loading, error, refresh, deleteCredential: removeCredential } = useWallet();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const hasIdentity = Boolean(walletDid);
  const hasCredentials = credentials.length > 0;
  const lastSuccessfulSync = linkTelemetry?.lastSuccessAt
    ? formatRelativeTime(linkTelemetry.lastSuccessAt)
    : '';
  const lastErrorRelative = linkTelemetry?.lastErrorAt
    ? formatRelativeTime(linkTelemetry.lastErrorAt)
    : '';

  const identityHintCopy = hasIdentity
    ? identityError
      ? 'Kimliğin hesabına bağlanamadı. Settings > Identity bölümünden yeniden senkronize edebilirsin.'
      : lastSuccessfulSync
        ? `Son DID senkronizasyonu ${lastSuccessfulSync}.`
        : 'Kimliğin doğrulandı. Her credential sonrası keystore yedeğini yenilemeyi unutma.'
    : 'Kimlik olmadan credential ekleyemezsin. Aşağıdaki kısayolları kullan.';

  const heroGradient = useMemo(() => {
    if (identityError) {
      return [theme.colors.danger, theme.colors.dangerSurface];
    }
    if (hasIdentity) {
      return [theme.colors.primary, theme.colors.primarySurface || theme.colors.card];
    }
    return [theme.colors.warning, theme.colors.warningSurface || theme.colors.card];
  }, [hasIdentity, identityError, theme.colors]);

  const statusChipVisual = useMemo(() => {
    if (linking) {
      return {
        icon: 'refresh',
        color: theme.colors.info,
        label: 'Linking…',
        tone: 'info',
      };
    }
    if (identityError) {
      return {
        icon: 'alert-circle',
        color: theme.colors.danger,
        label: 'Sync failed',
        tone: 'error',
      };
    }
    if (hasIdentity) {
      return {
        icon: 'shield-checkmark',
        color: theme.colors.success,
        label: lastSuccessfulSync ? `Synced ${lastSuccessfulSync}` : 'Ready',
        tone: 'success',
      };
    }
    return {
      icon: 'key',
      color: theme.colors.primary,
      label: 'Setup',
      tone: null,
    };
  }, [hasIdentity, identityError, lastSuccessfulSync, linking, theme.colors]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleCreateIdentity = () => {
    navigation.navigate('IdentityCreate');
  };

  const handleManageIdentity = () => {
    navigation.navigate('Settings', { screen: 'IdentityImport' });
  };

  const quickActions = [
    {
      key: 'scan',
      label: 'QR Tara',
      icon: 'scan-outline',
      disabled: !hasIdentity || Boolean(identityError),
      onPress: () => navigation.navigate('Scanner'),
    },
    {
      key: 'present',
      label: 'VC Paylaş',
      icon: 'color-wand-outline',
      disabled: !hasCredentials,
      onPress: () => navigation.navigate('Present'),
    },
    {
      key: 'backup',
      label: hasIdentity ? 'Yedekle' : 'İçe Aktar',
      icon: hasIdentity ? 'cloud-download-outline' : 'key-outline',
      disabled: false,
      onPress: hasIdentity ? handleManageIdentity : handleCreateIdentity,
    },
  ];

  const Header = () => (
    <View style={styles.headerStack}>
      <View style={[styles.heroWrapper, theme.shadows.card]}>
        <LinearGradient
          colors={heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.identityHero}
        >
          <View style={styles.identityHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.identityLabel, styles.identityLabelOnHero]}>
                {hasIdentity ? 'Aktif DID' : 'Kimlik bulunamadı'}
              </Text>
              <Text style={[styles.identityValue, styles.identityValueOnHero]} numberOfLines={2}>
                {hasIdentity
                  ? walletDid
                  : 'Cüzdanını kullanmadan önce kimliğini oluştur veya içe aktar.'}
              </Text>
            </View>
            <View
              style={[
                styles.statusChip,
                statusChipVisual.tone === 'info' && styles.statusChipInfo,
                statusChipVisual.tone === 'error' && styles.statusChipError,
                statusChipVisual.tone === 'success' && styles.statusChipSuccess,
              ]}
            >
              {linking ? (
                <ActivityIndicator size="small" color={statusChipVisual.color} />
              ) : (
                <Ionicons name={statusChipVisual.icon} size={16} color={statusChipVisual.color} />
              )}
              <Text style={[styles.statusChipText, { color: statusChipVisual.color }]}>
                {statusChipVisual.label}
              </Text>
            </View>
          </View>

          <Text style={[styles.identityHint, styles.identityHintOnHero]}>{identityHintCopy}</Text>

          <View style={styles.bannerActions}>
            <TouchableOpacity
              style={[styles.bannerButton, styles.bannerButtonPrimaryHero]}
              onPress={hasIdentity ? handleManageIdentity : handleCreateIdentity}
            >
              <Ionicons name={hasIdentity ? 'shield-outline' : 'add-circle-outline'} size={18} color="#fff" />
              <Text style={styles.bannerButtonPrimaryText}>
                {hasIdentity ? 'Kimliği Yönet' : 'Kimlik Oluştur'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bannerButton, styles.bannerButtonSecondaryHero]}
              onPress={handleManageIdentity}
            >
              <Ionicons name="cloud-download-outline" size={18} color="#fff" />
              <Text style={[styles.bannerButtonSecondaryText, styles.bannerButtonSecondaryTextHero]}>
                {hasIdentity ? 'Keystore Yedeği' : '.wpkeystore İçe Aktar'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickActionsRow}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={[styles.quickAction, action.disabled && styles.quickActionDisabled]}
                onPress={action.onPress}
                disabled={action.disabled}
              >
                <Ionicons
                  name={action.icon}
                  size={18}
                  color={action.disabled ? 'rgba(255,255,255,0.35)' : '#fff'}
                />
                <Text style={[styles.quickActionLabel, action.disabled && styles.quickActionLabelDisabled]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      </View>

      {hasIdentity && identityError && (
        <View style={[styles.helperCard, styles.helperCardWarning, theme.shadows.card]}>
          <View style={[styles.helperIconBadge, styles.helperIconBadgeWarning]}>
            <Ionicons name="warning" size={18} color={theme.colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.helperTitle}>DID senkronizasyonu başarısız</Text>
            <Text style={styles.helperSubtitle}>
              {lastErrorRelative
                ? `${lastErrorRelative} hata alındı. Kimliği yeniden bağlamak için ayarlara git.`
                : 'Kimliği yeniden bağlamak için ayarlara git.'}
            </Text>
          </View>
          <TouchableOpacity style={styles.helperLink} onPress={handleManageIdentity}>
            <Text style={styles.helperLinkText}>Fix</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {hasIdentity && hasCredentials && !identityError && (
        <View style={[styles.helperCard, theme.shadows.card]}>
          <View style={styles.helperIconBadge}>
            <Ionicons name="lock-closed" size={18} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.helperTitle}>Yedeğini güncel tut</Text>
            <Text style={styles.helperSubtitle}>
              Yeni credential ekledin. {lastSuccessfulSync
                ? `Son DID senkronizasyonu ${lastSuccessfulSync}.`
                : 'Keystore yedeğini güncel tutmayı unutma.'}
            </Text>
          </View>
          <TouchableOpacity style={styles.helperLink} onPress={handleManageIdentity}>
            <Text style={styles.helperLinkText}>Git</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {hasIdentity && !hasCredentials && !identityError && (
        <View style={[styles.helperCard, theme.shadows.card]}>
          <View style={styles.helperIconBadge}>
            <Ionicons name="qr-code-outline" size={18} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.helperTitle}>Cüzdan boş</Text>
            <Text style={styles.helperSubtitle}>
              İlk verifiable credential’ını QR taratarak ekle. Scanner sekmesinden başlayabilirsin.
            </Text>
          </View>
          <TouchableOpacity style={styles.helperLink} onPress={() => navigation.navigate('Scanner')}>
            <Text style={styles.helperLinkText}>Tara</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const handleDelete = (credential) => {
    Alert.alert(
      'Delete Credential',
      'Are you sure you want to delete this credential?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const key = credential?.jti || credential?.id;
            await removeCredential(key);
          },
        },
      ]
    );
  };

  const renderCredential = ({ item }) => (
    <TouchableOpacity style={[styles.card, theme.shadows.card]} onPress={() => setSelectedCredential(item)}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardType}>{item.type[item.type.length - 1]}</Text>
          <Text style={styles.cardIssuer}>Issued by: {item.issuer}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('VCQR', { credential: item })}
          >
            <Ionicons name="qr-code-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardLabel}>Holder:</Text>
        <Text style={styles.cardValue}>{item.credentialSubject?.id || 'N/A'}</Text>
        <Text style={styles.cardLabel}>Issued:</Text>
        <Text style={styles.cardValue}>
          {new Date(item.issuanceDate).toLocaleDateString()}
        </Text>
        {item.expirationDate && (
          <>
            <Text style={styles.cardLabel}>Expires:</Text>
            <Text style={styles.cardValue}>
              {new Date(item.expirationDate).toLocaleDateString()}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      {loading ? (
        <>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.emptyText}>Loading credentials...</Text>
        </>
      ) : (
        <>
          <Ionicons name="wallet-outline" size={64} color={theme.colors.tabInactive} />
          <Text style={styles.emptyText}>No credentials yet</Text>
          <Text style={styles.emptySubtext}>
            Scan QR codes to add verifiable credentials
          </Text>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        data={credentials}
        renderItem={renderCredential}
        keyExtractor={(item, index) => item?.jti || item?.id || `${item?.issuer || 'vc'}-${index}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={Header}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />

      <Modal
        visible={!!selectedCredential}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedCredential(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, theme.shadows.card]}>
            <Text style={styles.modalTitle}>Credential Details</Text>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.jsonText}>
                {selectedCredential ? JSON.stringify(selectedCredential, null, 2) : ''}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setSelectedCredential(null)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl + theme.spacing.sm,
    gap: theme.spacing.md,
  },
  headerStack: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  heroWrapper: {
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
  },
  identityHero: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm + 2,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
    backgroundColor: theme.colors.dangerSurface,
  },
  errorText: {
    flex: 1,
    color: theme.colors.danger,
    fontSize: theme.typography.sizes.sm,
  },
  identityHeaderRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'flex-start',
  },
  identityLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: theme.typography.weights.semibold,
  },
  identityLabelOnHero: {
    color: 'rgba(255,255,255,0.8)',
  },
  identityValue: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginTop: 4,
  },
  identityValueOnHero: {
    color: '#fff',
  },
  identityHint: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
  },
  identityHintOnHero: {
    color: 'rgba(255,255,255,0.9)',
  },
  bannerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  bannerButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
  },
  bannerButtonPrimary: {
    backgroundColor: theme.colors.primary,
  },
  bannerButtonPrimaryHero: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  bannerButtonPrimaryText: {
    color: '#fff',
    fontWeight: theme.typography.weights.semibold,
  },
  bannerButtonSecondary: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardSecondary,
  },
  bannerButtonSecondaryHero: {
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bannerButtonSecondaryText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  bannerButtonSecondaryTextHero: {
    color: '#fff',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  quickActionDisabled: {
    opacity: 0.45,
  },
  quickActionLabel: {
    color: '#fff',
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActionLabelDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 1.2,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
  },
  statusChipSuccess: {
    borderColor: theme.colors.successBorder,
    backgroundColor: theme.colors.successSurface,
  },
  statusChipInfo: {
    borderColor: theme.colors.infoBorder,
    backgroundColor: theme.colors.infoSurface,
  },
  statusChipError: {
    borderColor: theme.colors.dangerBorder,
    backgroundColor: theme.colors.dangerSurface,
  },
  statusChipText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.primary,
  },
  helperCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  helperCardWarning: {
    borderColor: theme.colors.dangerBorder,
    backgroundColor: theme.colors.dangerSurface,
  },
  helperIconBadge: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperIconBadgeWarning: {
    backgroundColor: theme.colors.dangerSurface,
  },
  helperTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.text,
  },
  helperSubtitle: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.muted,
    marginTop: 4,
  },
  helperLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helperLinkText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.weights.semibold,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  cardActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.cardSecondary,
  },
  cardType: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  cardIssuer: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  cardLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
  cardValue: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.muted,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.muted,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
  },
  modalBody: {
    maxHeight: 300,
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
  },
  modalButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 4,
    borderRadius: theme.radii.md,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: theme.typography.weights.semibold,
  },
});
