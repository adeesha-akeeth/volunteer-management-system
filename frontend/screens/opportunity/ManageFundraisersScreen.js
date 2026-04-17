import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, Image, TextInput, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const ManageFundraisersScreen = ({ route }) => {
  const { opportunityId } = route.params;
  const toast = useToast();
  const confirm = useConfirm();
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFundraiser, setSelectedFundraiser] = useState(null);
  const [fundraiserDonations, setFundraiserDonations] = useState([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationFilter, setDonationFilter] = useState('all');

  const [showAddFundraiser, setShowAddFundraiser] = useState(false);
  const [newFrName, setNewFrName] = useState('');
  const [newFrTarget, setNewFrTarget] = useState('');
  const [addFrLoading, setAddFrLoading] = useState(false);

  const [donorsModal, setDonorsModal] = useState(null);
  const [donors, setDonors] = useState([]);
  const [donorsLoading, setDonorsLoading] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get(`/api/fundraisers/opportunity/${opportunityId}`);
      setFundraisers(res.data);
      if (res.data.length > 0 && !selectedFundraiser) {
        setSelectedFundraiser(res.data[0]);
        loadDonations(res.data[0]._id);
      }
    } catch {
      toast.error('Error', 'Failed to load fundraisers');
    } finally {
      setLoading(false);
    }
  };

  const loadDonations = async (fundraiserId) => {
    setDonationsLoading(true);
    try {
      const res = await api.get(`/api/donations/fundraiser/${fundraiserId}`);
      setFundraiserDonations(res.data.donations);
    } catch {
      setFundraiserDonations([]);
    } finally {
      setDonationsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openDonors = async (fr) => {
    setDonorsModal(fr);
    setDonorsLoading(true);
    try {
      const res = await api.get(`/api/fundraisers/${fr._id}/donors`);
      setDonors(res.data.donors);
    } catch { setDonors([]); }
    finally { setDonorsLoading(false); }
  };

  const handleAddFundraiser = async () => {
    if (!newFrName) { toast.warning('Missing', 'Enter a fundraiser name'); return; }
    if (!newFrTarget || isNaN(newFrTarget) || Number(newFrTarget) < 1) { toast.warning('Invalid', 'Enter a valid target amount'); return; }
    setAddFrLoading(true);
    try {
      await api.post('/api/fundraisers', { opportunityId, name: newFrName, targetAmount: newFrTarget });
      setShowAddFundraiser(false);
      setNewFrName(''); setNewFrTarget('');
      fetchData();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed');
    } finally {
      setAddFrLoading(false);
    }
  };

  const handleCompleteFundraiser = (fr) => {
    confirm.show({
      title: 'Complete Fundraiser',
      message: `Mark "${fr.name}" as completed?`,
      confirmText: 'Complete',
      destructive: false,
      onConfirm: async () => {
        try {
          await api.put(`/api/fundraisers/${fr._id}/complete`);
          fetchData();
        } catch { toast.error('Error', 'Failed to complete fundraiser'); }
      }
    });
  };

  const handleStopFundraiser = (fr) => {
    confirm.show({
      title: 'Stop Fundraiser',
      message: `Stop "${fr.name}"? No more donations will be accepted.`,
      confirmText: 'Stop',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.put(`/api/fundraisers/${fr._id}/stop`);
          fetchData();
        } catch { toast.error('Error', 'Failed to stop fundraiser'); }
      }
    });
  };

  const handleUpdateDonationStatus = (donationId, status) => {
    confirm.show({
      title: status === 'confirmed' ? 'Accept Donation' : 'Reject Donation',
      message: `Are you sure you want to ${status === 'confirmed' ? 'accept' : 'reject'} this donation?`,
      confirmText: status === 'confirmed' ? 'Accept' : 'Reject',
      destructive: status === 'rejected',
      onConfirm: async () => {
        try {
          await api.put(`/api/donations/${donationId}/status`, { status });
          if (selectedFundraiser) loadDonations(selectedFundraiser._id);
          fetchData();
        } catch { toast.error('Error', 'Failed to update donation'); }
      }
    });
  };

  const filteredDonations = donationFilter === 'all' ? fundraiserDonations : fundraiserDonations.filter(d => d.status === donationFilter);
  const donStatusColor = (s) => ({ confirmed: '#27ae60', rejected: '#e74c3c' }[s] || '#f39c12');

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Add fundraiser */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddFundraiser(!showAddFundraiser)}>
          <Ionicons name={showAddFundraiser ? 'close' : 'add'} size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.addBtnText}>{showAddFundraiser ? 'Cancel' : 'Add New Fundraiser'}</Text>
        </TouchableOpacity>

        {showAddFundraiser && (
          <View style={styles.addForm}>
            <Text style={styles.formLabel}>Fundraiser Name *</Text>
            <TextInput style={styles.input} placeholderTextColor="#999" placeholder="e.g. Equipment Fund" value={newFrName} onChangeText={setNewFrName} />
            <Text style={styles.formLabel}>Target Amount (LKR) *</Text>
            <TextInput style={styles.input} placeholderTextColor="#999" placeholder="e.g. 50000" value={newFrTarget} onChangeText={setNewFrTarget} keyboardType="numeric" />
            <TouchableOpacity style={styles.saveBtn} onPress={handleAddFundraiser} disabled={addFrLoading}>
              {addFrLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Fundraiser</Text>}
            </TouchableOpacity>
          </View>
        )}

        {fundraisers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={40} color="#ddd" />
            <Text style={styles.emptyText}>No fundraisers yet</Text>
            <Text style={styles.emptySubtext}>Add a fundraiser to start collecting donations</Text>
          </View>
        ) : fundraisers.map(fr => {
          const pct = fr.targetAmount > 0 ? Math.min(100, Math.round((fr.collectedAmount / fr.targetAmount) * 100)) : 0;
          const isSelected = selectedFundraiser?._id === fr._id;
          const isActive = fr.status === 'active';

          return (
            <View key={fr._id}>
              <TouchableOpacity
                style={[styles.fundraiserCard, isSelected && styles.fundraiserCardSelected]}
                onPress={() => { setSelectedFundraiser(fr); loadDonations(fr._id); }}
              >
                <View style={styles.frCardHeader}>
                  <Text style={styles.frCardName}>{fr.name}</Text>
                  <View style={[styles.frStatusBadge, { backgroundColor: isActive ? '#27ae60' : '#888' }]}>
                    <Text style={styles.frStatusText}>{fr.status}</Text>
                  </View>
                </View>
                <View style={styles.amountRow}>
                  <Text style={styles.collectedAmt}>LKR {fr.collectedAmount.toLocaleString()}</Text>
                  <Text style={styles.targetAmt}> / LKR {fr.targetAmount.toLocaleString()}</Text>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: isActive ? '#27ae60' : '#888' }]} />
                </View>
                <Text style={styles.pctText}>{pct}% · {fr.donorCount || 0} donor{(fr.donorCount || 0) !== 1 ? 's' : ''}</Text>

                <View style={styles.frButtons}>
                  <TouchableOpacity style={styles.viewDonorsBtn} onPress={() => openDonors(fr)}>
                    <Ionicons name="people-outline" size={14} color="#555" style={{ marginRight: 4 }} />
                    <Text style={styles.viewDonorsBtnText}>View Donors</Text>
                  </TouchableOpacity>
                  {isActive && (
                    <TouchableOpacity style={styles.completeBtn} onPress={() => handleCompleteFundraiser(fr)}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={styles.completeBtnText}>Complete</Text>
                    </TouchableOpacity>
                  )}
                  {isActive && (
                    <TouchableOpacity style={styles.stopBtn} onPress={() => handleStopFundraiser(fr)}>
                      <Ionicons name="stop-circle-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={styles.stopBtnText}>Stop</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>

              {/* Donations for selected fundraiser */}
              {isSelected && (
                <View style={styles.donationsSection}>
                  <Text style={styles.donationsSectionTitle}>Donations</Text>
                  <View style={styles.filterContainer}>
                    {['all', 'pending', 'confirmed', 'rejected'].map(f => (
                      <TouchableOpacity key={f} style={[styles.filterTab, donationFilter === f && styles.filterTabActive]} onPress={() => setDonationFilter(f)}>
                        <Text style={[styles.filterTabText, donationFilter === f && styles.filterTabTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {donationsLoading ? <ActivityIndicator color="#27ae60" style={{ margin: 20 }} /> : filteredDonations.length === 0 ? (
                    <Text style={styles.noDonationsText}>No donations found</Text>
                  ) : filteredDonations.map(don => (
                    <View key={don._id} style={styles.donationCard}>
                      <View style={styles.donCardHeader}>
                        <View style={styles.donAvatar}>
                          <Text style={styles.donAvatarText}>{(don.donor?.name || don.donorName || '?').charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.donName}>{don.donor?.name || don.donorName || 'Anonymous'}</Text>
                          {don.donor?.email ? <Text style={styles.donEmail}>{don.donor.email}</Text> : null}
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: donStatusColor(don.status) }]}>
                          <Text style={styles.statusPillText}>{don.status}</Text>
                        </View>
                      </View>
                      <Text style={styles.donAmount}>LKR {Number(don.amount).toLocaleString()}</Text>
                      {don.donorPhone ? (
                        <View style={styles.donDetail}>
                          <Ionicons name="call-outline" size={13} color="#888" />
                          <Text style={styles.donDetailText}> {don.donorPhone}</Text>
                        </View>
                      ) : null}
                      {don.message ? (
                        <View style={styles.donDetail}>
                          <Ionicons name="chatbubble-outline" size={13} color="#888" />
                          <Text style={styles.donDetailText}> {don.message}</Text>
                        </View>
                      ) : null}
                      {don.receiptImage
                        ? <Image source={{ uri: `${BASE_URL}/${don.receiptImage}` }} style={styles.receiptImg} resizeMode="cover" />
                        : <Text style={styles.noReceipt}>No receipt uploaded</Text>
                      }
                      <Text style={styles.donDate}>{new Date(don.createdAt).toDateString()}</Text>
                      {don.status === 'pending' && (
                        <View style={styles.donActions}>
                          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleUpdateDonationStatus(don._id, 'confirmed')}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                            <Text style={styles.actionBtnText}> Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleUpdateDonationStatus(don._id, 'rejected')}>
                            <Ionicons name="close" size={14} color="#fff" />
                            <Text style={styles.actionBtnText}> Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Donors Modal */}
      <Modal visible={!!donorsModal} animationType="slide" onRequestClose={() => setDonorsModal(null)}>
        <View style={styles.donorsModal}>
          <View style={styles.donorsHeader}>
            <Text style={styles.donorsTitle}>{donorsModal?.name}</Text>
            <TouchableOpacity onPress={() => setDonorsModal(null)} style={{ padding: 5 }}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.donorsSubtitle}>Donors ranked by contribution</Text>
          {donorsLoading ? <ActivityIndicator size="large" color="#27ae60" style={{ marginTop: 40 }} /> : donors.length === 0 ? (
            <Text style={styles.noDonorsText}>No confirmed donors yet</Text>
          ) : (
            <FlatList
              data={donors}
              keyExtractor={(_, i) => i.toString()}
              contentContainerStyle={{ padding: 15 }}
              renderItem={({ item }) => (
                <View style={[styles.donorCard, item.rank <= 3 && styles.donorCardTop]}>
                  <Text style={styles.donorRank}>{item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.donorName}>{item.name}</Text>
                    {item.message ? <Text style={styles.donorMessage}>"{item.message}"</Text> : null}
                  </View>
                  <Text style={styles.donorAmount}>LKR {item.amount.toLocaleString()}</Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 12 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#27ae60', borderRadius: 10, padding: 13, marginBottom: 12 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  addForm: { backgroundColor: '#f0fff4', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#27ae60' },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  saveBtn: { backgroundColor: '#27ae60', borderRadius: 8, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  emptyContainer: { alignItems: 'center', padding: 40, gap: 8 },
  emptyText: { fontSize: 16, color: '#aaa', fontWeight: 'bold' },
  emptySubtext: { fontSize: 13, color: '#ccc', textAlign: 'center' },
  fundraiserCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#27ae60' },
  fundraiserCardSelected: { borderLeftColor: '#2e86de', backgroundColor: '#f0f8ff' },
  frCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  frCardName: { fontSize: 15, fontWeight: 'bold', color: '#333', flex: 1 },
  frStatusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  frStatusText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  collectedAmt: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  targetAmt: { fontSize: 13, color: '#888' },
  progressBg: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  pctText: { fontSize: 12, color: '#888', marginBottom: 10 },
  frButtons: { flexDirection: 'row', gap: 8 },
  viewDonorsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f8', borderRadius: 8, padding: 9, borderWidth: 1, borderColor: '#ddd' },
  viewDonorsBtnText: { color: '#555', fontWeight: 'bold', fontSize: 12 },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2e86de', borderRadius: 8, padding: 9 },
  completeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  stopBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e74c3c', borderRadius: 8, padding: 9 },
  stopBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  donationsSection: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 10, marginTop: -6 },
  donationsSectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  filterContainer: { flexDirection: 'row', marginBottom: 10, gap: 6, flexWrap: 'wrap' },
  filterTab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: '#2e86de' },
  filterTabActive: { backgroundColor: '#2e86de' },
  filterTabText: { color: '#2e86de', fontSize: 11, fontWeight: 'bold' },
  filterTabTextActive: { color: '#fff' },
  noDonationsText: { color: '#aaa', textAlign: 'center', padding: 20, fontSize: 13 },
  donationCard: { backgroundColor: '#fff', borderRadius: 10, padding: 13, marginBottom: 10, elevation: 2, borderLeftWidth: 3, borderLeftColor: '#27ae60' },
  donCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  donAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#27ae60', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  donAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  donName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  donEmail: { fontSize: 12, color: '#888' },
  statusPill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  donAmount: { fontSize: 18, fontWeight: 'bold', color: '#27ae60', marginBottom: 6 },
  donDetail: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  donDetailText: { fontSize: 13, color: '#555' },
  receiptImg: { width: '100%', height: 150, borderRadius: 8, marginVertical: 8 },
  noReceipt: { color: '#aaa', fontSize: 12, marginVertical: 4 },
  donDate: { fontSize: 11, color: '#aaa', marginTop: 2, marginBottom: 6 },
  donActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#27ae60', borderRadius: 8, padding: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e74c3c', borderRadius: 8, padding: 10 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  // Donors modal
  donorsModal: { flex: 1, backgroundColor: '#f0f4f8' },
  donorsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27ae60', padding: 20 },
  donorsTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1 },
  donorsSubtitle: { fontSize: 13, color: '#888', paddingHorizontal: 15, paddingTop: 10 },
  noDonorsText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 },
  donorCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 2, flexDirection: 'row', alignItems: 'center' },
  donorCardTop: { borderLeftWidth: 4, borderLeftColor: '#f39c12' },
  donorRank: { fontSize: 22 },
  donorName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  donorMessage: { fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 2 },
  donorAmount: { fontSize: 16, fontWeight: 'bold', color: '#27ae60' }
});

export default ManageFundraisersScreen;
