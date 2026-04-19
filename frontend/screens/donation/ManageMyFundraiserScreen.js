import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  ScrollView, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const statusColor = (s) => {
  if (s === 'confirmed') return '#27ae60';
  if (s === 'rejected') return '#e74c3c';
  return '#f39c12';
};

const TABS = ['All', 'Pending', 'Confirmed', 'Rejected'];

const ManageMyFundraiserScreen = ({ route, navigation }) => {
  const { fundraiserId } = route.params;
  const toast = useToast();
  const confirm = useConfirm();

  const [fundraiser, setFundraiser] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  // Detail modal
  const [detailDonation, setDetailDonation] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);

  // Edit form
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [frRes, donRes] = await Promise.all([
        api.get(`/api/fundraisers/${fundraiserId}`),
        api.get(`/api/donations/fundraiser/${fundraiserId}`)
      ]);
      setFundraiser(frRes.data);
      setDonations(donRes.data?.donations || donRes.data || []);
    } catch {
      toast.error('Error', 'Failed to load fundraiser data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fundraiserId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  const filteredDonations = donations.filter(d => {
    if (activeTab === 'All') return true;
    return d.status === activeTab.toLowerCase();
  });

  const handleStatusUpdate = async (donationId, newStatus) => {
    setStatusUpdating(donationId + newStatus);
    try {
      await api.put(`/api/donations/${donationId}/status`, { status: newStatus });
      toast.success('Updated', `Donation ${newStatus}`);
      setDetailDonation(null);
      fetchAll();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdating(null);
    }
  };

  const openEdit = () => {
    setEditName(fundraiser.name);
    setEditDescription(fundraiser.description || '');
    setEditTarget(String(fundraiser.targetAmount));
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast.warning('Required', 'Fundraiser name is required');
      return;
    }
    if (!editTarget || isNaN(editTarget) || Number(editTarget) < 1) {
      toast.warning('Required', 'Please enter a valid target amount');
      return;
    }
    setEditSubmitting(true);
    try {
      await api.put(`/api/fundraisers/${fundraiserId}`, {
        name: editName.trim(),
        description: editDescription.trim(),
        targetAmount: Number(editTarget)
      });
      toast.success('Updated', 'Fundraiser details saved');
      setEditVisible(false);
      fetchAll();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to update fundraiser');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleComplete = () => {
    confirm.show({
      title: 'Complete Fundraiser',
      message: 'Mark this fundraiser as completed? No more donations will be accepted.',
      confirmText: 'Complete',
      destructive: false,
      onConfirm: async () => {
        try {
          await api.put(`/api/fundraisers/${fundraiserId}/complete`);
          toast.success('Completed', 'Fundraiser marked as completed');
          fetchAll();
        } catch (error) {
          toast.error('Error', error.response?.data?.message || 'Failed to complete');
        }
      }
    });
  };

  const handleDelete = () => {
    confirm.show({
      title: 'Delete Fundraiser',
      message: 'This will permanently delete the fundraiser and all related donations. This cannot be undone.',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/fundraisers/${fundraiserId}`);
          toast.success('Deleted', 'Fundraiser deleted successfully');
          navigation.goBack();
        } catch (error) {
          toast.error('Error', error.response?.data?.message || 'Failed to delete');
        }
      }
    });
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;
  if (!fundraiser) return (
    <View style={styles.centered}>
      <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
      <Text style={styles.errorText}>Fundraiser not found</Text>
    </View>
  );

  const pct = fundraiser.targetAmount > 0
    ? Math.min(100, Math.round(((fundraiser.collectedAmount || 0) / fundraiser.targetAmount) * 100))
    : 0;

  const sColor = fundraiser.status === 'active' ? '#27ae60'
    : fundraiser.status === 'completed' ? '#888' : '#e74c3c';

  const renderDonation = ({ item }) => {
    const isUpdating = statusUpdating?.startsWith(item._id);
    return (
      <TouchableOpacity
        style={styles.donationRow}
        onPress={() => setDetailDonation(item)}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        <View style={[styles.donorAvatar, { backgroundColor: '#e8f4fd' }]}>
          <Text style={styles.donorAvatarText}>
            {(item.donorName || 'A').charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.donorName}>{item.donorName || 'Anonymous'}</Text>
          <Text style={styles.donorAmount}>LKR {Number(item.amount).toLocaleString()}</Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusColor(item.status) + '22', borderColor: statusColor(item.status) }]}>
          <Text style={[styles.statusPillText, { color: statusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>

        {item.status === 'pending' && (
          <View style={styles.inlineActions}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={() => handleStatusUpdate(item._id, 'confirmed')}
              disabled={!!isUpdating}
            >
              {isUpdating && statusUpdating === item._id + 'confirmed'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="checkmark" size={16} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => handleStatusUpdate(item._id, 'rejected')}
              disabled={!!isUpdating}
            >
              {isUpdating && statusUpdating === item._id + 'rejected'
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="close" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const listHeader = () => (
    <>
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.headerCardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerFundraiserName}>{fundraiser.name}</Text>
            {fundraiser.opportunity?.title ? (
              <View style={styles.oppRow}>
                <Ionicons name="heart-outline" size={13} color="rgba(255,255,255,0.7)" style={{ marginRight: 4 }} />
                <Text style={styles.headerOppTitle}>{fundraiser.opportunity.title}</Text>
              </View>
            ) : fundraiser.description ? (
              <Text style={styles.headerDescription}>{fundraiser.description}</Text>
            ) : null}
          </View>
          <View style={[styles.headerStatusBadge, { backgroundColor: sColor }]}>
            <Text style={styles.headerStatusText}>{fundraiser.status.charAt(0).toUpperCase() + fundraiser.status.slice(1)}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.headerProgressBg}>
          <View style={[styles.headerProgressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.headerProgressText}>{pct}% funded</Text>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>LKR {(fundraiser.collectedAmount || 0).toLocaleString()}</Text>
          <Text style={styles.statLabel}>Collected</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxMiddle]}>
          <Text style={[styles.statValue, { color: '#2e86de' }]}>{fundraiser.donorCount || 0}</Text>
          <Text style={styles.statLabel}>Donors</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#9b59b6' }]}>LKR {fundraiser.targetAmount.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Target</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const count = tab === 'All' ? donations.length
            : donations.filter(d => d.status === tab.toLowerCase()).length;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              {count > 0 && (
                <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.donationsSectionTitle}>
        {activeTab} Donations ({filteredDonations.length})
      </Text>
    </>
  );

  const listFooter = () => (
    <View style={styles.footerButtons}>
      {fundraiser.status === 'active' && (
        <>
          <TouchableOpacity style={styles.editFooterBtn} onPress={openEdit}>
            <Ionicons name="create-outline" size={18} color="#2e86de" style={{ marginRight: 6 }} />
            <Text style={styles.editFooterBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.completeFooterBtn} onPress={handleComplete}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.footerBtnTextWhite}>Complete</Text>
          </TouchableOpacity>
        </>
      )}
      {fundraiser.status !== 'completed' && (
        <TouchableOpacity style={styles.deleteFooterBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.footerBtnTextWhite}>Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredDonations}
        keyExtractor={(item) => item._id}
        renderItem={renderDonation}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <View style={styles.emptyDonations}>
            <Ionicons name="cash-outline" size={40} color="#ddd" />
            <Text style={styles.emptyDonationsText}>No {activeTab !== 'All' ? activeTab.toLowerCase() + ' ' : ''}donations yet</Text>
          </View>
        }
      />

      {/* Donation Detail Modal */}
      <Modal
        visible={!!detailDonation}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailDonation(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDetailDonation(null)}>
          <View style={styles.detailModal} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.detailModalTitle}>Donation Details</Text>

            {detailDonation && (
              <ScrollView>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Donor Name</Text>
                  <Text style={styles.detailValue}>{detailDonation.donorName || 'Anonymous'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={[styles.detailValue, { color: '#27ae60', fontWeight: 'bold', fontSize: 18 }]}>
                    LKR {Number(detailDonation.amount).toLocaleString()}
                  </Text>
                </View>
                {detailDonation.donorPhone && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{detailDonation.donorPhone}</Text>
                  </View>
                )}
                {detailDonation.message && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Message</Text>
                    <Text style={styles.detailValue}>"{detailDonation.message}"</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{new Date(detailDonation.createdAt).toDateString()}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusPill, {
                    backgroundColor: statusColor(detailDonation.status) + '22',
                    borderColor: statusColor(detailDonation.status)
                  }]}>
                    <Text style={[styles.statusPillText, { color: statusColor(detailDonation.status) }]}>
                      {detailDonation.status.charAt(0).toUpperCase() + detailDonation.status.slice(1)}
                    </Text>
                  </View>
                </View>
                {detailDonation.receiptImage && (
                  <View style={{ marginVertical: 10 }}>
                    <Text style={styles.detailLabel}>Receipt</Text>
                    <Image
                      source={{ uri: `${BASE_URL}/${detailDonation.receiptImage}` }}
                      style={styles.receiptImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                {detailDonation.status === 'pending' && (
                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={styles.detailAcceptBtn}
                      onPress={() => handleStatusUpdate(detailDonation._id, 'confirmed')}
                      disabled={!!statusUpdating}
                    >
                      {statusUpdating === detailDonation._id + 'confirmed'
                        ? <ActivityIndicator color="#fff" />
                        : (
                          <>
                            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.detailActionBtnText}>Accept</Text>
                          </>
                        )
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.detailRejectBtn}
                      onPress={() => handleStatusUpdate(detailDonation._id, 'rejected')}
                      disabled={!!statusUpdating}
                    >
                      {statusUpdating === detailDonation._id + 'rejected'
                        ? <ActivityIndicator color="#fff" />
                        : (
                          <>
                            <Ionicons name="close-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.detailActionBtnText}>Reject</Text>
                          </>
                        )
                      }
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setDetailDonation(null)}>
                  <Text style={styles.closeModalBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditVisible(false)}>
          <View style={styles.editModal} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.editModalTitle}>Edit Fundraiser</Text>

            <Text style={styles.editLabel}>Name *</Text>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Fundraiser name"
              placeholderTextColor="#bbb"
            />

            <Text style={styles.editLabel}>Description</Text>
            <TextInput
              style={styles.editTextArea}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="What is this fundraiser for?"
              placeholderTextColor="#bbb"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.editLabel}>Target Amount (LKR) *</Text>
            <TextInput
              style={styles.editInput}
              value={editTarget}
              onChangeText={setEditTarget}
              placeholder="10000"
              placeholderTextColor="#bbb"
              keyboardType="numeric"
            />

            <View style={styles.editButtons}>
              <TouchableOpacity
                style={styles.editSaveBtn}
                onPress={handleSaveEdit}
                disabled={editSubmitting}
              >
                {editSubmitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.editSaveBtnText}>Save Changes</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editCancelBtn}
                onPress={() => setEditVisible(false)}
                disabled={editSubmitting}
              >
                <Text style={styles.editCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#e74c3c', marginTop: 10 },

  // Header card
  headerCard: {
    backgroundColor: '#2e86de',
    padding: 20,
    paddingBottom: 24
  },
  headerCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  headerFundraiserName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  oppRow: { flexDirection: 'row', alignItems: 'center' },
  headerOppTitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerDescription: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  headerStatusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 8 },
  headerStatusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  headerProgressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  headerProgressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  headerProgressText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', textAlign: 'right' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -16,
    borderRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    marginBottom: 14
  },
  statBox: { flex: 1, padding: 14, alignItems: 'center' },
  statBoxMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f0f0f0' },
  statValue: { fontSize: 15, fontWeight: 'bold', color: '#27ae60', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#888' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
    overflow: 'hidden'
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4 },
  tabActive: { backgroundColor: '#e8f4fd', borderBottomWidth: 2, borderBottomColor: '#2e86de' },
  tabText: { fontSize: 12, color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#2e86de' },
  tabBadge: { backgroundColor: '#eee', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeActive: { backgroundColor: '#2e86de' },
  tabBadgeText: { fontSize: 10, color: '#888', fontWeight: 'bold' },
  tabBadgeTextActive: { color: '#fff' },

  donationsSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginHorizontal: 15,
    marginBottom: 8
  },

  // Donation row
  donationRow: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 8,
    borderRadius: 10,
    padding: 12,
    elevation: 2
  },
  donorAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  donorAvatarText: { fontSize: 16, fontWeight: 'bold', color: '#2e86de' },
  donorName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  donorAmount: { fontSize: 13, color: '#27ae60', fontWeight: 'bold' },
  statusPill: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    marginLeft: 8
  },
  statusPillText: { fontSize: 11, fontWeight: 'bold' },
  inlineActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  acceptBtn: { backgroundColor: '#27ae60', borderRadius: 8, padding: 6 },
  rejectBtn: { backgroundColor: '#e74c3c', borderRadius: 8, padding: 6 },

  emptyDonations: { alignItems: 'center', paddingVertical: 30 },
  emptyDonationsText: { color: '#bbb', fontSize: 14, marginTop: 8 },

  // Footer action buttons
  footerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 10
  },
  editFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8f4fd',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2e86de'
  },
  editFooterBtnText: { color: '#2e86de', fontWeight: 'bold', fontSize: 14 },
  completeFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27ae60',
    borderRadius: 10,
    padding: 12
  },
  deleteFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    width: '100%'
  },
  footerBtnTextWhite: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  // Detail modal
  detailModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '85%'
  },
  detailModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  detailLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  detailValue: { fontSize: 14, color: '#333', flex: 1, textAlign: 'right', marginLeft: 10 },
  receiptImage: { width: '100%', height: 200, borderRadius: 10, marginTop: 8 },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  detailAcceptBtn: {
    flex: 1,
    backgroundColor: '#27ae60',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  detailRejectBtn: {
    flex: 1,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  detailActionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  closeModalBtn: { marginTop: 14, padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  closeModalBtnText: { color: '#888', fontSize: 15 },

  // Edit modal
  editModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40
  },
  editModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  editLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 12 },
  editInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    fontSize: 15,
    color: '#333',
    marginBottom: 4
  },
  editTextArea: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    fontSize: 15,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 4
  },
  editButtons: { flexDirection: 'row', gap: 10, marginTop: 20 },
  editSaveBtn: { flex: 1, backgroundColor: '#2e86de', borderRadius: 10, padding: 14, alignItems: 'center' },
  editSaveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  editCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 14, alignItems: 'center' },
  editCancelBtnText: { color: '#555', fontWeight: 'bold', fontSize: 15 }
});

export default ManageMyFundraiserScreen;
