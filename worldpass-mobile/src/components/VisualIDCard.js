import React, { useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 350);
const CARD_HEIGHT = CARD_WIDTH * 1.4;

// Memoized QR code component to prevent unnecessary re-renders
const MemoizedQRCode = memo(function MemoizedQRCode({ value }) {
  return (
    <QRCode
      value={value}
      size={100}
      backgroundColor="transparent"
      color="#fff"
    />
  );
});

export default function VisualIDCard({ did, name, email }) {
  const initials = useMemo(() => {
    if (!name) return 'WP';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'WP';
  }, [name]);

  const shortDid = useMemo(() => {
    if (!did) return '—';
    if (did.length <= 40) return did;
    return `${did.slice(0, 18)}...${did.slice(-18)}`;
  }, [did]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4f46e5', '#7c3aed', '#a855f7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>WP</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.brandTitle}>WorldPass</Text>
            <Text style={styles.brandSubtitle}>Digital Identity</Text>
          </View>
        </View>

        {/* Avatar & Name */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {name || 'WorldPass User'}
          </Text>
          {email && (
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
          )}
        </View>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          {did ? (
            <View style={styles.qrWrapper}>
              <MemoizedQRCode value={did} />
            </View>
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrPlaceholderText}>No DID</Text>
            </View>
          )}
        </View>

        {/* DID */}
        <View style={styles.didSection}>
          <Text style={styles.didLabel}>Decentralized Identifier</Text>
          <Text style={styles.didValue} numberOfLines={2}>
            {shortDid}
          </Text>
        </View>

        {/* Decorative Elements */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
  },
  brandTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  brandSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  name: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  email: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  qrWrapper: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  qrPlaceholder: {
    width: 124,
    height: 124,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  didSection: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
    marginTop: 'auto',
  },
  didLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  didValue: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  decorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -80,
    right: -60,
  },
  decorCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: -40,
    left: -40,
  },
});
