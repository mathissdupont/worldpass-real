import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Button Component
export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
}) {
  const variantStyles = {
    primary: {
      container: styles.buttonPrimary,
      text: styles.buttonPrimaryText,
      iconColor: '#fff',
    },
    secondary: {
      container: styles.buttonSecondary,
      text: styles.buttonSecondaryText,
      iconColor: '#4f46e5',
    },
    outline: {
      container: styles.buttonOutline,
      text: styles.buttonOutlineText,
      iconColor: '#374151',
    },
    danger: {
      container: styles.buttonDanger,
      text: styles.buttonDangerText,
      iconColor: '#ef4444',
    },
    ghost: {
      container: styles.buttonGhost,
      text: styles.buttonGhostText,
      iconColor: '#6b7280',
    },
  };

  const sizeStyles = {
    sm: styles.buttonSm,
    md: styles.buttonMd,
    lg: styles.buttonLg,
  };

  const v = variantStyles[variant] || variantStyles.primary;
  const s = sizeStyles[size] || sizeStyles.md;

  return (
    <TouchableOpacity
      style={[styles.button, v.container, s, disabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.iconColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={v.iconColor} />}
          <Text style={[styles.buttonText, v.text]}>{children}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// Card Component
export function Card({ children, style, title, subtitle, headerRight }) {
  return (
    <View style={[styles.card, style]}>
      {(title || subtitle || headerRight) && (
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            {title && <Text style={styles.cardTitle}>{title}</Text>}
            {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
          </View>
          {headerRight}
        </View>
      )}
      {children}
    </View>
  );
}

// Badge Component
export function Badge({ children, variant = 'neutral', icon }) {
  const variantStyles = {
    neutral: { bg: '#f3f4f6', text: '#374151' },
    primary: { bg: '#eef2ff', text: '#4f46e5' },
    success: { bg: '#dcfce7', text: '#166534' },
    warning: { bg: '#fef3c7', text: '#92400e' },
    danger: { bg: '#fee2e2', text: '#991b1b' },
    info: { bg: '#eff6ff', text: '#1e40af' },
  };

  const v = variantStyles[variant] || variantStyles.neutral;

  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
      {icon && <Ionicons name={icon} size={12} color={v.text} />}
      <Text style={[styles.badgeText, { color: v.text }]}>{children}</Text>
    </View>
  );
}

// Input Component
export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  multiline = false,
  numberOfLines = 1,
  icon,
  rightElement,
  style,
}) {
  return (
    <View style={[styles.inputContainer, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        {icon && <Ionicons name={icon} size={20} color="#6b7280" style={styles.inputIcon} />}
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
        {rightElement}
      </View>
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
}

// Alert Component
export function Alert({ children, variant = 'info', title, icon }) {
  const variantStyles = {
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: 'information-circle' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', icon: 'checkmark-circle' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: 'warning' },
    danger: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: 'alert-circle' },
  };

  const v = variantStyles[variant] || variantStyles.info;

  return (
    <View style={[styles.alert, { backgroundColor: v.bg, borderColor: v.border }]}>
      <Ionicons name={icon || v.icon} size={20} color={v.text} />
      <View style={styles.alertContent}>
        {title && <Text style={[styles.alertTitle, { color: v.text }]}>{title}</Text>}
        <Text style={[styles.alertText, { color: v.text }]}>{children}</Text>
      </View>
    </View>
  );
}

// Skeleton Loader
export function Skeleton({ width, height, borderRadius = 8, style }) {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    />
  );
}

// Divider
export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

// Empty State
export function EmptyState({ icon, title, description, action, actionLabel }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name={icon || 'folder-open-outline'} size={48} color="#9ca3af" />
      </View>
      {title && <Text style={styles.emptyStateTitle}>{title}</Text>}
      {description && <Text style={styles.emptyStateDescription}>{description}</Text>}
      {action && (
        <Button variant="primary" onPress={action} style={styles.emptyStateButton}>
          {actionLabel || 'Get Started'}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Button styles
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
  },
  buttonSm: { paddingVertical: 8, paddingHorizontal: 12 },
  buttonMd: { paddingVertical: 12, paddingHorizontal: 16 },
  buttonLg: { paddingVertical: 16, paddingHorizontal: 20 },
  buttonPrimary: { backgroundColor: '#4f46e5' },
  buttonPrimaryText: { color: '#fff' },
  buttonSecondary: { backgroundColor: '#eef2ff' },
  buttonSecondaryText: { color: '#4f46e5' },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#e5e7eb' },
  buttonOutlineText: { color: '#374151' },
  buttonDanger: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  buttonDangerText: { color: '#ef4444' },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonGhostText: { color: '#6b7280' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 14, fontWeight: '600' },

  // Card styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  // Badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: '500' },

  // Input styles
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  inputWrapperError: { borderColor: '#ef4444' },
  inputIcon: { marginLeft: 14 },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111827',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { fontSize: 12, color: '#ef4444', marginTop: 4 },

  // Alert styles
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  alertText: { fontSize: 13, lineHeight: 18 },

  // Skeleton styles
  skeleton: {
    backgroundColor: '#e5e7eb',
  },

  // Divider styles
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },

  // Empty State styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateButton: {
    marginTop: 20,
  },
});
