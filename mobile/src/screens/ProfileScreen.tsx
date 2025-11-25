/**
 * Profile Screen
 * Displays user profile information from backend
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';
import { fetchUserProfile } from '../api/client';
import { clearAuth } from '../utils/storage';

type Props = {
  onLogout: () => void;
};

type ProfileData = {
  displayName: string;
  email: string;
  phone: string;
  avatar: string;
  otpEnabled: boolean;
  lang: string;
  theme: string;
};

export default function ProfileScreen({ onLogout }: Props) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError('');

    try {
      const profileData = await fetchUserProfile();
      setProfile(profileData);
    } catch (err: any) {
      console.error('Profile fetch error:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await clearAuth();
            onLogout();
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.brand} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Error Loading Profile</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>❓</Text>
        <Text style={styles.errorTitle}>No Profile Data</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {profile.displayName
                ? profile.displayName.charAt(0).toUpperCase()
                : profile.email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>
            {profile.displayName || 'User'}
          </Text>
          <Text style={styles.email}>{profile.email}</Text>
        </View>

        {/* Profile Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile.email}</Text>
          </View>

          {profile.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profile.phone}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Display Name</Text>
            <Text style={styles.infoValue}>
              {profile.displayName || 'Not set'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Language</Text>
            <Text style={styles.infoValue}>
              {profile.lang.toUpperCase()}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Theme</Text>
            <Text style={styles.infoValue}>
              {profile.theme.charAt(0).toUpperCase() + profile.theme.slice(1)}
            </Text>
          </View>
        </View>

        {/* Security Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Security</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Two-Factor Auth</Text>
            <View
              style={[
                styles.badge,
                profile.otpEnabled ? styles.badgeEnabled : styles.badgeDisabled,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  profile.otpEnabled
                    ? styles.badgeTextEnabled
                    : styles.badgeTextDisabled,
                ]}
              >
                {profile.otpEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={loadProfile}
          >
            <Text style={styles.actionButtonText}>↻ Refresh Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>WorldPass Mobile v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.bg,
  },
  content: {
    padding: Spacing.lg,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.light.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.light.muted,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  errorMessage: {
    fontSize: FontSizes.md,
    color: Colors.light.muted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.light.brand,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.light.brand2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarLargeText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  displayName: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  email: {
    fontSize: FontSizes.md,
    color: Colors.light.muted,
  },
  card: {
    backgroundColor: Colors.light.panel,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    fontSize: FontSizes.sm,
    color: Colors.light.muted,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: FontSizes.sm,
    color: Colors.light.text,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  badgeEnabled: {
    backgroundColor: '#d1fae5',
  },
  badgeDisabled: {
    backgroundColor: Colors.light.panel2,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  badgeTextEnabled: {
    color: '#065f46',
  },
  badgeTextDisabled: {
    color: Colors.light.muted,
  },
  actionsSection: {
    marginTop: Spacing.lg,
  },
  actionButton: {
    backgroundColor: Colors.light.panel,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  actionButtonText: {
    fontSize: FontSizes.md,
    color: Colors.light.text,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  logoutButtonText: {
    color: '#dc2626',
  },
  appInfo: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  appInfoText: {
    fontSize: FontSizes.xs,
    color: Colors.light.muted,
  },
});
