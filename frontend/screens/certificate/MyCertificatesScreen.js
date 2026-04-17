import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useToast } from '../../components/Toast';
import api from '../../api';

const MyCertificatesScreen = () => {
  const toast = useToast();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCertificates = async () => {
    try {
      const response = await api.get('/api/certificates/my');
      setCertificates(response.data);
    } catch (error) {
      toast.error('Error', 'Failed to load certificates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCertificates();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'issued': return '#27ae60';
      case 'revoked': return '#e74c3c';
      default: return '#f39c12';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.certificateHeader}>
        <Text style={styles.certificateIcon}>🏆</Text>
        <View style={styles.certificateTitleContainer}>
          <Text style={styles.cardTitle}>{item.opportunity?.title}</Text>
          <Text style={styles.issuedBy}>Issued by {item.issuedBy}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.detailsContainer}>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Hours</Text>
          <Text style={styles.detailValue}>{item.hoursCompleted}</Text>
        </View>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Organization</Text>
          <Text style={styles.detailValue}>{item.opportunity?.organization}</Text>
        </View>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Issued On</Text>
          <Text style={styles.detailValue}>{new Date(item.issueDate).toDateString()}</Text>
        </View>
      </View>
      <Text style={styles.cardDetail}>📍 {item.opportunity?.location}</Text>
      <Text style={styles.cardDetail}>📅 Event: {new Date(item.opportunity?.date).toDateString()}</Text>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryIcon}>🏆</Text>
        <Text style={styles.summaryTitle}>My Certificates</Text>
        <Text style={styles.summaryCount}>
          {certificates.filter(c => c.status === 'issued').length} Active Certificates
        </Text>
      </View>
      <FlatList
        data={certificates}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎓</Text>
            <Text style={styles.emptyText}>No certificates yet</Text>
            <Text style={styles.emptySubText}>Complete volunteer opportunities to earn certificates!</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { backgroundColor: '#f39c12', borderRadius: 10, padding: 20, marginBottom: 15, alignItems: 'center' },
  summaryIcon: { fontSize: 40, marginBottom: 5 },
  summaryTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  summaryCount: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 3, borderLeftWidth: 5, borderLeftColor: '#f39c12' },
  certificateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  certificateIcon: { fontSize: 30, marginRight: 10 },
  certificateTitleContainer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  issuedBy: { fontSize: 13, color: '#888', marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  detailsContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, marginBottom: 10 },
  detailBox: { alignItems: 'center', flex: 1 },
  detailLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  detailValue: { fontSize: 13, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  cardDetail: { color: '#555', marginBottom: 4, fontSize: 14 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyIcon: { fontSize: 60, marginBottom: 15 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#999', textAlign: 'center' }
});

export default MyCertificatesScreen;