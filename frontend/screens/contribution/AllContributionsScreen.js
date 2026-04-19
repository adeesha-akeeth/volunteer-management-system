import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../../components/Toast';
import AutoHeightImage from '../../components/AutoHeightImage';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';
const STATUS_COLOR = { pending: '#f39c12', verified: '#27ae60', rejected: '#e74c3c' };
const STATUS_ICON = { pending: '⏳', verified: '✅', rejected: '❌' };

const AllContributionsScreen = () => {
  const toast = useToast();
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const [selected, setSelected] = useState(null);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/contributions/creator/all');
      setContributions(res.data || []);
    } catch {
      toast.error('Error', 'Failed to load contributions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleAction = async (id, status) => {
    setActionLoading(prev => ({ ...prev, [id]: status }));
    try {
      await api.put(`/api/contributions/${id}/status`, { status });
      setContributions(prev => prev.map(c => c._id === id ? { ...c, status } : c));
      if (selected?._id === id) setSelected(prev => ({ ...prev, status }));
    } catch {
      toast.error('Error', `Failed to ${status === 'verified' ? 'approve' : 'reject'} contribution`);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: undefined }));
    }
  };

  const counts = {
    all: contributions.length,
    pending: contributions.filter(c => c.status === 'pending').length,
    verified: contributions.filter(c => c.status === 'verified').length,
    rejected: contributions.filter(c => c.status === 'rejected').length
  };

  const filtered = filter === 'all' ? contributions : contributions.filter(c => c.status === filter);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#9b59b6" /></View>;

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {['all', 'pending', 'verified', 'rejected'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f === 'all' ? '📋' : STATUS_ICON[f]} {f.charAt(0).toUpperCase() + f.slice(1)} {counts[f] > 0 ? `(${counts[f]})` : ''}
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
        renderItem={({ item }) => (
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
            <Text style={styles.opportunity} numberOfLines={1}>📌 {item.opportunity?.title || 'Opportunity'}</Text>
            <Text style={styles.hours}>⏱ {item.hours} hours</Text>

            <TouchableOpacity style={styles.detailsBtn} onPress={() => setSelected(item)}>
              <Ionicons name="information-circle-outline" size={15} color="#9b59b6" style={{ marginRight: 5 }} />
              <Text style={styles.detailsBtnText}>More Details</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Detail Modal */}
      {selected && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Contribution Details</Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="close" size={22} color="#888" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                {/* Status */}
                <View style={[styles.detailStatusBar, { backgroundColor: STATUS_COLOR[selected.status] + '18' }]}>
                  <Text style={[styles.detailStatusText, { color: STATUS_COLOR[selected.status] }]}>
                    {STATUS_ICON[selected.status]} {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Volunteer</Text>
                  <Text style={styles.detailValue}>{selected.volunteer?.name || 'Unknown'}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selected.volunteer?.email || '—'}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Opportunity</Text>
                  <Text style={styles.detailValue}>{selected.opportunity?.title || '—'}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Hours</Text>
                  <Text style={[styles.detailValue, { color: '#9b59b6', fontWeight: 'bold', fontSize: 18 }]}>
                    {selected.hours} hr{selected.hours !== 1 ? 's' : ''}
                  </Text>
                </View>
                {selected.description ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={[styles.detailValue, { fontStyle: 'italic' }]}>{selected.description}</Text>
                  </View>
                ) : null}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Submitted</Text>
                  <Text style={styles.detailValue}>{new Date(selected.createdAt).toDateString()}</Text>
                </View>

                {selected.proofImage ? (
                  <View style={styles.proofSection}>
                    <Text style={styles.detailLabel}>Proof Photo</Text>
                    <AutoHeightImage
                      uri={`${BASE_URL}/${selected.proofImage}`}
                      style={styles.proofImage}
                      borderRadius={10}
                    />
                  </View>
                ) : (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Proof Photo</Text>
                    <Text style={[styles.detailValue, { color: '#bbb' }]}>No photo attached</Text>
                  </View>
                )}

                {selected.status === 'pending' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.verifyBtn}
                      onPress={() => handleAction(selected._id, 'verified')}
                      disabled={!!actionLoading[selected._id]}
                    >
                      {actionLoading[selected._id] === 'verified'
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.actionBtnText}>✅ Verify</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleAction(selected._id, 'rejected')}
                      disabled={!!actionLoading[selected._id]}
                    >
                      {actionLoading[selected._id] === 'rejected'
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.actionBtnText}>❌ Reject</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
  hours: { fontSize: 14, color: '#2e86de', fontWeight: '600', marginBottom: 8 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#f8f4ff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#9b59b6' },
  detailsBtnText: { color: '#9b59b6', fontWeight: 'bold', fontSize: 13 },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#999', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', paddingHorizontal: 20, paddingBottom: 10 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  detailStatusBar: { borderRadius: 10, padding: 12, marginBottom: 14, alignItems: 'center' },
  detailStatusText: { fontSize: 15, fontWeight: 'bold' },
  detailSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  detailLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  detailValue: { fontSize: 14, color: '#333', flex: 1, textAlign: 'right', marginLeft: 10 },
  proofSection: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  proofImage: { marginTop: 10 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  verifyBtn: { flex: 1, backgroundColor: '#27ae60', borderRadius: 12, padding: 14, alignItems: 'center' },
  rejectBtn: { flex: 1, backgroundColor: '#e74c3c', borderRadius: 12, padding: 14, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

export default AllContributionsScreen;
