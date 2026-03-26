import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
  RefreshControl, Image
} from 'react-native';
import api from '../../api';

const FavouriteDetailScreen = ({ route, navigation }) => {
  const { list } = route.params;
  const [opportunities, setOpportunities] = useState(list.opportunities || []);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchList = async () => {
    try {
      const response = await api.get('/api/favourites');
      const updated = response.data.find(l => l._id === list._id);
      if (updated) setOpportunities(updated.opportunities || []);
    } catch (error) {
      console.log('Failed to refresh list');
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchList(); };

  const handleRemove = async (opportunityId) => {
    Alert.alert('Remove', 'Remove this opportunity from the list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/favourites/${list._id}/remove/${opportunityId}`);
            setOpportunities(prev => prev.filter(op => op._id !== opportunityId));
          } catch (error) {
            Alert.alert('Error', 'Failed to remove');
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item._id })}
    >
      {item.bannerImage ? (
        <Image
          source={{ uri: `https://volunteer-management-system-qux8.onrender.com/${item.bannerImage}` }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Text style={styles.placeholderText}>🌍</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDetail}>🏢 {item.organization}</Text>
        <Text style={styles.cardDetail}>📍 {item.location}</Text>
        <Text style={styles.cardDetail}>📅 {new Date(item.date).toDateString()}</Text>
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item._id)}>
        <Text style={styles.removeButtonText}>✕ Remove</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{list.name}</Text>
      {list.description ? <Text style={styles.description}>{list.description}</Text> : null}

      <FlatList
        data={opportunities}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No opportunities in this list yet</Text>
            <Text style={styles.emptySubText}>Tap the ❤️ on any opportunity to add it here!</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  description: { fontSize: 14, color: '#666', marginBottom: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, elevation: 3, overflow: 'hidden' },
  cardImage: { width: '100%', height: 120 },
  cardImagePlaceholder: { width: '100%', height: 80, backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 30 },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  cardDetail: { fontSize: 14, color: '#555', marginBottom: 3 },
  removeButton: { margin: 12, marginTop: 0, backgroundColor: '#ffe0e0', borderRadius: 8, padding: 8, alignItems: 'center' },
  removeButtonText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 13 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  emptySubText: { fontSize: 14, color: '#999', textAlign: 'center' }
});

export default FavouriteDetailScreen;