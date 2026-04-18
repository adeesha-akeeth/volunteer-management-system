import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, RefreshControl, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const MyCreatedOpportunitiesScreen = ({ navigation }) => {
  const toast = useToast();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyOpportunities = async () => {
    try {
      const response = await api.get('/api/opportunities/my');
      setOpportunities(response.data);
    } catch (error) {
      toast.error('Error', 'Failed to load opportunities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchMyOpportunities(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchMyOpportunities(); };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CreatorOpportunityDetail', { opportunityId: item._id })}
    >
      {item.bannerImage ? (
        <Image source={{ uri: `${BASE_URL}/${item.bannerImage}` }} style={styles.cardImage} resizeMode="cover" />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Text style={styles.cardImagePlaceholderText}>🌍 No Image</Text>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}><Text style={styles.categoryText}>{item.category}</Text></View>
        {item.averageRating && (
          <View style={styles.ratingBadge}><Text style={styles.ratingText}>⭐ {item.averageRating}</Text></View>
        )}
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      {item.organization ? <Text style={styles.cardDetail}>🏢 {item.organization}</Text> : null}
      <Text style={styles.cardDetail}>📍 {item.location}</Text>
      <Text style={styles.cardDetail}>
        📅 {item.startDate
          ? `${new Date(item.startDate).toDateString()} — ${new Date(item.endDate).toDateString()}`
          : 'Date not set'}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.cardSpots}>👥 {item.spotsAvailable} spots</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <Text style={styles.statText}>👍 {item.likes || 0}</Text>
          </View>
          <View style={[styles.statBadge, { backgroundColor: '#ffe8e8' }]}>
            <Text style={[styles.statText, { color: '#e74c3c' }]}>👎 {item.dislikes || 0}</Text>
          </View>
          <View style={styles.manageBadge}>
            <Text style={styles.manageBadgeText}>Manage →</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.heading}>My Created Opportunities</Text>
        <TouchableOpacity
          style={styles.allAppsBtn}
          onPress={() => navigation.navigate('AllCreatorApplications')}
        >
          <Ionicons name="people-outline" size={16} color="#2e86de" style={{ marginRight: 5 }} />
          <Text style={styles.allAppsBtnText}>All Applications</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={opportunities}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't created any opportunities yet</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  allAppsBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f4fd', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#2e86de' },
  allAppsBtnText: { color: '#2e86de', fontWeight: 'bold', fontSize: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 3 },
  cardImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 10 },
  cardImagePlaceholder: { width: '100%', height: 90, borderRadius: 8, marginBottom: 10, backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center' },
  cardImagePlaceholderText: { color: '#2e86de', fontSize: 16 },
  cardHeader: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  categoryBadge: { backgroundColor: '#e8f4fd', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#2e86de', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  ratingBadge: { backgroundColor: '#fff8e1', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText: { color: '#f39c12', fontSize: 11, fontWeight: 'bold' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  cardDetail: { color: '#555', marginBottom: 4, fontSize: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 6 },
  cardSpots: { color: '#27ae60', fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statBadge: { backgroundColor: '#e8f4fd', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  statText: { fontSize: 12, fontWeight: 'bold', color: '#2e86de' },
  manageBadge: { backgroundColor: '#2e86de', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  manageBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', fontSize: 16, textAlign: 'center' }
});

export default MyCreatedOpportunitiesScreen;
