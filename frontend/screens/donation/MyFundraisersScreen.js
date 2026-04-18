import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, SectionList,
  Modal, ScrollView, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../../components/Toast';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const statusColor = (s) => {
  if (s === 'active') return '#27ae60';
  if (s === 'completed') return '#888';
  if (s === 'stopped') return '#e74c3c';
  return '#f39c12';
};

const statusLabel = (s) => {
  if (s === 'active') return 'Active';
  if (s === 'completed') return 'Completed';
  if (s === 'stopped') return 'Stopped';
  return s;
};

const MyFundraisersScreen = ({ navigation }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('fundraisers');
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pending donations
  const [pendingDonations, setPendingDonations] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Donation detail modal
  const [detailDonation, setDetailDonation] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);

  const fetchFundraisers = async () => {
    try {
      const res = await api.get('/api/fundraisers/my');
      setFundraisers(res.data);
    } catch {
      toast.error('Error', 'Failed to load your fundraisers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingDonations = async () => {
    setPendingLoading(true);
    try {
      const res = await api.get('/api/donations/my-fundraiser-pending');
      setPendingDonations(res.data);
    } catch {
      toast.error('Error', 'Failed to load pending donations');
    } finally {
      setPendingLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchFundraisers();
    fetchPendingDonations();
  }, []));

  const onRefresh = () => {
    setRefreshing(true);
    fetchFundraisers();
    fetchPendingDonations();
  };

  const handleStatusUpdate = async (donationId, newStatus) => {
    setStatusUpdating(donationId + newStatus);
    try {
      await api.put(`/api/donations/${donationId}/status`, { status: newStatus });
      toast.success('Updated', `Donation ${newStatus}`);
      setDetailDonation(null);
      fetchPendingDonations();
      fetchFundraisers();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdating(null);
    }
  };

  // Build sections for fundraisers tab
  const standalone = fundraisers.filter(f => !f.opportunity);
  const fromOpportunities = fundraisers.filter(f => !!f.opportunity);
  const sections = [
    { title: 'Standalone Fundraisers', data: standalone },
    { title: 'From Volunteering Opportunities', data: fromOpportunities }
  ];

  const renderFundraiserCard = ({ item }) => {
    const pct = item.targetAmount > 0
      ? Math.min(100, Math.round((item.collectedAmount / item.targetAmount) * 100))
      : 0;
    const sColor = statusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ManageMyFundraiser', { fundraiserId: item._id })}
        activeOpacity={0.85}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardIconCircle}>
            <Ionicons name="cash-outline" size={22} color="#27ae60" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            {item.opportunity?.title ? (
              <Text style={styles.cardOppTitle} numberOfLines={1}>{item.opportunity.title}</Text>
            ) : item.description ? (
              <Text style={styles.cardOppTitle} numberOfLines={1}>{item.description}</Text>
            ) : (
              <Text style={styles.cardOppTitle}>Standalone fundraiser</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sColor }]}>
            <Text style={styles.statusBadgeText}>{statusLabel(item.status)}</Text>
          </View>
        </View>

        <View style={styles.progressBg}>
          <View style={[styles.progressFill, {
            width: `${pct}%`,
            backgroundColor: item.status === 'completed' ? '#888' : '#27ae60'
          }]} />
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.collectedText}>LKR {(item.collectedAmount || 0).toLocaleString()}</Text>
          <Text style={styles.targetText}> / {item.targetAmount.toLocaleString()} ({pct}%)</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerStat}>
            <Ionicons name="people-outline" size={14} color="#888" style={{ marginRight: 4 }} />
            <Text style={styles.footerStatText}>{item.donorCount || 0} donor{item.donorCount !== 1 ? 's' : ''}</Text>
          </View>
          {item.pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={13} color="#f39c12" style={{ marginRight: 4 }} />
              <Text style={styles.pendingBadgeText}>{item.pendingCount} pending</Text>
            </View>
          )}
          <View style={styles.manageBtnRow}>
            <Text style={styles.manageBtnText}>Manage</Text>
            <Ionicons name="chevron-forward" size={15} color="#2e86de" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Ionicons
        name={section.title === 'Standalone Fundraisers' ? 'cash-outline' : 'heart-outline'}
        size={16}
        color="#555"
        style={{ marginRight: 6 }}
      />
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  const renderPendingItem = ({ item }) => (
    <View style={styles.pendingCard}>
      <View style={styles.pendingCardTop}>
        <View style={styles.pendingDonorCircle}>
          <Ionicons name="person-outline" size={20} color="#2e86de" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <TouchableOpacity onPress={() => setDetailDonation(item)}>
            <Text style={styles.pendingDonorName}>{item.donorName || item.donor?.name || 'Anonymous'}</Text>
          </TouchableOpacity>
          <Text style={styles.pendingFundraiserName} numberOfLines={1}>{item.fundraiser?.name}</Text>
        </View>
        <View style={styles.pendingAmountBadge}>
          <Text style={styles.pendingAmountText}>LKR {Number(item.amount).toLocaleString()}</Text>
        </View>
      </View>
      {item.message ? <Text style={styles.pendingMessage} numberOfLines={1}>"{item.message}"</Text> : null}
      <Text style={styles.pendingDate}>{new Date(item.createdAt).toDateString()}</Text>
      <View style={styles.pendingActions}>
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={() => handleStatusUpdate(item._id, 'confirmed')}
          disabled={!!statusUpdating}
        >
          {statusUpdating === item._id + 'confirmed'
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Ionicons name="checkmark" size={15} color="#fff" /><Text style={styles.acceptBtnText}>Accept</Text></>
          }
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => handleStatusUpdate(item._id, 'rejected')}
          disabled={!!statusUpdating}
        >
          {statusUpdating === item._id + 'rejected'
            ? <ActivityIndicator size="small" color="#e74c3c" />
            : <><Ionicons name="close" size={15} color="#e74c3c" /><Text style={styles.rejectBtnText}>Reject</Text></>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.detailsBtn} onPress={() => setDetailDonation(item)}>
          <Text style={styles.detailsBtnText}>Details</Text>
          <Ionicons name="chevron-forward" size={14} color="#2e86de" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#27ae60" /></View>;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>My Fundraisers</Text>
          <Text style={styles.topBarSub}>{fundraisers.length} total</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateFundraiser')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.createBtnText}>Create New</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'fundraisers' && styles.tabActive]}
          onPress={() => setActiveTab('fundraisers')}
        >
          <Ionicons name="cash-outline" size={15} color={activeTab === 'fundraisers' ? '#27ae60' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'fundraisers' && styles.tabTextActive]}>Fundraisers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Ionicons name="time-outline" size={15} color={activeTab === 'pending' ? '#f39c12' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextPending]}>
            Pending Requests {pendingDonations.length > 0 ? `(${pendingDonations.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'fundraisers' ? (
        fundraisers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cash-outline" size={64} color="#ddd" />
            <Text style={styles.emptyTitle}>No Fundraisers Yet</Text>
            <Text style={styles.emptySubtitle}>Create your first standalone fundraiser or add one to an opportunity you created.</Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => navigation.navigate('CreateFundraiser')}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCreateBtnText}>Create Fundraiser</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item._id}
            renderItem={renderFundraiserCard}
            renderSectionHeader={renderSectionHeader}
            renderSectionFooter={({ section }) => section.data.length === 0 ? (
              <View style={styles.sectionEmpty}>
                <Text style={styles.sectionEmptyText}>
                  {section.title === 'Standalone Fundraisers' ? 'No standalone fundraisers yet.' : 'No fundraisers linked to opportunities.'}
                </Text>
              </View>
            ) : null}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ padding: 15, paddingTop: 10 }}
            stickySectionHeadersEnabled={false}
          />
        )
      ) : (
        pendingLoading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#f39c12" /></View>
        ) : (
          <FlatList
            data={pendingDonations}
            keyExtractor={(item) => item._id}
            renderItem={renderPendingItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={{ padding: 15 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={64} color="#ddd" />
                <Text style={styles.emptyTitle}>No Pending Requests</Text>
                <Text style={styles.emptySubtitle}>All donation requests have been reviewed.</Text>
              </View>
            }
          />
        )
      )}

      {/* Donation Detail Modal */}
      <Modal visible={!!detailDonation} transparent animationType="fade" onRequestClose={() => setDetailDonation(null)}>
        <TouchableOpacity style={styles.detailOverlay} activeOpacity={1} onPress={() => setDetailDonation(null)}>
          <View style={styles.detailModal} onStartShouldSetResponder={() => true}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Donation Details</Text>
              <TouchableOpacity onPress={() => setDetailDonation(null)}>
                <Ionicons name="close" size={22} color="#888" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={16} color="#888" />
                <Text style={styles.detailLabel}>Donor</Text>
                <Text style={styles.detailValue}>{detailDonation?.donorName || detailDonation?.donor?.name || 'Anonymous'}</Text>
              </View>
              {detailDonation?.donor?.email ? (
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={16} color="#888" />
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{detailDonation.donor.email}</Text>
                </View>
              ) : null}
              {detailDonation?.donorPhone ? (
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={16} color="#888" />
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{detailDonation.donorPhone}</Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color="#888" />
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={[styles.detailValue, { fontWeight: 'bold', color: '#27ae60' }]}>
                  LKR {Number(detailDonation?.amount || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="heart-outline" size={16} color="#888" />
                <Text style={styles.detailLabel}>Fundraiser</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{detailDonation?.fundraiser?.name}</Text>
              </View>
              {detailDonation?.message ? (
                <View style={styles.detailMsgBox}>
                  <Text style={styles.detailMsgLabel}>Message</Text>
                  <Text style={styles.detailMsgText}>"{detailDonation.message}"</Text>
                </View>
              ) : null}
              {detailDonation?.receiptImage ? (
                <View style={styles.receiptSection}>
                  <Text style={styles.receiptLabel}>Bank Receipt</Text>
                  <Image
                    source={{ uri: `${BASE_URL}/${detailDonation.receiptImage}` }}
                    style={styles.receiptImage}
                    resizeMode="contain"
                  />
                </View>
              ) : null}
              <Text style={styles.detailDate}>Submitted on {detailDonation ? new Date(detailDonation.createdAt).toDateString() : ''}</Text>
            </ScrollView>
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.detailAcceptBtn}
                onPress={() => handleStatusUpdate(detailDonation._id, 'confirmed')}
                disabled={!!statusUpdating}
              >
                {statusUpdating === detailDonation?._id + 'confirmed'
                  ? <ActivityIndicator color="#fff" />
                  : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} /><Text style={styles.detailAcceptBtnText}>Confirm Donation</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailRejectBtn}
                onPress={() => handleStatusUpdate(detailDonation._id, 'rejected')}
                disabled={!!statusUpdating}
              >
                {statusUpdating === detailDonation?._id + 'rejected'
                  ? <ActivityIndicator color="#e74c3c" />
                  : <><Ionicons name="close-circle-outline" size={18} color="#e74c3c" style={{ marginRight: 6 }} /><Text style={styles.detailRejectBtnText}>Reject</Text></>
                }
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

  topBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  topBarTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  topBarSub: { fontSize: 12, color: '#999', marginTop: 2 },
  createBtn: {
    backgroundColor: '#27ae60',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2
  },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, gap: 5 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#27ae60' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#27ae60' },
  tabTextPending: { color: '#f39c12' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 10
  },
  sectionHeaderText: { fontSize: 14, fontWeight: 'bold', color: '#555', flex: 1 },
  sectionCount: {
    backgroundColor: '#e8f4fd', borderRadius: 12, paddingHorizontal: 8,
    paddingVertical: 2, fontSize: 12, color: '#2e86de', fontWeight: 'bold'
  },
  sectionEmpty: { paddingVertical: 12, alignItems: 'center' },
  sectionEmptyText: { color: '#bbb', fontSize: 13 },

  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 12, elevation: 3
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#d5f5e3', justifyContent: 'center', alignItems: 'center'
  },
  cardName: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  cardOppTitle: { fontSize: 12, color: '#888' },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  progressBg: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },

  statsRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  collectedText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  targetText: { fontSize: 12, color: '#888' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerStat: { flexDirection: 'row', alignItems: 'center' },
  footerStatText: { fontSize: 12, color: '#888' },
  pendingBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff8e1', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3
  },
  pendingBadgeText: { fontSize: 12, color: '#f39c12', fontWeight: '600' },
  manageBtnRow: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' },
  manageBtnText: { fontSize: 13, color: '#2e86de', fontWeight: 'bold', marginRight: 2 },

  // Pending donations
  pendingCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 12, elevation: 2, borderLeftWidth: 3, borderLeftColor: '#f39c12'
  },
  pendingCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  pendingDonorCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center'
  },
  pendingDonorName: { fontSize: 15, fontWeight: 'bold', color: '#2e86de' },
  pendingFundraiserName: { fontSize: 12, color: '#888', marginTop: 1 },
  pendingAmountBadge: { backgroundColor: '#d5f5e3', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  pendingAmountText: { fontSize: 13, fontWeight: 'bold', color: '#27ae60' },
  pendingMessage: { fontSize: 12, color: '#777', fontStyle: 'italic', marginBottom: 4 },
  pendingDate: { fontSize: 11, color: '#bbb', marginBottom: 10 },
  pendingActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#27ae60', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8
  },
  acceptBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  rejectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fde8e8', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#e74c3c'
  },
  rejectBtnText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 13 },
  detailsBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 2 },
  detailsBtnText: { color: '#2e86de', fontWeight: 'bold', fontSize: 13 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyCreateBtn: {
    backgroundColor: '#27ae60', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center'
  },
  emptyCreateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // Detail Modal
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  detailModal: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    width: '100%', maxHeight: '85%', elevation: 10
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  detailLabel: { fontSize: 13, color: '#888', width: 70 },
  detailValue: { flex: 1, fontSize: 14, color: '#333' },
  detailMsgBox: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginVertical: 10 },
  detailMsgLabel: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 4 },
  detailMsgText: { fontSize: 14, color: '#444', fontStyle: 'italic' },
  receiptSection: { marginTop: 10, marginBottom: 10 },
  receiptLabel: { fontSize: 12, fontWeight: 'bold', color: '#888', marginBottom: 8 },
  receiptImage: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#f0f0f0' },
  detailDate: { fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 10, marginBottom: 4 },
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  detailAcceptBtn: {
    flex: 1, backgroundColor: '#27ae60', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
  },
  detailAcceptBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  detailRejectBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#e74c3c', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
  },
  detailRejectBtnText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 14 }
});

export default MyFundraisersScreen;
