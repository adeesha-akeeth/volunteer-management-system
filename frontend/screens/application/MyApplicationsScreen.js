import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity, RefreshControl
} from 'react-native';
import api from '../../api';

const MyApplicationsScreen = ({ navigation }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchApplications = async () => {
    try {
      const url = filter === 'all' ? '/api/applications/my' : `/api/applications/my?status=${filter}`;
      const response = await api.get(url);
      setApplications(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const handleWithdraw = async (applicationId) => {
    Alert.alert('Withdraw Application', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/applications/${applicationId}`);
            Alert.alert('Success', 'Application withdrawn');
            fetchApplications();
          } catch (error) {
            Alert.alert('Error', 'Failed to withdraw');
          }
        }
      }
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#27ae60';
      case 'completed': return '#2e86de';
      default: return '#f39c12';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved': return '✅ Accepted';
      case 'completed': return '🏆 Completed';
      default: return '⏳ Pending';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.opportunity?.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      <Text style={styles.cardDetail}>🏢 {item.opportunity?.organization}</Text>
      <Text style={styles.cardDetail}>📍 {item.opportunity?.location}</Text>
      <Text style={styles.cardDetail}>
        📅 {item.opportunity?.startDate
          ? `${new Date(item.opportunity.startDate).toDateString()} — ${new Date(item.opportunity.endDate).toDateString()}`
          : item.opportunity?.date
            ? new Date(item.opportunity.date).toDateString()
            : 'Date not set'}
      </Text>
      <Text style={styles.cardDate}>Applied: {new Date(item.appliedAt).toDateString()}</Text>

      {item.status === 'completed' && (
        <TouchableOpacity
          style={styles.feedbackButton}
          onPress={() => navigation.navigate('SubmitFeedback', { opportunity: item.opportunity })}
        >
          <Text style={styles.feedbackButtonText}>⭐ Give Feedback</Text>
        </TouchableOpacity>
      )}

      {item.status === 'pending' && (
        <TouchableOpacity style={styles.withdrawButton} onPress={() => handleWithdraw(item._id)}>
          <Text style={styles.withdrawButtonText}>Withdraw</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Applications</Text>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'pending', 'approved', 'completed'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={applications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No applications found</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  filterContainer: { flexDirection: 'row', marginBottom: 15, gap: 8 },
  filterTab: { flex: 1, padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2e86de', alignItems: 'center' },
  filterTabActive: { backgroundColor: '#2e86de' },
  filterTabText: { color: '#2e86de', fontSize: 12, fontWeight: 'bold' },
  filterTabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  cardDetail: { color: '#555', marginBottom: 4, fontSize: 14 },
  cardDate: { color: '#999', fontSize: 12, marginTop: 5 },
  feedbackButton: { backgroundColor: '#9b59b6', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  feedbackButtonText: { color: '#fff', fontWeight: 'bold' },
  withdrawButton: { backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  withdrawButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 }
});

export default MyApplicationsScreen;