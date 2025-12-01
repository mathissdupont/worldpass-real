import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

import { useIdentity } from '../context/IdentityContext';
import { useTheme } from '../context/ThemeContext';

export default function ReceiveInfoScreen() {
  const { identity } = useIdentity();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const styles = useMemo(() => createStyles(theme), [theme]);
  const did = identity?.did || '';

  const handleCopyDid = async () => {
    if (!did) return;
    await Clipboard.setStringAsync(did);

    if (Platform.OS === 'android') {
      // eslint-disable-next-line no-undef
      ToastAndroid.show('DID kopyalandı', ToastAndroid.SHORT);
    } else {
      alert('DID kopyalandı');
    }
  };

  const handleGoScan = () => {
    navigation.navigate('Scanner'); // 👈 az önce yazdığın ScannerScreen
  };

  const handleGoCreateIdentity = () => {
    navigation.navigate('IdentityCreate');
  };

  const handleGoImportIdentity = () => {
    navigation.navigate('Settings', { screen: 'IdentityImport' });
  };

  // Kimlik yoksa: sadece yönlendirme ekranı
  if (!did) {
    return (
      <View style={styles.container}>
        <Ionicons
          name="shield-outline"
          size={72}
          color={theme.colors.primary}
          style={{ marginBottom: 16 }}
        />
        <Text style={styles.title}>Önce bir kimlik gerekiyor</Text>
        <Text style={styles.subtitle}>
          QR ile credential alabilmek veya DID’ini paylaşabilmek için önce
          bir WorldPass kimliği (DID) oluşturmalı veya .wpkeystore dosyanı içe aktarmalısın.
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGoCreateIdentity}
          >
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.primaryText}>Kimlik Oluştur</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleGoImportIdentity}
          >
            <Ionicons
              name="cloud-upload-outline"
              size={18}
              color={theme.colors.primary}
            />
            <Text style={styles.secondaryText}>.wpkeystore İçe Aktar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Kimlik varsa: DID göster + QR tara kısayolu
  return (
    <View style={styles.container}>
      <Ionicons
        name="wallet-outline"
        size={64}
        color={theme.colors.primary}
        style={{ marginBottom: 16 }}
      />
      <Text style={styles.title}>Bilgilerini Paylaş & Al</Text>
      <Text style={styles.subtitle}>
        Aşağıdan DID’ini kopyalayabilir, başka uygulamalarla paylaşabilir
        veya QR kod ile credential tarayıp cüzdanına ekleyebilirsin.
      </Text>

      <View style={styles.didCard}>
        <Text style={styles.didLabel}>Aktif DID</Text>
        <Text style={styles.didValue} numberOfLines={3}>
          {did}
        </Text>

        <View style={styles.didActions}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={handleCopyDid}
          >
            <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.smallButtonText}>DID’i Kopyala</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>

        <TouchableOpacity
          style={styles.bigAction}
          onPress={handleGoScan}
        >
          <Ionicons name="scan-outline" size={22} color="#fff" />
          <Text style={styles.bigActionText}>QR ile Credential Tara</Text>
        </TouchableOpacity>

        {/* İleride istersen buraya “VC’yi QR ile göster”, “NFC ile paylaş” gibi başka aksiyonlar da ekleriz */}
      </View>
    </View>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.lg,
      justifyContent: 'center',
    },
    title: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
      lineHeight: 20,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm + 4,
      borderRadius: theme.radii.lg,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    primaryText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: theme.typography.sizes.sm,
    },
    secondaryButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm + 4,
      borderRadius: theme.radii.lg,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.card,
    },
    secondaryText: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: theme.typography.sizes.sm,
    },
    didCard: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.card,
      marginBottom: theme.spacing.lg,
    },
    didLabel: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textMuted,
      marginBottom: 4,
    },
    didValue: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    didActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: theme.spacing.sm,
    },
    smallButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.cardSecondary,
    },
    smallButtonText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.primary,
      fontWeight: '600',
    },
    section: {
      marginTop: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    bigAction: {
      marginTop: theme.spacing.sm,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    bigActionText: {
      color: '#fff',
      fontSize: theme.typography.sizes.md,
      fontWeight: '700',
    },
  });
}
