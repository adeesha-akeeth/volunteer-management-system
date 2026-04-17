import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, Image
} from 'react-native';
import { useToast } from '../../components/Toast';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const PastVolunteeringScreen = () => {
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/contributions/my-past');
      setData(res.data);
    } catch {
      toast.error('Error', 'Failed to load past volunteering');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const renderItem = ({ item }) => {
    const opp = item.opportunity;
    const contribs = item.contributions || [];
    const verifiedHours = item.verifiedHours || 0;
    const totalPts = Math.floor(verifiedHours * 10);

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
          {opp.endDate && <Text style={styles.cardDetail}>📅 Ended {new Date(opp.endDate).toDateString()}</Text>}

          <View style={styles.summaryRow}>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryValue}>{verifiedHours}</Text>
              <Text style={styles.summaryLabel}>hrs verified</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Text style={[styles.summaryValue, { color: '#9b59b6' }]}>{totalPts}</Text>
              <Text style={styles.summaryLabel}>points earned</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Text style={[styles.summaryValue, { color: '#27ae60' }]}>{contribs.length}</Text>
              <Text style={styles.summaryLabel}>submissions</Text>
            </View>
          </View>

          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓ Completed</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#9b59b6" /></View>;

  return (
    <FlatList
      style={styles.container}
      data={data}
      keyExtractor={item => item.application._id}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={<Text style={styles.heading}>Past Volunteering ({data.length})</Text>}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No completed volunteering yet</Text>
          <Text style={styles.emptySub}>Opportunities you complete will show here.</Text>
        </View>
      }
    />
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
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 10 },
  summaryBadge: { flex: 1, backgroundColor: '#f8f4ff', borderRadius: 10, padding: 10, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#27ae60' },
  summaryLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  completedBadge: { backgroundColor: '#e8f8f1', borderRadius: 8, padding: 8, alignItems: 'center' },
  completedText: { color: '#27ae60', fontWeight: 'bold', fontSize: 14 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#999', textAlign: 'center' }
});

export default PastVolunteeringScreen;
