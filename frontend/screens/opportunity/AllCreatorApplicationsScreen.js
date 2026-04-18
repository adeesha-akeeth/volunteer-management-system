import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, ScrollView,
  Platform, KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';

const STATUS_COLOR = {
  pending: '#f39c12',
  approved: '#27ae60',
  rejected: '#e74c3c',
  completed: '#9b59b6'
};

const STATUS_LABEL = {
  pending: 'Pending',
  approved: 'Accepted',
  rejected: 'Rejected',
  completed: 'Completed'
};

const AVATAR_COLORS = ['#2e86de', '#27ae60', '#9b59b6', '#e67e22', '#e74c3c', '#1abc9c'];
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const initials = (name) => name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

const AllCreatorApplicationsScreen = ({ navigation }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const [selected, setSelected] = useState(null);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/applications/creator/all');
      setApplications(res.data || []);
    } catch {
      toast.error('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const updateStatus = async (appId, status) => {
    setActionLoading(prev => ({ ...prev, [appId]: status }));
    try {
      await api.put(`/api/applications/${appId}/status`, { status });
      setApplications(prev => prev.map(a => a._id === appId ? { ...a, status } : a));
      if (selected?._id === appId) setSelected(prev => ({ ...prev, status }));
    } catch {
      toast.error('Error', 'Failed to update application');
    } finally {
      setActionLoading(prev => ({ ...prev, [appId]: null }));
    }
  };

  const handleRemove = async (appId) => {
    const ok = await confirm({
      title: 'Remove Volunteer',
      message: 'Remove this volunteer from the opportunity?',
      confirmText: 'Remove',
      destructive: true
    });
    if (!ok) return;
    setActionLoading(prev => ({ ...prev, [appId]: 'remove' }));
    try {
      await api.put(`/api/applications/${appId}/revoke`);
      setApplications(prev => prev.map(a => a._id === appId ? { ...a, status: 'rejected' } : a));
      if (selected?._id === appId) setSelected(prev => ({ ...prev, status: 'rejected' }));
    } catch {
      toast.error('Error', 'Failed to remove volunteer');
    } finally {
      setActionLoading(prev => ({ ...prev, [appId]: null }));
    }
  };

  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    completed: applications.filter(a => a.status === 'completed').length,
    rejected: applications.filter(a => a.status === 'rejected').length
  };

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter);

  const ActionButtons = ({ app, modal = false }) => {
    const isLoading = actionLoading[app._id];
    const btnStyle = modal ? { flex: 1, paddingVertical: 11 } : {};

    if (app.status === 'pending') return (
      <View style={[styles.btnRow, modal && { marginTop: 6 }]}>
        <TouchableOpacity
          style={[styles.acceptBtn, btnStyle]}
          onPress={() => updateStatus(app._id, 'approved')}
          disabled={!!isLoading}
        >
          {isLoading === 'approved' ? <ActivityIndicator size="small" color="#fff" /> :
            <Text style={styles.acceptBtnText}>Accept</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rejectOutlineBtn, btnStyle]}
          onPress={() => updateStatus(app._id, 'rejected')}
          disabled={!!isLoading}
        >
          {isLoading === 'rejected' ? <ActivityIndicator size="small" color="#e74c3c" /> :
            <Text style={styles.rejectOutlineBtnText}>Reject</Text>}
        </TouchableOpacity>
      </View>
    );

    if (app.status === 'approved') return (
      <View style={[styles.btnRow, modal && { marginTop: 6 }]}>
        <TouchableOpacity
          style={[styles.finishBtn, btnStyle]}
          onPress={() => updateStatus(app._id, 'completed')}
          disabled={!!isLoading}
        >
          {isLoading === 'completed' ? <ActivityIndicator size="small" color="#fff" /> :
            <Text style={styles.finishBtnText}>Mark Completion</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.hoursBtn, btnStyle]}
          onPress={() => {
            if (modal) setSelected(null);
            navigation.navigate('AllContributions', { opportunityId: app.opportunity?._id });
          }}
          disabled={!!isLoading}
        >
          <Text style={styles.hoursBtnText}>Hours</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.removeIconBtn]}
          onPress={() => handleRemove(app._id)}
          disabled={!!isLoading}
        >
          {isLoading === 'remove' ? <ActivityIndicator size="small" color="#e74c3c" /> :
            <Ionicons name="person-remove-outline" size={18} color="#e74c3c" />}
        </TouchableOpacity>
      </View>
    );

    return null;
  };

  const renderItem = ({ item }) => {
    const color = avatarColor(item.volunteer?.name);
    return (
      <View style={[styles.card, { borderLeftColor: STATUS_COLOR[item.status] }]}>
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: color }]}>
            <Text style={styles.avatarText}>{initials(item.volunteer?.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => setSelected(item)}>
              <Text style={styles.applicantName}>{item.volunteer?.name || 'Applicant'}</Text>
            </TouchableOpacity>
            <Text style={styles.applicantEmail} numberOfLines={1}>{item.volunteer?.email}</Text>
            <Text style={styles.oppTitle} numberOfLines={1}>📌 {item.opportunity?.title}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
            <Text style={[styles.statusPillText, { color: STATUS_COLOR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
        {(item.status === 'pending' || item.status === 'approved') && (
          <ActionButtons app={item} />
        )}
      </View>
    );
  };

  const FILTERS = ['all', 'pending', 'approved', 'completed', 'rejected'];

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: counts.all, color: '#2e86de' },
          { label: 'Pending', value: counts.pending, color: '#f39c12' },
          { label: 'Accepted', value: counts.approved, color: '#27ae60' },
          { label: 'Done', value: counts.completed, color: '#9b59b6' }
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'all' ? 'All' : STATUS_LABEL[f]}
              {counts[f] > 0 ? ` (${counts[f]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 12, paddingTop: 8 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No applications found</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      {selected && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalHeaderTitle}>Applicant Details</Text>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <Ionicons name="close" size={24} color="#555" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Profile */}
                  <View style={styles.modalProfile}>
                    <View style={[styles.modalAvatar, { backgroundColor: avatarColor(selected.volunteer?.name) }]}>
                      <Text style={styles.modalAvatarText}>{initials(selected.volunteer?.name)}</Text>
                    </View>
                    <Text style={styles.modalName}>{selected.volunteer?.name}</Text>
                    <View style={[styles.modalStatusPill, { backgroundColor: STATUS_COLOR[selected.status] + '20' }]}>
                      <Text style={[styles.modalStatusText, { color: STATUS_COLOR[selected.status] }]}>
                        {STATUS_LABEL[selected.status]}
                      </Text>
                    </View>
                    <Text style={styles.modalOppName}>📌 {selected.opportunity?.title}</Text>
                  </View>

                  {/* Contact */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Contact</Text>
                    {selected.email || selected.volunteer?.email ? (
                      <View style={styles.modalInfoRow}>
                        <Ionicons name="mail-outline" size={15} color="#888" />
                        <Text style={styles.modalInfoText}>{selected.email || selected.volunteer?.email}</Text>
                      </View>
                    ) : null}
                    {selected.phone || selected.volunteer?.phone ? (
                      <View style={styles.modalInfoRow}>
                        <Ionicons name="call-outline" size={15} color="#888" />
                        <Text style={styles.modalInfoText}>{selected.phone || selected.volunteer?.phone}</Text>
                      </View>
                    ) : null}
                    {selected.expectedHours ? (
                      <View style={styles.modalInfoRow}>
                        <Ionicons name="time-outline" size={15} color="#888" />
                        <Text style={styles.modalInfoText}>{selected.expectedHours} hrs/week expected</Text>
                      </View>
                    ) : null}
                    <View style={styles.modalInfoRow}>
                      <Ionicons name="calendar-outline" size={15} color="#888" />
                      <Text style={styles.modalInfoText}>Applied {new Date(selected.appliedAt).toDateString()}</Text>
                    </View>
                  </View>

                  {/* Application */}
                  {(selected.coverLetter || selected.motivation || selected.hopingToGain) && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionTitle}>Application</Text>
                      {selected.coverLetter ? (
                        <>
                          <Text style={styles.modalFieldLabel}>Cover Letter</Text>
                          <Text style={styles.modalFieldValue}>{selected.coverLetter}</Text>
                        </>
                      ) : null}
                      {selected.motivation ? (
                        <>
                          <Text style={styles.modalFieldLabel}>Motivation</Text>
                          <Text style={styles.modalFieldValue}>{selected.motivation}</Text>
                        </>
                      ) : null}
                      {selected.hopingToGain ? (
                        <>
                          <Text style={styles.modalFieldLabel}>Hoping to Gain</Text>
                          <Text style={styles.modalFieldValue}>{selected.hopingToGain}</Text>
                        </>
                      ) : null}
                    </View>
                  )}

                  {/* Actions */}
                  {(selected.status === 'pending' || selected.status === 'approved') && (
                    <View style={[styles.modalSection, { paddingBottom: 8 }]}>
                      <Text style={styles.modalSectionTitle}>Actions</Text>
                      <ActionButtons app={selected} modal />
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statsRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2 },

  filterScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', maxHeight: 50 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f0f4f8', borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: '#2e86de', borderColor: '#2e86de' },
  chipText: { fontSize: 12, color: '#555', fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, padding: 12, elevation: 2, borderLeftWidth: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  applicantName: { fontSize: 15, fontWeight: 'bold', color: '#2e86de' },
  applicantEmail: { fontSize: 12, color: '#888', marginTop: 1 },
  oppTitle: { fontSize: 12, color: '#555', marginTop: 2 },
  statusPill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 11, fontWeight: 'bold' },

  btnRow: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  acceptBtn: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  rejectOutlineBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1.5, borderColor: '#e74c3c' },
  rejectOutlineBtnText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 13 },
  finishBtn: { flex: 1, backgroundColor: '#2e86de', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  finishBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  hoursBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1.5, borderColor: '#9b59b6' },
  hoursBtnText: { color: '#9b59b6', fontWeight: 'bold', fontSize: 13 },
  removeIconBtn: { width: 38, height: 38, borderRadius: 8, borderWidth: 1.5, borderColor: '#e74c3c', justifyContent: 'center', alignItems: 'center' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: '#999', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', paddingBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalHeaderTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  modalProfile: { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  modalAvatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  modalAvatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  modalName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  modalStatusPill: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 6 },
  modalStatusText: { fontWeight: 'bold', fontSize: 13 },
  modalOppName: { fontSize: 13, color: '#555', textAlign: 'center' },
  modalSection: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#f8f9fa', borderRadius: 12, padding: 14 },
  modalSectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  modalInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  modalInfoText: { fontSize: 14, color: '#444', flex: 1 },
  modalFieldLabel: { fontSize: 11, color: '#888', fontWeight: '600', textTransform: 'uppercase', marginBottom: 3, marginTop: 6 },
  modalFieldValue: { fontSize: 13, color: '#444', lineHeight: 19 }
});

export default AllCreatorApplicationsScreen;
