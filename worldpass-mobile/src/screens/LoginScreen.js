import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useIdentity } from '../context/IdentityContext';

export default function LoginScreen({ navigation }) {
  const { signIn, error: authError } = useAuth();
  const { theme } = useTheme();
  const { identity } = useIdentity();

  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const hasIdentity = Boolean(identity?.did && identity?.sk_b64u);
  const combinedError = formError || authError;

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleSubmit = async () => {
    if (!hasIdentity) {
      setFormError('Load or import your DID keystore first');
      return;
    }

    try {
      setFormError(null);
      setSubmitting(true);
      await signIn({ identity, displayName });
      // successful login → AppNavigator user dolunca tablere geçecek
    } catch (err) {
      setFormError(err?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Heading */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to access your WorldPass wallet
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.identityCard}>
              <Text style={styles.label}>Loaded DID</Text>
              <Text style={styles.didText} numberOfLines={1}>
                {identity?.did || 'No identity loaded'}
              </Text>
            </View>

            <TextInput
              placeholder="Display name (optional)"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {combinedError ? (
              <Text style={styles.errorText}>{combinedError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (submitting || !hasIdentity) && styles.primaryButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting || !hasIdentity}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign in with DID</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Identity import shortcut */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('IdentityImport')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>
                Import keystore (.wpkeystore)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    flex: {
      flex: 1,
    },
    container: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background,
    },
    header: {
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.typography.sizes.md,
      color: theme.colors.textMuted,
    },
    form: {
      flexGrow: 1,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      fontSize: theme.typography.sizes.md,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.card,
    },
    errorText: {
      color: theme.colors.danger,
      marginBottom: theme.spacing.sm,
      fontSize: theme.typography.sizes.sm,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.lg,
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.sizes.md,
      fontWeight: theme.typography.weights.semibold,
    },
    linkContainer: {
      marginTop: theme.spacing.lg,
      alignItems: 'center',
    },
    linkText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
    },
    linkHighlight: {
      color: theme.colors.primary,
      fontWeight: theme.typography.weights.semibold,
    },
    footer: {
      marginTop: theme.spacing.lg,
    },
    secondaryButton: {
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      backgroundColor: theme.colors.cardMuted,
    },
    secondaryButtonText: {
      color: theme.colors.text,
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.semibold,
      textAlign: 'center',
    },
    identityCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing.xs,
    },
    didText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.text,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
  });
}
