import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity,
  RefreshControl, Image, ScrollView
} from 'react-native';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const FavouriteDetailScreen = ({ route, navigation }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const { list } = route.params;
  const [opportunities, setOpportunities] = useState(list.opportunities || []);
  const [extraData, setExtraData] = useState({}); // keyed by opp._id: { likes, dislikes, averageRating }
  const [refreshing, setRefreshing] = useState(false);

  const fetchList = async () => {
    try {
      const response = await api.get('/api/favourites');
      const updated = response.data.find(l => l._id === list._id);
      if (updated) setOpportunities(updated.opportunities || []);
    } catch {
      console.log('Failed to refresh list');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchExtras = async (opps) => {
    if (!opps || opps.length === 0) return;
    try {
      // Fetch full opportunity data to get likes/dislikes/ratings
      const results = await Promise.allSettled(
        opps.map(o => api.get(`/api/opportunities/${o._id}`))
      );
      const map = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const d = r.value.data;
          map[opps[i]._id] = {
            likes: d.likes || 0,
            dislikes: d.dislikes || 0,
            averageRating: d.averageRating || null,
            reviewCount: d.reviewCount || 0
          };
        }
      });
      setExtraData(map);
    } catch {}
  };

  useEffect(() => {
    fetchExtras(opportunities);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchList().then(() => fetchExtras(opportunities));
  };

  const handleRemove = (opportunityId) => {
    confirm.show({
      title: 'Remove',
      message: 'Remove this opportunity from the list?',
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/favourites/${list._id}/remove/${opportunityId}`);
          setOpportunities(prev => prev.filter(op => op._id !== opportunityId));
        } catch {
          toast.error('Error', 'Failed to remove');
        }
      }
    });
  };

  // Collect all categories in this list
  const allCategories = [...new Set(opportunities.map(o => o.category).filter(Boolean))];

  const renderItem = ({ item }) => {
    const extra = extraData[item._id] || {};
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item._id })}
        activeOpacity={0.9}
      >
        {item.bannerImage ? (
          <Image source={{ uri: `${BASE_URL}/${item.bannerImage}` }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.placeholderText}>🌍</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.badgeRow}>
            {item.category && <View style={styles.categoryBadge}><Text style={styles.categoryText}>{item.category}</Text></View>}
            {extra.averageRating && (
              <View style={styles.ratingBadge}><Text style={styles.ratingText}>⭐ {extra.averageRating} ({extra.reviewCount})</Text></View>
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

          {/* Actions row: votes + remove */}
          <View style={styles.actionsRow}>
            <View style={styles.voteBadge}><Text style={styles.voteBadgeText}>👍 {extra.likes || 0}</Text></View>
            <View style={[styles.voteBadge, { backgroundColor: '#ffe8e8' }]}><Text style={[styles.voteBadgeText, { color: '#e74c3c' }]}>👎 {extra.dislikes || 0}</Text></View>
            <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item._id)}>
              <Text style={styles.removeButtonText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{list.name}</Text>
      {list.description ? <Text style={styles.description}>{list.description}</Text> : null}

      {/* Categories present in list */}
      {allCategories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ gap: 8, paddingRight: 10 }}>
          {allCategories.map(cat => (
            <View key={cat} style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{cat}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <Text style={styles.countLabel}>{opportunities.length} opportunit{opportunities.length !== 1 ? 'ies' : 'y'}</Text>

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
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  description: { fontSize: 14, color: '#666', marginBottom: 10 },
  categoryScroll: { marginBottom: 10 },
  categoryChip: { backgroundColor: '#e8f4fd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#2e86de' },
  categoryChipText: { color: '#2e86de', fontWeight: 'bold', fontSize: 12, textTransform: 'capitalize' },
  countLabel: { fontSize: 13, color: '#888', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, elevation: 3, overflow: 'hidden' },
  cardImage: { width: '100%', height: 120 },
  cardImagePlaceholder: { width: '100%', height: 80, backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 30 },
  cardContent: { padding: 12 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  categoryBadge: { backgroundColor: '#e8f4fd', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#2e86de', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  ratingBadge: { backgroundColor: '#fff8e1', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText: { color: '#f39c12', fontSize: 11, fontWeight: 'bold' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  cardDetail: { fontSize: 13, color: '#555', marginBottom: 3 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  voteBadge: { backgroundColor: '#e8f4fd', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  voteBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#2e86de' },
  removeButton: { marginLeft: 'auto', backgroundColor: '#ffe0e0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  removeButtonText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 12 },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  emptySubText: { fontSize: 14, color: '#999', textAlign: 'center' }
});

export default FavouriteDetailScreen;
