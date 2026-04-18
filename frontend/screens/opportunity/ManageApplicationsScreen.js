import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Image,
  Modal, ScrollView, RefreshControl, Platform, KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const STATUS_COLOR = {
  pending: '#f39c12',
  approved: '#27ae60',
  completed: '#2e86de',
  rejected: '#e74c3c'
};

const STATUS_LABEL = {
  pending: 'Pending',
  approved: 'Accepted',
  completed: 'Completed',
  rejected: 'Rejected'
};

const FILTERS = ['all', 'pending', 'approved', 'completed', 'rejected'];

const ManageApplicationsScreen = ({ route, navigation }) => {
  const { opportunityId } = route.params;
  const toast = useToast();
  const confirm = useConfirm();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});

  // Detail modal
  const [detailApp, setDetailApp] = useState(null);

  const fetchData = async () => {
    try {
      const res = await api.get(`/api/applications/opportunity/${opportunityId}`);
      setApplications(res.data);
    } catch {
      toast.error('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const updateStatus = async (appId, status) => {
    setActionLoading(prev => ({ ...prev, [appId + status]: true }));
    try {
      await api.put(`/api/applications/${appId}/status`, { status });
      // Update in-place so the applicant stays visible with new status
      setApplications(prev => prev.map(a => a._id === appId ? { ...a, status } : a));
      if (detailApp?._id === appId) setDetailApp(prev => ({ ...prev, status }));
      toast.success('Updated', `Applicant marked as ${STATUS_LABEL[status]}`);
    } catch {
      toast.error('Error', 'Failed to update status');
    } finally {
      setActionLoading(prev => ({ ...prev, [appId + status]: false }));
    }
  };

  const handleRemove = (app) => {
    confirm.show({
      title: 'Remove Volunteer',
      message: `Remove ${app.volunteer?.name} from this opportunity?`,
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.put(`/api/applications/${app._id}/revoke`);
          setApplications(prev => prev.map(a => a._id === app._id ? { ...a, status: 'rejected' } : a));
          if (detailApp?._id === app._id) setDetailApp(null);
          toast.success('Removed', 'Volunteer removed from opportunity');
        } catch {
          toast.error('Error', 'Failed to remove volunteer');
        }
      }
    });
  };

  const isLoading = (appId, action) => !!actionLoading[appId + action];

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter);

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? applications.length : applications.filter(a => a.status === f).length;
    return acc;
  }, {});

  const renderInlineActions = (app) => {
    const busy = Object.keys(actionLoading).some(k => k.startsWith(app._id) && actionLoading[k]);
    if (app.status === 'pending') {
      return (
        <View style={styles.inlineActions}>
          <TouchableOpacity
            style={[styles.inlineBtn, styles.inlineBtnAccept]}
            onPress={() => updateStatus(app._id, 'approved')}
            disabled={busy}
          >
            {isLoading(app._id, 'approved')
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="checkmark" size={13} color="#fff" /><Text style={styles.inlineBtnText}> Accept</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.inlineBtn, styles.inlineBtnReject]}
            onPress={() => updateStatus(app._id, 'rejected')}
            disabled={busy}
          >
            {isLoading(app._id, 'rejected')
              ? <ActivityIndicator size="small" color="#e74c3c" />
              : <><Ionicons name="close" size={13} color="#e74c3c" /><Text style={[styles.inlineBtnText, { color: '#e74c3c' }]}> Reject</Text></>
            }
          </TouchableOpacity>
        </View>
      );
    }
    if (app.status === 'approved') {
      return (
        <View style={styles.inlineActions}>
          <TouchableOpacity
            style={[styles.inlineBtn, styles.inlineBtnCompletion]}
            onPress={() => updateStatus(app._id, 'completed')}
            disabled={busy}
          >
            {isLoading(app._id, 'completed')
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="trophy-outline" size={13} color="#fff" /><Text style={styles.inlineBtnText}> Finish</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.inlineBtn, styles.inlineBtnContrib]}
            onPress={() => navigation.navigate('AllContributions')}
          >
            <Ionicons name="time-outline" size={13} color="#9b59b6" />
            <Text style={[styles.inlineBtnText, { color: '#9b59b6' }]}> Hours</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.inlineBtn, styles.inlineBtnRemove]}
            onPress={() => handleRemove(app)}
            disabled={busy}
          >
            <Ionicons name="person-remove-outline" size={13} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const renderItem = ({ item }) => (
    <View style={[styles.row, { borderLeftColor: STATUS_COLOR[item.status] }]}>
      <TouchableOpacity
        style={styles.rowLeft}
        onPress={() => setDetailApp(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: STATUS_COLOR[item.status] }]}>
          <Text style={styles.avatarText}>{item.volunteer?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName}>{item.volunteer?.name}</Text>
          <Text style={styles.rowEmail} numberOfLines={1}>{item.volunteer?.email}</Text>
          <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
            <Text style={[styles.statusPillText, { color: STATUS_COLOR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.rowRight}>
        {renderInlineActions(item)}
      </View>
    </View>
  );

  // Detail modal content
  const renderDetail = () => {
    if (!detailApp) return null;
    const app = detailApp;
    const busy = Object.keys(actionLoading).some(k => k.startsWith(app._id) && actionLoading[k]);

    return (
      <View style={styles.detailContainer}>
        {/* Header */}
        <View style={styles.detailTopBar}>
          <TouchableOpacity onPress={() => setDetailApp(null)} style={styles.detailClose}>
            <Ionicons name="close" size={22} color="#555" />
          </TouchableOpacity>
          <Text style={styles.detailTopTitle}>Applicant Details</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
          {/* Profile header */}
          <View style={styles.detailProfile}>
            <View style={[styles.detailAvatar, { backgroundColor: STATUS_COLOR[app.status] }]}>
              <Text style={styles.detailAvatarText}>{app.volunteer?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
            <Text style={styles.detailName}>{app.volunteer?.name}</Text>
            <View style={[styles.detailStatusPill, { backgroundColor: STATUS_COLOR[app.status] }]}>
              <Text style={styles.detailStatusText}>{STATUS_LABEL[app.status]}</Text>
            </View>
          </View>

          {app.photo ? (
            <Image source={{ uri: `${BASE_URL}/${app.photo}` }} style={styles.detailPhoto} resizeMode="cover" />
          ) : null}

          {/* Contact info */}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Contact</Text>
            <View style={styles.detailField}>
              <Ionicons name="mail-outline" size={15} color="#888" style={{ width: 22 }} />
              <Text style={styles.detailFieldText}>{app.volunteer?.email || '—'}</Text>
            </View>
            {(app.phone || app.volunteer?.phone) ? (
              <View style={styles.detailField}>
                <Ionicons name="call-outline" size={15} color="#888" style={{ width: 22 }} />
                <Text style={styles.detailFieldText}>{app.phone || app.volunteer?.phone}</Text>
              </View>
            ) : null}
            {app.expectedHours ? (
              <View style={styles.detailField}>
                <Ionicons name="time-outline" size={15} color="#888" style={{ width: 22 }} />
                <Text style={styles.detailFieldText}>Expected {app.expectedHours} hour{app.expectedHours !== 1 ? 's' : ''}</Text>
              </View>
            ) : null}
            <View style={styles.detailField}>
              <Ionicons name="calendar-outline" size={15} color="#888" style={{ width: 22 }} />
              <Text style={styles.detailFieldText}>Applied {new Date(app.appliedAt).toDateString()}</Text>
            </View>
          </View>

          {(app.coverLetter || app.motivation || app.hopingToGain) && (
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Application</Text>
              {app.coverLetter ? (
                <>
                  <Text style={styles.detailSubLabel}>Cover Letter</Text>
                  <Text style={styles.detailCardText}>{app.coverLetter}</Text>
                </>
              ) : null}
              {app.motivation ? (
                <>
                  <Text style={styles.detailSubLabel}>Motivation</Text>
                  <Text style={styles.detailCardText}>{app.motivation}</Text>
                </>
              ) : null}
              {app.hopingToGain ? (
                <>
                  <Text style={styles.detailSubLabel}>Hoping to Gain</Text>
                  <Text style={styles.detailCardText}>{app.hopingToGain}</Text>
                </>
              ) : null}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.detailActions}>
            {app.status === 'pending' && (
              <>
                <TouchableOpacity
                  style={[styles.detailBtn, { backgroundColor: '#27ae60' }]}
                  onPress={() => updateStatus(app._id, 'approved')}
                  disabled={busy}
                >
                  {isLoading(app._id, 'approved')
                    ? <ActivityIndicator color="#fff" />
                    : <><Ionicons name="checkmark-circle-outline" size={16} color="#fff" /><Text style={styles.detailBtnText}> Accept</Text></>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailBtn, { borderWidth: 1.5, borderColor: '#e74c3c', backgroundColor: '#fff' }]}
                  onPress={() => updateStatus(app._id, 'rejected')}
                  disabled={busy}
                >
                  {isLoading(app._id, 'rejected')
                    ? <ActivityIndicator color="#e74c3c" />
                    : <><Ionicons name="close-circle-outline" size={16} color="#e74c3c" /><Text style={[styles.detailBtnText, { color: '#e74c3c' }]}> Reject</Text></>
                  }
                </TouchableOpacity>
              </>
            )}
            {app.status === 'approved' && (
              <>
                <TouchableOpacity
                  style={[styles.detailBtn, { backgroundColor: '#2e86de' }]}
                  onPress={() => updateStatus(app._id, 'completed')}
                  disabled={busy}
                >
                  {isLoading(app._id, 'completed')
                    ? <ActivityIndicator color="#fff" />
                    : <><Ionicons name="trophy-outline" size={16} color="#fff" /><Text style={styles.detailBtnText}> Mark Completion</Text></>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailBtn, { backgroundColor: '#9b59b6' }]}
                  onPress={() => { setDetailApp(null); navigation.navigate('AllContributions'); }}
                >
                  <Ionicons name="time-outline" size={16} color="#fff" />
                  <Text style={styles.detailBtnText}> Contributions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailBtn, { borderWidth: 1.5, borderColor: '#e74c3c', backgroundColor: '#fff' }]}
                  onPress={() => handleRemove(app)}
                  disabled={busy}
                >
                  <Ionicons name="person-remove-outline" size={16} color="#e74c3c" />
                  <Text style={[styles.detailBtnText, { color: '#e74c3c' }]}> Remove</Text>
                </TouchableOpacity>
              </>
            )}
            {app.status === 'completed' && (
              <TouchableOpacity
                style={[styles.detailBtn, { backgroundColor: '#9b59b6' }]}
                onPress={() => { setDetailApp(null); navigation.navigate('AllContributions'); }}
              >
                <Ionicons name="time-outline" size={16} color="#fff" />
                <Text style={styles.detailBtnText}> View Contributions</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', count: counts.all, color: '#2e86de' },
          { label: 'Pending', count: counts.pending, color: '#f39c12' },
          { label: 'Accepted', count: counts.approved, color: '#27ae60' },
          { label: 'Done', count: counts.completed, color: '#2e86de' },
        ].map(s => (
          <View key={s.label} style={styles.statBox}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.count}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingVertical: 8 }}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && { backgroundColor: STATUS_COLOR[f] || '#2e86de' }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && { color: '#fff' }]}>
              {f === 'all' ? 'All' : STATUS_LABEL[f]} {counts[f] > 0 ? `(${counts[f]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#ddd" />
            <Text style={styles.emptyText}>No {filter === 'all' ? '' : STATUS_LABEL[filter]?.toLowerCase() + ' '}applicants</Text>
          </View>
        }
      />

      {/* Applicant Detail Modal */}
      <Modal visible={!!detailApp} animationType="slide" onRequestClose={() => setDetailApp(null)}>
        {renderDetail()}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statsRow: { flexDirection: 'row', padding: 12, paddingBottom: 4, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statNum: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2 },

  filterScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f0f4f8', borderWidth: 1, borderColor: '#ddd' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#555' },

  row: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 8,
    elevation: 2, flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden', borderLeftWidth: 4, paddingRight: 10
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, padding: 12, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  rowEmail: { fontSize: 11, color: '#888', marginTop: 1, marginBottom: 4 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 10, fontWeight: 'bold' },
  rowRight: { alignItems: 'flex-end', flexShrink: 0 },

  inlineActions: { flexDirection: 'column', gap: 4 },
  inlineBtn: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 72, justifyContent: 'center'
  },
  inlineBtnAccept: { backgroundColor: '#27ae60' },
  inlineBtnReject: { backgroundColor: '#fde8e8', borderWidth: 1, borderColor: '#e74c3c' },
  inlineBtnCompletion: { backgroundColor: '#2e86de' },
  inlineBtnContrib: { backgroundColor: '#f3eeff', borderWidth: 1, borderColor: '#9b59b6' },
  inlineBtnRemove: { backgroundColor: '#fde8e8', borderWidth: 1, borderColor: '#e74c3c', minWidth: 36, paddingHorizontal: 8 },
  inlineBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: '#aaa', fontSize: 14 },

  // Detail modal
  detailContainer: { flex: 1, backgroundColor: '#f0f4f8' },
  detailTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#eee', elevation: 2
  },
  detailClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f4f8', justifyContent: 'center', alignItems: 'center' },
  detailTopTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  detailScroll: { flex: 1 },
  detailProfile: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#fff', marginBottom: 10 },
  detailAvatar: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  detailAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 28 },
  detailName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  detailStatusPill: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 5 },
  detailStatusText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  detailPhoto: { width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 10, borderWidth: 2, borderColor: '#ddd' },

  detailCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 12, marginBottom: 10, elevation: 1 },
  detailCardTitle: { fontSize: 13, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  detailField: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailFieldText: { fontSize: 14, color: '#444', flex: 1 },
  detailSubLabel: { fontSize: 11, fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  detailCardText: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 4 },

  detailActions: { marginHorizontal: 12, marginBottom: 30, gap: 10 },
  detailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, padding: 14, elevation: 1
  },
  detailBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});

export default ManageApplicationsScreen;
