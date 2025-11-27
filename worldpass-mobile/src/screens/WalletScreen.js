import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getCredentials, deleteCredential } from '../lib/storage';
import { useIdentity } from '../context/IdentityContext';

export default function WalletScreen() {
  const [credentials, setCredentials] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const { identity } = useIdentity();
  const navigation = useNavigation();
  const walletDid = identity?.did || '';

  const loadCredentials = async () => {
    try {
      const creds = await getCredentials();
      setCredentials(creds);
    } catch (error) {
      Alert.alert('Error', 'Failed to load credentials');
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCredentials();
    setRefreshing(false);
  };

  const handleDelete = (credential) => {
    Alert.alert(
      'Delete Credential',
      'Are you sure you want to delete this credential?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCredential(credential.jti);
            loadCredentials();
          },
        },
      ]
    );
  };

  const renderCredential = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedCredential(item)}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardType}>{item.type[item.type.length - 1]}</Text>
          <Text style={styles.cardIssuer}>Issued by: {item.issuer}</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('VCQR', { credential: item })}
          >
            <Ionicons name="qr-code-outline" size={20} color="#4f46e5" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardLabel}>Holder:</Text>
        <Text style={styles.cardValue}>{item.credentialSubject?.id || 'N/A'}</Text>
        <Text style={styles.cardLabel}>Issued:</Text>
        <Text style={styles.cardValue}>
          {new Date(item.issuanceDate).toLocaleDateString()}
        </Text>
        {item.expirationDate && (
          <>
            <Text style={styles.cardLabel}>Expires:</Text>
            <Text style={styles.cardValue}>
              {new Date(item.expirationDate).toLocaleDateString()}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="wallet-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No credentials yet</Text>
      <Text style={styles.emptySubtext}>
        Scan QR codes to add verifiable credentials
      </Text>
    </View>
  );

  const IdentityBanner = () => (
    <View style={[styles.identityCard, !walletDid && styles.identityCardWarning]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.identityLabel}>{walletDid ? 'Active DID' : 'No identity imported'}</Text>
        <Text style={styles.identityValue} numberOfLines={2}>
          {walletDid || 'Import your .wpkeystore to unlock wallet features'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.identityButton}
        onPress={() => navigation.navigate('Settings', { screen: 'IdentityImport' })}
      >
        <Text style={styles.identityButtonText}>{walletDid ? 'Manage' : 'Import'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={credentials}
        renderItem={renderCredential}
        keyExtractor={(item, index) => item?.jti || item?.id || `${item?.issuer || 'vc'}-${index}`}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<IdentityBanner />}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <Modal
        visible={!!selectedCredential}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedCredential(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Credential Details</Text>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.jsonText}>
                {selectedCredential ? JSON.stringify(selectedCredential, null, 2) : ''}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setSelectedCredential(null)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  identityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  identityCardWarning: {
    borderColor: '#fbbf24',
    backgroundColor: '#fffbeb',
  },
  identityLabel: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  identityValue: {
    fontSize: 14,
    color: '#111827',
    marginTop: 4,
  },
  identityButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  identityButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  cardType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cardIssuer: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  cardLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  cardValue: {
    fontSize: 14,
    color: '#1f2937',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  modalBody: {
    maxHeight: 300,
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#111827',
  },
  modalButton: {
    marginTop: 16,
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
