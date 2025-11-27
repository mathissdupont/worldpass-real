import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../lib/api';

export default function TransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setError(null);
      const filterStatus = filter === 'all' ? null : filter;
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const result = await apiRequest(`/api/payments/transactions${params}`);
      setTransactions(result.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError(err?.message || 'Failed to load transactions');
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchTransactions().finally(() => setLoading(false));
  }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amountMinor, currency) => {
    return `$${(amountMinor / 100).toFixed(2)}`;
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'success':
        return { 
          label: 'Success', 
          color: '#22c55e', 
          bg: '#dcfce7', 
          icon: 'checkmark-circle' 
        };
      case 'pending':
        return { 
          label: 'Pending', 
          color: '#f59e0b', 
          bg: '#fef3c7', 
          icon: 'time' 
        };
      case 'failed':
        return { 
          label: 'Failed', 
          color: '#ef4444', 
          bg: '#fee2e2', 
          icon: 'close-circle' 
        };
      default:
        return { 
          label: status, 
          color: '#6b7280', 
          bg: '#f3f4f6', 
          icon: 'help-circle' 
        };
    }
  };

  const FilterChip = ({ value, label }) => (
    <TouchableOpacity
      style={[styles.filterChip, filter === value && styles.filterChipActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.filterChipText, filter === value && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const TransactionItem = ({ item }) => {
    const status = getStatusConfig(item.status);
    
    return (
      <View style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionId}>#{item.id}</Text>
            <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        
        <Text style={styles.transactionDescription}>
          {item.description || 'No description'}
        </Text>
        
        <View style={styles.transactionFooter}>
          <Text style={styles.transactionAmount}>
            {formatAmount(item.amount_minor, item.currency)}
          </Text>
          <Text style={styles.transactionCurrency}>
            {(item.currency || 'USD').toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  const Stats = () => {
    const successCount = transactions.filter(t => t.status === 'success').length;
    const totalAmount = transactions
      .filter(t => t.status === 'success')
      .reduce((sum, t) => sum + t.amount_minor, 0);

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{transactions.length}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#22c55e' }]}>{successCount}</Text>
          <Text style={styles.statLabel}>Successful</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${(totalAmount / 100).toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
      </View>
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptyText}>
        Your payment history will appear here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <Text style={styles.headerSubtitle}>View all your payments</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <FilterChip value="all" label="All" />
        <FilterChip value="success" label="Success" />
        <FilterChip value="pending" label="Pending" />
        <FilterChip value="failed" label="Failed" />
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats */}
      {transactions.length > 0 && <Stats />}

      {/* Transactions List */}
      <FlatList
        data={transactions}
        renderItem={({ item }) => <TransactionItem item={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4f46e5']}
            tintColor="#4f46e5"
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  filterContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterChipActive: {
    backgroundColor: '#4f46e5',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
  },
  retryText: {
    color: '#4f46e5',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionId: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#6b7280',
  },
  transactionDate: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  transactionDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  transactionFooter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  transactionCurrency: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  separator: {
    height: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
