import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert,
  RefreshControl, Image, Modal, TextInput, ScrollView
} from 'react-native';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const OngoingOpportunitiesScreen = ({ navigation }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add contribution modal
  const [contribModal, setContribModal] = useState(null); // opportunity object
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/contributions/my-opportunities');
      setData(res.data);
    } catch {
      Alert.alert('Error', 'Failed to load opportunities');
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
      Alert.alert('Invalid', 'Please enter at least 0.5 hours');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/contributions', {
        opportunityId: contribModal._id,
        hours: Number(hours),
        description
      });
      Alert.alert('Submitted!', 'Your contribution has been sent for verification.');
      setContribModal(null);
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s) => ({ verified: '#27ae60', rejected: '#e74c3c' }[s] || '#f39c12');

  const renderItem = ({ item }) => {
    const opp = item.opportunity;
    const contribs = item.contributions || [];
    const verifiedHours = contribs.filter(c => c.status === 'verified').reduce((s, c) => s + c.hours, 0);
    const pendingCount = contribs.filter(c => c.status === 'pending').length;

    return (
      <View style={styles.card}>
        {opp.bannerImage ? (
          <Image source={{ uri: `${BASE_URL}/${opp.bannerImage}` }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}><Text style={styles.placeholderText}>🌍</Text></View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.categoryBadge}><Text style={styles.categoryText}>{opp.category}</Text></View>
          <Text style={styles.cardTitle}>{opp.title}</Text>
          {opp.organization ? <Text style={styles.cardDetail}>🏢 {opp.organization}</Text> : null}
          <Text style={styles.cardDetail}>📍 {opp.location}</Text>

          {/* Contribution summary */}
          <View style={styles.contribSummary}>
            <View style={styles.contribStat}>
              <Text style={styles.contribStatValue}>{verifiedHours}</Text>
              <Text style={styles.contribStatLabel}>hrs verified</Text>
            </View>
            <View style={styles.contribStat}>
              <Text style={[styles.contribStatValue, { color: '#f39c12' }]}>{pendingCount}</Text>
              <Text style={styles.contribStatLabel}>pending</Text>
            </View>
            <View style={styles.contribStat}>
              <Text style={[styles.contribStatValue, { color: '#9b59b6' }]}>{verifiedHours * 10}</Text>
              <Text style={styles.contribStatLabel}>pts earned</Text>
            </View>
          </View>

          {/* Recent submissions */}
          {contribs.length > 0 && (
            <View style={styles.recentContribs}>
              <Text style={styles.recentContribsTitle}>Recent submissions:</Text>
              {contribs.slice(0, 3).map(c => (
                <View key={c._id} style={styles.contribPill}>
                  <Text style={styles.contribPillText}>⏱ {c.hours}h</Text>
                  <View style={[styles.contribStatusDot, { backgroundColor: statusColor(c.status) }]} />
                  <Text style={[styles.contribPillStatus, { color: statusColor(c.status) }]}>{c.status}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.addContribBtn} onPress={() => openContribModal(opp)}>
            <Text style={styles.addContribBtnText}>+ Log Contribution Hours</Text>
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
  cardDetail: { fontSize: 13, color: '#555', marginBottom: 3 },
  contribSummary: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 10 },
  contribStat: { flex: 1, backgroundColor: '#f8f4ff', borderRadius: 10, padding: 10, alignItems: 'center' },
  contribStatValue: { fontSize: 20, fontWeight: 'bold', color: '#27ae60' },
  contribStatLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  recentContribs: { marginBottom: 10 },
  recentContribsTitle: { fontSize: 12, color: '#888', marginBottom: 6 },
  contribPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f8f9fa', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 4, alignSelf: 'flex-start' },
  contribPillText: { fontSize: 13, color: '#333', fontWeight: '600' },
  contribStatusDot: { width: 7, height: 7, borderRadius: 3.5 },
  contribPillStatus: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  addContribBtn: { backgroundColor: '#9b59b6', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 4 },
  addContribBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
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
