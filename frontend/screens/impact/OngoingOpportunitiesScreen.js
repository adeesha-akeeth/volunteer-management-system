import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
  RefreshControl, Image, Modal, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const OngoingOpportunitiesScreen = ({ navigation }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add contribution modal
  const [contribModal, setContribModal] = useState(null);
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit contribution modal
  const [editModal, setEditModal] = useState(null); // { contribution, opportunityId }
  const [editHours, setEditHours] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/contributions/my-opportunities');
      setData(res.data);
    } catch {
      toast.error('Error', 'Failed to load opportunities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openContribModal = (opportunity) => {
    setContribModal(opportunity);
    setHours('');
    setDescription('');
  };

  const handleSubmitContribution = async () => {
    if (!hours || isNaN(hours) || Number(hours) < 0.5) {
      toast.warning('Invalid', 'Please enter at least 0.5 hours');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/contributions', {
        opportunityId: contribModal._id,
        hours: Number(hours),
        description
      });
      toast.success('Submitted!', 'Your contribution has been sent for verification.');
      setContribModal(null);
      fetchData();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (contribution) => {
    setEditModal(contribution);
    setEditHours(String(contribution.hours));
    setEditDescription(contribution.description || '');
  };

  const handleEditContribution = async () => {
    if (!editHours || isNaN(editHours) || Number(editHours) < 0.5) {
      toast.warning('Invalid', 'Please enter at least 0.5 hours');
      return;
    }
    setEditSubmitting(true);
    try {
      await api.put(`/api/contributions/my/${editModal._id}`, {
        hours: Number(editHours),
        description: editDescription
      });
      toast.success('Updated', 'Contribution updated successfully.');
      setEditModal(null);
      fetchData();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to update');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteContribution = (contribution) => {
    confirm.show({
      title: 'Delete Contribution',
      message: `Delete this ${contribution.hours}hr pending submission?`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/contributions/my/${contribution._id}`);
          toast.success('Deleted', 'Contribution removed.');
          fetchData();
        } catch (error) {
          toast.error('Error', error.response?.data?.message || 'Failed to delete');
        }
      }
    });
  };

  const statusColor = (s) => ({ verified: '#27ae60', rejected: '#e74c3c' }[s] || '#f39c12');
  const statusLabel = (s) => ({ verified: 'Verified', rejected: 'Rejected', pending: 'Pending' }[s] || s);

  const renderItem = ({ item }) => {
    const opp = item.opportunity;
    const contribs = item.contributions || [];
    const verifiedHours = contribs.filter(c => c.status === 'verified').reduce((s, c) => s + c.hours, 0);
    const pendingContribs = contribs.filter(c => c.status === 'pending');

    return (
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Home', { screen: 'OpportunityDetail', params: { opportunityId: opp._id } })}
        >
          {opp.bannerImage ? (
            <Image source={{ uri: `${BASE_URL}/${opp.bannerImage}` }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={styles.cardImagePlaceholder}><Ionicons name="globe-outline" size={28} color="#aaa" /></View>
          )}
        </TouchableOpacity>

        <View style={styles.cardBody}>
          <View style={styles.categoryBadge}><Text style={styles.categoryText}>{opp.category}</Text></View>
          <TouchableOpacity onPress={() => navigation.navigate('Home', { screen: 'OpportunityDetail', params: { opportunityId: opp._id } })} activeOpacity={0.7}>
          <Text style={styles.cardTitle}>{opp.title}</Text>
          </TouchableOpacity>
          {opp.organization ? (
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={13} color="#888" style={{ marginRight: 4 }} />
              <Text style={styles.cardDetail}>{opp.organization}</Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={13} color="#888" style={{ marginRight: 4 }} />
            <Text style={styles.cardDetail}>{opp.location}</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{verifiedHours}</Text>
              <Text style={styles.statLabel}>hrs verified</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#f39c12' }]}>{pendingContribs.length}</Text>
              <Text style={styles.statLabel}>pending</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#9b59b6' }]}>{verifiedHours * 10}</Text>
              <Text style={styles.statLabel}>pts earned</Text>
            </View>
          </View>

          {/* All contributions */}
          {contribs.length > 0 && (
            <View style={styles.contribsSection}>
              <Text style={styles.contribsSectionTitle}>Submissions</Text>
              {contribs.map(c => (
                <View key={c._id} style={styles.contribRow}>
                  <View style={styles.contribLeft}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor(c.status) }]} />
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="time-outline" size={13} color="#555" style={{ marginRight: 4 }} />
                        <Text style={styles.contribHours}>{c.hours} hr{c.hours !== 1 ? 's' : ''}</Text>
                      </View>
                      {c.description ? <Text style={styles.contribDesc} numberOfLines={1}>{c.description}</Text> : null}
                    </View>
                  </View>
                  <View style={styles.contribRight}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor(c.status) + '22', borderColor: statusColor(c.status) }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor(c.status) }]}>{statusLabel(c.status)}</Text>
                    </View>
                    {c.status === 'pending' && (
                      <View style={styles.contribActions}>
                        <TouchableOpacity style={styles.editContribBtn} onPress={() => openEditModal(c)}>
                          <Text style={styles.editContribBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteContribBtn} onPress={() => handleDeleteContribution(c)}>
                          <Text style={styles.deleteContribBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.logBtn} onPress={() => openContribModal(opp)}>
            <View style={styles.logBtnIconCircle}>
              <Text style={styles.logBtnIcon}>+</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.logBtnTitle}>Log Contribution Hours</Text>
              <Text style={styles.logBtnSub}>Submit hours for verification & earn 10pts/hr</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#9b59b6" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.application._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <Text style={styles.heading}>Active Volunteering ({data.length})</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={48} color="#27ae60" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No active volunteering</Text>
            <Text style={styles.emptySubText}>Apply to opportunities and get accepted to log hours here.</Text>
          </View>
        }
      />

      {/* Add Contribution Modal */}
      <Modal visible={!!contribModal} transparent animationType="slide" onRequestClose={() => setContribModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setContribModal(null)}>
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Log Contribution</Text>
            <Text style={styles.modalSubtitle} numberOfLines={1}>{contribModal?.title}</Text>

            <Text style={styles.label}>Hours Contributed *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2.5"
              placeholderTextColor="#aaa"
              value={hours}
              onChangeText={setHours}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="What did you do? e.g. Helped organise the event..."
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.pointsPreview}>
              <Text style={styles.pointsPreviewText}>
                🏆 This will earn you <Text style={styles.pointsPreviewNum}>{Math.floor(Number(hours || 0) * 10)} pts</Text> once verified
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitContribution} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit for Verification</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setContribModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Contribution Modal */}
      <Modal visible={!!editModal} transparent animationType="slide" onRequestClose={() => setEditModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditModal(null)}>
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Contribution</Text>
            <Text style={styles.modalSubtitle}>Pending — awaiting verification</Text>

            <Text style={styles.label}>Hours *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2.5"
              placeholderTextColor="#aaa"
              value={editHours}
              onChangeText={setEditHours}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="What did you do?"
              placeholderTextColor="#aaa"
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.pointsPreview}>
              <Text style={styles.pointsPreviewText}>
                🏆 Will earn <Text style={styles.pointsPreviewNum}>{Math.floor(Number(editHours || 0) * 10)} pts</Text> once verified
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleEditContribution} disabled={editSubmitting}>
                {editSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Save Changes</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
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
  heading: { fontSize: 20, fontWeight: 'bold', color: '#333', padding: 15, paddingBottom: 8 },

  card: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 15, marginBottom: 14, elevation: 3, overflow: 'hidden' },
  cardImage: { width: '100%', height: 120 },
  cardImagePlaceholder: { width: '100%', height: 80, backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 28 },
  cardBody: { padding: 14 },
  categoryBadge: { backgroundColor: '#e8f4fd', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  categoryText: { color: '#2e86de', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardDetail: { fontSize: 13, color: '#555', flex: 1 },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: '#f8f4ff', borderRadius: 10, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#27ae60' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2 },

  contribsSection: { marginBottom: 14 },
  contribsSectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  contribRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  contribLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  contribHours: { fontSize: 14, fontWeight: '600', color: '#333' },
  contribDesc: { fontSize: 11, color: '#999', marginTop: 1, maxWidth: 160 },
  contribRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  statusBadgeText: { fontSize: 11, fontWeight: 'bold' },
  contribActions: { flexDirection: 'row', gap: 6 },
  editContribBtn: { backgroundColor: '#e8f4fd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  editContribBtnText: { color: '#2e86de', fontWeight: 'bold', fontSize: 12 },
  deleteContribBtn: { backgroundColor: '#fdecea', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  deleteContribBtnText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 12 },

  logBtn: { backgroundColor: '#27ae60', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  logBtnIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  logBtnIcon: { color: '#fff', fontSize: 26, fontWeight: 'bold', lineHeight: 30 },
  logBtnTitle: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  logBtnSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },

  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyIcon: { marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#999', textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#888', marginBottom: 18 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333', marginBottom: 14 },
  textArea: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#ddd', color: '#333', minHeight: 80, textAlignVertical: 'top', marginBottom: 14 },
  pointsPreview: { backgroundColor: '#f8f4ff', borderRadius: 10, padding: 12, marginBottom: 16, alignItems: 'center' },
  pointsPreviewText: { fontSize: 13, color: '#555' },
  pointsPreviewNum: { fontWeight: 'bold', color: '#9b59b6', fontSize: 15 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  submitBtn: { flex: 1, backgroundColor: '#9b59b6', borderRadius: 10, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#555', fontWeight: 'bold', fontSize: 15 }
});

export default OngoingOpportunitiesScreen;
