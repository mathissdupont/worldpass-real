import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useOffline } from '../context/OfflineContext';

export default function OfflineBanner() {
  const { isOffline, networkType } = useOffline();
  const { theme } = useTheme();

  if (!isOffline) return null;

  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.dangerSurface, borderColor: theme.colors.dangerBorder }]}>
      <Ionicons name="cloud-offline" size={16} color={theme.colors.danger} />
      <Text style={[styles.text, { color: theme.colors.danger }]}>
        Çevrimdışı. Bazı işlemler bekletilecek{networkType ? ` (${networkType})` : ''}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    zIndex: 9998,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
