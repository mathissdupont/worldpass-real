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

export default function LoginScreen({ navigation }) {
  const { signIn, error: authError } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const hasEmptyFields = !email.trim() || !password;
  const combinedError = formError || authError;

  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleSubmit = async () => {
    if (hasEmptyFields) {
      setFormError('Email and password are required');
      return;
    }

    try {
      setFormError(null);
      setSubmitting(true);
      await signIn(email.trim(), password);
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
            <TextInput
              placeholder="Email"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {combinedError ? (
              <Text style={styles.errorText}>{combinedError}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (submitting || hasEmptyFields) && styles.primaryButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting || hasEmptyFields}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              style={styles.linkContainer}
            >
              <Text style={styles.linkText}>
                Don&apos;t have an account?{' '}
                <Text style={styles.linkHighlight}>Register</Text>
              </Text>
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
                Import wallet identity (.wpkeystore)
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
  });
}
