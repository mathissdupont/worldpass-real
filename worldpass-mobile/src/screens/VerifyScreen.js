import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  ToastAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import { verifyCredential } from '../lib/api';

// NFC alma simülasyonu (gerçek NFC için native modül gerekir)
const receiveNfc = async (onResult) => {
  if (Platform.OS === 'android') {
    setTimeout(() => {
      if (onResult) onResult(true);
    }, 800);
    ToastAndroid.show('NFC alma simüle edildi', ToastAndroid.SHORT);
  } else {
    Alert.alert(
      'NFC',
      'NFC alma şu an sadece Android cihazlarda simüle ediliyor.',
    );
    if (onResult) onResult(false);
  }
};

// VC özetini gösteren yardımcı render
const renderCredentialSummary = (cred, styles) => {
  if (!cred) return null;

  const {
    type,
    issuer,
    issuanceDate,
    expirationDate,
    credentialSubject,
    status,
  } = cred;

  const typeLabel = Array.isArray(type)
    ? type[type.length - 1]
    : type || 'VerifiableCredential';

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{typeLabel}</Text>

      <Text style={styles.summaryLabel}>Issuer</Text>
      <Text style={styles.summaryValue}>{issuer || '-'}</Text>

      <Text style={styles.summaryLabel}>Holder</Text>
      <Text style={styles.summaryValue}>
        {credentialSubject?.id || credentialSubject?.subjectId || '-'}
      </Text>

      <Text style={styles.summaryLabel}>Issued</Text>
      <Text style={styles.summaryValue}>
        {issuanceDate
          ? new Date(issuanceDate).toLocaleString()
          : '-'}
      </Text>

      {expirationDate && (
        <>
          <Text style={styles.summaryLabel}>Expires</Text>
          <Text style={styles.summaryValue}>
            {new Date(expirationDate).toLocaleString()}
          </Text>
        </>
      )}

      {status && (
        <>
          <Text style={styles.summaryLabel}>Status</Text>
          <Text
            style={styles.summaryValue}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {typeof status === 'object'
              ? JSON.stringify(status)
              : String(status)}
          </Text>
        </>
      )}
    </View>
  );
};

export default function VerifyScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [vcText, setVcText] = useState('');
  const [parsedVC, setParsedVC] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success'|'error'|'info', message: string }

  const handleVerify = async () => {
    if (!vcText.trim()) {
      setResult({
        type: 'error',
        message: 'Önce JSON verisini yapıştırmalısın.',
      });
      return;
    }

    let vc;
    try {
      vc = JSON.parse(vcText);
    } catch (e) {
      setResult({
        type: 'error',
        message: 'Geçersiz JSON. Lütfen tam VC JSON’unu yapıştır.',
      });
      setParsedVC(null);
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const resp = await verifyCredential(vc);
      // Backend ScannerScreen’de resp.valid bekleniyordu
      if (resp.valid) {
        setResult({
          type: 'success',
          message: 'Credential geçerli olarak doğrulandı.',
        });
        setParsedVC(vc);
      } else {
        setResult({
          type: 'error',
          message:
            resp.reason ||
            'Credential doğrulanamadı veya geçersiz.',
        });
        setParsedVC(vc);
      }
    } catch (err) {
      setResult({
        type: 'error',
        message:
          err?.message ||
          'Doğrulama isteği sırasında bir hata oluştu.',
      });
      setParsedVC(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNfcSimulate = () => {
    receiveNfc((ok) => {
      if (ok) {
        setResult({
          type: 'info',
          message:
            'NFC alma simüle edildi. Gerçek NFC entegrasyonu native modülle eklenecek.',
        });
      }
    });
  };

  const renderResultBanner = () => {
    if (!result) return null;

    let containerStyle = styles.bannerInfo;
    let icon = 'information-circle';

    if (result.type === 'success') {
      containerStyle = styles.bannerSuccess;
      icon = 'checkmark-circle';
    } else if (result.type === 'error') {
      containerStyle = styles.bannerError;
      icon = 'alert-circle';
    }

    return (
      <View style={[styles.resultBanner, containerStyle]}>
        <Ionicons
          name={icon}
          size={18}
          color={
            result.type === 'success'
              ? theme.colors.success
              : result.type === 'error'
              ? theme.colors.danger
              : theme.colors.info || theme.colors.primary
          }
        />
        <Text style={styles.resultBannerText}>{result.message}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons
            name="shield-checkmark-outline"
            size={32}
            color={theme.colors.primary}
          />
          <Text style={styles.title}>Credential Doğrulama</Text>
          <Text style={styles.subtitle}>
            Holder’dan aldığın verifiable credential JSON’unu aşağıya yapıştır.
            Backend üzerinden kriptografik olarak doğrulayalım.
          </Text>
        </View>

        {renderResultBanner()}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>VC JSON</Text>
          <TextInput
            style={styles.textArea}
            value={vcText}
            onChangeText={setVcText}
            multiline
            placeholder='{"@context": [...], "type": ["VerifiableCredential", ...], ...}'
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.sectionHint}>
            Tam VC gövdesini (örneğin QR’dan veya başka bir uygulamadan aldığın veriyi)
            buraya yapıştırmalısın.
          </Text>
        </View>

        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.primaryButtonText}>
                  Credential’ı Doğrula
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleNfcSimulate}
          >
            <Ionicons
              name="wifi-outline"
              size={18}
              color={theme.colors.primary}
            />
            <Text style={styles.secondaryButtonText}>
              NFC’den Al (Sim)
            </Text>
          </TouchableOpacity>
        </View>

        {parsedVC && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Özet</Text>
            {renderCredentialSummary(parsedVC, styles)}

            <Text style={styles.sectionLabel}>Ham JSON</Text>
            <ScrollView
              style={styles.jsonContainer}
              horizontal={true}
            >
              <Text style={styles.jsonText}>
                {JSON.stringify(parsedVC, null, 2)}
              </Text>
            </ScrollView>
          </View>
        )}

        <View style={styles.footerInfo}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={theme.colors.textMuted}
          />
          <Text style={styles.footerText}>
            QR ile credential tarayıp cüzdana eklemek için Wallet sekmesindeki
            Scanner ekranını kullanabilirsin. Bu ekran, özellikle manuel JSON
            doğrulama ve ileride NFC senaryoları için tasarlandı.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    header: {
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: '700',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
      lineHeight: 20,
    },
    section: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    sectionLabel: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    sectionHint: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.xs,
    },
    textArea: {
      minHeight: 140,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      backgroundColor: theme.colors.card,
      textAlignVertical: 'top',
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    primaryButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm + 4,
      borderRadius: theme.radii.lg,
    },
    primaryButtonText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: theme.typography.sizes.sm,
    },
    secondaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm + 4,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.colors.card,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: theme.typography.sizes.xs,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    resultBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: theme.spacing.sm,
      borderRadius: theme.radii.md,
      marginBottom: theme.spacing.sm,
    },
    resultBannerText: {
      flex: 1,
      fontSize: theme.typography.sizes.xs,
    },
    bannerSuccess: {
      backgroundColor: theme.colors.successSurface || '#f0fdf4',
      borderWidth: 1,
      borderColor: theme.colors.successBorder || '#bbf7d0',
    },
    bannerError: {
      backgroundColor: theme.colors.dangerSurface || '#fef2f2',
      borderWidth: 1,
      borderColor: theme.colors.dangerBorder || '#fecaca',
    },
    bannerInfo: {
      backgroundColor: theme.colors.infoSurface || theme.colors.cardMuted,
      borderWidth: 1,
      borderColor: theme.colors.infoBorder || theme.colors.border,
    },
    summaryCard: {
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    summaryTitle: {
      fontSize: theme.typography.sizes.md,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    summaryLabel: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.xs,
    },
    summaryValue: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
    },
    jsonContainer: {
      marginTop: theme.spacing.sm,
      maxHeight: 200,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
    },
    jsonText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.text,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    footerInfo: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      marginTop: theme.spacing.md,
    },
    footerText: {
      flex: 1,
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textMuted,
      lineHeight: 18,
    },
  });
