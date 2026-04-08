import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api';

const STATUS_COLOR = { pending: '#f39c12', verified: '#27ae60', rejected: '#e74c3c' };
const STATUS_ICON = { pending: '⏳', verified: '✅', rejected: '❌' };

const AllContributionsScreen = () => {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState({});

  const fetchData = async () => {
    try {
      const res = await api.get('/api/contributions/creator/all');
      setContributions(res.data || []);
    } catch {
      Alert.alert('Error', 'Failed to load contributions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleAction = async (id, status) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.put(`/api/contributions/${id}/status`, { status });
      setContributions(prev => prev.map(c => c._id === id ? { ...c, status } : c));
    } catch {
      Alert.alert('Error', `Failed to ${status === 'verified' ? 'approve' : 'reject'} contribution`);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const filtered = contributions.filter(c => c.status === filter);

  const counts = {
    pending: contributions.filter(c => c.status === 'pending').length,
    verified: contributions.filter(c => c.status === 'verified').length,
    rejected: contributions.filter(c => c.status === 'rejected').length
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#9b59b6" /></View>;

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {['pending', 'verified', 'rejected'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {STATUS_ICON[f]} {f.charAt(0).toUpperCase() + f.slice(1)} {counts[f] > 0 ? `(${counts[f]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No {filter} contributions</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isLoading = actionLoading[item._id];
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                    {STATUS_ICON[item.status]} {item.status}
                  </Text>
                </View>
                <Text style={styles.date}>{new Date(item.createdAt).toDateString()}</Text>
              </View>

              <Text style={styles.volunteer}>👤 {item.volunteer?.name || 'Unknown'}</Text>
              <Text style={styles.opportunity}>📌 {item.opportunity?.title || 'Opportunity'}</Text>
              <Text style={styles.hours}>⏱ {item.hours} hours</Text>
              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

              {item.status === 'pending' && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleAction(item._id, 'verified')}
                    disabled={isLoading}
                  >
                    {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.approveBtnText}>✅ Verify</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleAction(item._id, 'rejected')}
                    disabled={isLoading}
                  >
                    {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.rejectBtnText}>❌ Reject</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f0f4f8', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#9b59b6' },
  filterBtnText: { fontSize: 12, color: '#555', fontWeight: '600', textAlign: 'center' },
  filterBtnTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  date: { fontSize: 12, color: '#aaa' },
  volunteer: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 3 },
  opportunity: { fontSize: 13, color: '#555', marginBottom: 3 },
  hours: { fontSize: 14, color: '#2e86de', fontWeight: '600', marginBottom: 4 },
  description: { fontSize: 13, color: '#777', fontStyle: 'italic', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  approveBtn: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, padding: 10, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontWeight: 'bold' },
  rejectBtn: { flex: 1, backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectBtnText: { color: '#fff', fontWeight: 'bold' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#999', fontSize: 15 }
});

export default AllContributionsScreen;
