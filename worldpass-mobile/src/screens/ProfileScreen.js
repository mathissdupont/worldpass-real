import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useIdentity } from '../context/IdentityContext';
import { updateUserProfile, getUserProfile } from '../lib/api';

const PROFILE_FIELDS = [
  { id: 'email', label: 'Email', icon: 'mail-outline', type: 'email-address', placeholder: 'email@example.com' },
  { id: 'phone', label: 'Phone', icon: 'call-outline', type: 'phone-pad', placeholder: '+1 234 567 8900' },
  { id: 'instagram', label: 'Instagram', icon: 'logo-instagram', type: 'default', placeholder: '@username' },
  { id: 'twitter', label: 'Twitter/X', icon: 'logo-twitter', type: 'default', placeholder: '@username' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin', type: 'default', placeholder: 'linkedin.com/in/...' },
  { id: 'github', label: 'GitHub', icon: 'logo-github', type: 'default', placeholder: '@username' },
  { id: 'website', label: 'Website', icon: 'globe-outline', type: 'url', placeholder: 'https://...' },
  { id: 'bio', label: 'Bio', icon: 'document-text-outline', type: 'default', placeholder: 'Tell us about yourself...', multiline: true },
];

export default function ProfileScreen({ navigation }) {
  const { user, refreshProfile } = useAuth();
  const { identity } = useIdentity();
  const [profileData, setProfileData] = useState({});
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [tempValue, setTempValue] = useState('');

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const profile = await getUserProfile();
      setDisplayName(profile.name || profile.displayName || '');
      setProfileData(profile.profile_data || {});
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }
    
    try {
      setSaving(true);
      await updateUserProfile({ name: displayName.trim() });
      await refreshProfile();
      Alert.alert('Success', 'Display name updated');
    } catch (error) {
      console.error('Failed to save display name:', error);
      Alert.alert('Error', 'Failed to save display name');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveField = async (fieldId, value) => {
    try {
      setSaving(true);
      const updated = { ...profileData, [fieldId]: value };
      await updateUserProfile({ profile_data: updated });
      setProfileData(updated);
      setEditingField(null);
      setTempValue('');
    } catch (error) {
      console.error('Failed to save field:', error);
      Alert.alert('Error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveField = async (fieldId) => {
    Alert.alert(
      'Remove Field',
      'Are you sure you want to remove this field?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const updated = { ...profileData };
              delete updated[fieldId];
              await updateUserProfile({ profile_data: updated });
              setProfileData(updated);
            } catch (error) {
              console.error('Failed to remove field:', error);
              Alert.alert('Error', 'Failed to remove');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const startEditing = (fieldId, currentValue) => {
    setEditingField(fieldId);
    setTempValue(currentValue || '');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  const getInitials = (name) => {
    if (!name) return 'WP';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'WP';
  };

  const filledCount = Object.keys(profileData).filter(k => profileData[k]).length;
  const totalFields = PROFILE_FIELDS.length;
  const progressPercent = (filledCount / totalFields) * 100;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
            </View>
          </View>
          
          <Text style={styles.displayNameLabel}>Display Name</Text>
          <View style={styles.displayNameRow}>
            <TextInput
              style={styles.displayNameInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity 
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveDisplayName}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {identity?.did && (
            <View style={styles.didBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#22c55e" />
              <Text style={styles.didBadgeText}>Identity Linked</Text>
            </View>
          )}
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Profile Completion</Text>
            <Text style={styles.progressCount}>{filledCount}/{totalFields}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Profile Fields */}
        <View style={styles.fieldsSection}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          
          {PROFILE_FIELDS.map((field) => {
            const value = profileData[field.id];
            const isEditing = editingField === field.id;

            if (isEditing) {
              return (
                <View key={field.id} style={styles.fieldCardEditing}>
                  <View style={styles.fieldHeader}>
                    <Ionicons name={field.icon} size={20} color="#4f46e5" />
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                  </View>
                  <TextInput
                    style={[styles.fieldInput, field.multiline && styles.fieldInputMultiline]}
                    value={tempValue}
                    onChangeText={setTempValue}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9ca3af"
                    keyboardType={field.type}
                    multiline={field.multiline}
                    numberOfLines={field.multiline ? 3 : 1}
                    autoFocus
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={cancelEditing}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.editButton, styles.saveFieldButton]}
                      onPress={() => handleSaveField(field.id, tempValue)}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            if (!value) {
              return (
                <TouchableOpacity 
                  key={field.id} 
                  style={styles.fieldCardEmpty}
                  onPress={() => startEditing(field.id, '')}
                >
                  <Ionicons name={field.icon} size={20} color="#9ca3af" />
                  <Text style={styles.fieldLabelEmpty}>Add {field.label}</Text>
                  <Ionicons name="add" size={20} color="#9ca3af" />
                </TouchableOpacity>
              );
            }

            return (
              <View key={field.id} style={styles.fieldCard}>
                <View style={styles.fieldContent}>
                  <Ionicons name={field.icon} size={20} color="#4f46e5" />
                  <View style={styles.fieldTextContainer}>
                    <Text style={styles.fieldLabelSmall}>{field.label}</Text>
                    <Text style={styles.fieldValue}>{value}</Text>
                  </View>
                </View>
                <View style={styles.fieldActions}>
                  <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={() => startEditing(field.id, value)}
                  >
                    <Ionicons name="pencil" size={18} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={() => handleRemoveField(field.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Your profile information is stored securely and linked to your WorldPass identity.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  displayNameLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  displayNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  displayNameInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  saveButton: {
    width: 48,
    height: 48,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  didBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dcfce7',
    borderRadius: 20,
  },
  didBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4f46e5',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 4,
  },
  fieldsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldCardEmpty: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
  },
  fieldCardEditing: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#4f46e5',
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  fieldLabelEmpty: {
    flex: 1,
    fontSize: 14,
    color: '#9ca3af',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  fieldInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  saveFieldButton: {
    backgroundColor: '#4f46e5',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  fieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fieldTextContainer: {
    flex: 1,
  },
  fieldLabelSmall: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 14,
    color: '#111827',
  },
  fieldActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 18,
  },
});
