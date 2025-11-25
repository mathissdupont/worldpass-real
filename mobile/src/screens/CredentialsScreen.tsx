/**
 * Credentials Screen
 * Displays user's verifiable credentials
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

// Dummy credential data for now
const DUMMY_CREDENTIALS = [
  {
    id: '1',
    type: 'University Degree',
    issuer: 'MIT',
    issuedDate: '2023-05-15',
    status: 'valid',
  },
  {
    id: '2',
    type: 'Professional Certificate',
    issuer: 'Tech Corp',
    issuedDate: '2023-08-20',
    status: 'valid',
  },
  {
    id: '3',
    type: 'Identity Verification',
    issuer: 'Gov ID Service',
    issuedDate: '2023-01-10',
    status: 'valid',
  },
];

export default function CredentialsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Credentials</Text>
          <Text style={styles.subtitle}>
            Your verifiable credentials from trusted issuers
          </Text>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Showing dummy data. Real credentials will be fetched from the backend in a future update.
          </Text>
        </View>

        {/* Credentials List */}
        {DUMMY_CREDENTIALS.map((credential) => (
          <TouchableOpacity
            key={credential.id}
            style={styles.credentialCard}
            onPress={() => {
              // TODO: Navigate to credential detail
            }}
          >
            <View style={styles.credentialHeader}>
              <View style={styles.credentialIcon}>
                <Text style={styles.credentialIconText}>📜</Text>
              </View>
              <View style={styles.credentialInfo}>
                <Text style={styles.credentialType}>{credential.type}</Text>
                <Text style={styles.credentialIssuer}>
                  Issued by {credential.issuer}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  credential.status === 'valid' && styles.statusBadgeValid,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    credential.status === 'valid' && styles.statusTextValid,
                  ]}
                >
                  {credential.status}
                </Text>
              </View>
            </View>

            <View style={styles.credentialFooter}>
              <Text style={styles.credentialDate}>
                Issued on {new Date(credential.issuedDate).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Empty State (when no credentials) */}
        {DUMMY_CREDENTIALS.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Credentials Yet</Text>
            <Text style={styles.emptyDescription}>
              Your verifiable credentials will appear here once you receive them
              from issuers.
            </Text>
          </View>
        )}
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
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.light.muted,
  },
  infoBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: '#1e40af',
    lineHeight: 20,
  },
  credentialCard: {
    backgroundColor: Colors.light.panel,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  credentialIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.panel2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  credentialIconText: {
    fontSize: 24,
  },
  credentialInfo: {
    flex: 1,
  },
  credentialType: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  credentialIssuer: {
    fontSize: FontSizes.sm,
    color: Colors.light.muted,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.panel2,
  },
  statusBadgeValid: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.light.muted,
    textTransform: 'uppercase',
  },
  statusTextValid: {
    color: '#065f46',
  },
  credentialFooter: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  credentialDate: {
    fontSize: FontSizes.xs,
    color: Colors.light.muted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  emptyDescription: {
    fontSize: FontSizes.md,
    color: Colors.light.muted,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
});
