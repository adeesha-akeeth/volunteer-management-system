import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity, RefreshControl, Image
} from 'react-native';
import api from '../../api';

const MyCreatedOpportunitiesScreen = ({ navigation }) => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyOpportunities = async () => {
    try {
const response = await api.get('/api/opportunities/my');
      setOpportunities(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load opportunities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyOpportunities();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyOpportunities();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CreatorOpportunityDetail', { opportunityId: item._id })}
    >
      {item.bannerImage ? (
        <Image
          source={{ uri: `https://volunteer-management-system-qux8.onrender.com/${item.bannerImage}` }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Text style={styles.cardImagePlaceholderText}>🌍 No Image</Text>
        </View>
      )}
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDetail}>🏢 {item.organization}</Text>
      <Text style={styles.cardDetail}>📍 {item.location}</Text>
      <Text style={styles.cardDetail}>📅 {new Date(item.date).toDateString()}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardSpots}>👥 {item.spotsAvailable} spots</Text>
        <View style={styles.manageBadge}>
          <Text style={styles.manageBadgeText}>Manage →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Created Opportunities</Text>
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
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 3 },
  cardImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 10 },
  cardImagePlaceholder: { width: '100%', height: 100, borderRadius: 8, marginBottom: 10, backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center' },
  cardImagePlaceholderText: { color: '#2e86de', fontSize: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  cardDetail: { color: '#555', marginBottom: 4, fontSize: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  cardSpots: { color: '#27ae60', fontWeight: 'bold' },
  manageBadge: { backgroundColor: '#2e86de', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  manageBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', fontSize: 16, textAlign: 'center' }
});

export default MyCreatedOpportunitiesScreen;