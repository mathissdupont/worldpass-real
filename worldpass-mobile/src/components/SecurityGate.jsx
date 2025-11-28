import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';

export default function SecurityGate() {
  const { user } = useAuth();
  const {
    ready,
    locked,
    unlocking,
    biometricAvailable,
    biometricEnabled,
    biometricType,
    pinSet,
    error,
    unlockWithBiometric,
    unlockWithPin,
    resetError,
  } = useSecurity();
  const { theme } = useTheme();
  const [pinValue, setPinValue] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  if (!ready || !locked || !user) {
    return null;
  }

  const handlePinChange = (value) => {
    resetError();
    setPinValue(value.replace(/[^0-9]/g, ''));
  };

  const handlePinUnlock = async () => {
    if (!pinSet || pinValue.length < 4) {
      return;
    }
    setPinLoading(true);
    try {
      const success = await unlockWithPin(pinValue);
      if (success) {
        setPinValue('');
      }
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <View style={[StyleSheet.absoluteFillObject, styles.overlay, { backgroundColor: theme.colors.overlay }]}
      pointerEvents="auto"
    >
      <View style={[styles.card, theme.shadows.card, { backgroundColor: theme.colors.card }]}
        accessibilityViewIsModal
        accessible
      >
        <View style={styles.iconBadge}>
          <Ionicons name="shield-half-outline" size={32} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>Cüzdan Kilitli</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Kimliğine erişmeden önce hızlı doğrulama yapman gerekiyor.
        </Text>

        {biometricEnabled && biometricAvailable && (
          <TouchableOpacity
            style={[styles.actionButton, styles.biometricButton, { backgroundColor: theme.colors.primary }]}
            onPress={unlocking ? undefined : unlockWithBiometric}
            disabled={unlocking}
            accessibilityLabel="Biyometrik doğrulama ile kilidi aç"
          >
            {unlocking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={Platform.OS === 'ios' && biometricType === 'face' ? 'scan-circle' : 'finger-print'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.actionButtonText}>
                  {biometricType === 'face' ? 'Face ID ile Aç' : 'Biyometrik Kilidi Aç'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {pinSet && (
          <View style={styles.pinBlock}>
            <Text style={[styles.pinLabel, { color: theme.colors.text }]}>PIN ile aç</Text>
            <TextInput
              value={pinValue}
              onChangeText={handlePinChange}
              placeholder="••••"
              placeholderTextColor={theme.colors.muted}
              keyboardType="number-pad"
              secureTextEntry
              style={[styles.pinInput, {
                borderColor: theme.colors.border,
                color: theme.colors.text,
                backgroundColor: theme.colors.cardSecondary,
              }]}
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: theme.colors.primary }]}
              onPress={handlePinUnlock}
              disabled={pinLoading}
            >
              {pinLoading ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>PIN ile Devam Et</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(99,102,241,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  biometricButton: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 0,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  pinBlock: {
    width: '100%',
    gap: 12,
  },
  pinLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  pinInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    paddingHorizontal: 16,
    letterSpacing: 8,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
