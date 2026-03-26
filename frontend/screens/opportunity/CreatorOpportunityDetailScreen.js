import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Image
} from 'react-native';
import api from '../../api';

const CreatorOpportunityDetailScreen = ({ route, navigation }) => {
  const { opportunityId } = route.params;
  const [opportunity, setOpportunity] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchData = async () => {
    try {
      const [oppResponse, appResponse] = await Promise.all([
        api.get(`/api/opportunities/${opportunityId}`),
        api.get(`/api/applications/opportunity/${opportunityId}`)
      ]);
      setOpportunity(oppResponse.data);
      setApplications(appResponse.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (applicationId, status) => {
    try {
      await api.put(`/api/applications/${applicationId}/status`, { status });
      Alert.alert('Success', `Application ${status} successfully!`);
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleGenerateCertificate = (application) => {
  navigation.navigate('GenerateCertificate', { application, opportunity });
};

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#27ae60';
      case 'completed': return '#2e86de';
      default: return '#f39c12';
    }
  };

  const filteredApplications = filter === 'all'
    ? applications
    : applications.filter(a => a.status === filter);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <ScrollView style={styles.container}>
      {/* Opportunity Header */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>{opportunity?.title}</Text>
        <Text style={styles.headerDetail}>🏢 {opportunity?.organization}</Text>
        <Text style={styles.headerDetail}>📍 {opportunity?.location}</Text>
        <Text style={styles.headerDetail}>📅 {new Date(opportunity?.date).toDateString()}</Text>
        <Text style={styles.headerDetail}>👥 {opportunity?.spotsAvailable} spots</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{applications.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{applications.filter(a => a.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{applications.filter(a => a.status === 'approved').length}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{applications.filter(a => a.status === 'completed').length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

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

      {/* Applications List */}
      <Text style={styles.sectionTitle}>Applications ({filteredApplications.length})</Text>

      {filteredApplications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No applications yet</Text>
        </View>
      ) : (
        filteredApplications.map((app) => (
          <View key={app._id} style={styles.appCard}>
            <View style={styles.appHeader}>
              <View style={styles.appVolunteerInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {app.volunteer?.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.volunteerName}>{app.volunteer?.name}</Text>
                  <Text style={styles.volunteerEmail}>{app.volunteer?.email}</Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(app.status) }]}>
                <Text style={styles.statusText}>{app.status}</Text>
              </View>
            </View>

            {/* Applicant Photo */}
            {app.photo ? (
              <Image
                source={{ uri: `https://volunteer-management-system-qux8.onrender.com/${app.photo}` }}
                style={styles.applicantPhoto}
              />
            ) : null}

            <Text style={styles.appDetail}>📞 {app.phone}</Text>
            <Text style={styles.appDetail}>✉️ {app.email}</Text>
            <Text style={styles.appDetail}>💬 {app.coverLetter}</Text>
            <Text style={styles.appDate}>Applied: {new Date(app.appliedAt).toDateString()}</Text>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {app.status === 'pending' && (
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleUpdateStatus(app._id, 'approved')}
                >
                  <Text style={styles.actionButtonText}>✅ Accept</Text>
                </TouchableOpacity>
              )}
              {app.status === 'approved' && (
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => handleUpdateStatus(app._id, 'completed')}
                >
                  <Text style={styles.actionButtonText}>🏆 Mark Completed</Text>
                </TouchableOpacity>
              )}
              {app.status === 'completed' && (
                <TouchableOpacity
                  style={styles.certificateButton}
                  onPress={() => handleGenerateCertificate(app)}
                >
                  <Text style={styles.actionButtonText}>🎓 Generate Certificate</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  headerDetail: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', marginHorizontal: 3, elevation: 2 },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#2e86de' },
  statLabel: { fontSize: 12, color: '#888' },
  filterContainer: { flexDirection: 'row', marginBottom: 15, gap: 6 },
  filterTab: { flex: 1, padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2e86de', alignItems: 'center' },
  filterTabActive: { backgroundColor: '#2e86de' },
  filterTabText: { color: '#2e86de', fontSize: 11, fontWeight: 'bold' },
  filterTabTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  emptyContainer: { alignItems: 'center', padding: 30 },
  emptyText: { color: '#999', fontSize: 16 },
  appCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 3 },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  appVolunteerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  volunteerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  volunteerEmail: { fontSize: 12, color: '#888' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  applicantPhoto: { width: 80, height: 80, borderRadius: 40, marginBottom: 10, alignSelf: 'center' },
  appDetail: { color: '#555', marginBottom: 4, fontSize: 14 },
  appDate: { color: '#999', fontSize: 12, marginTop: 5, marginBottom: 10 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  acceptButton: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, padding: 10, alignItems: 'center' },
  completeButton: { flex: 1, backgroundColor: '#2e86de', borderRadius: 8, padding: 10, alignItems: 'center' },
  certificateButton: { flex: 1, backgroundColor: '#f39c12', borderRadius: 8, padding: 10, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});

export default CreatorOpportunityDetailScreen;