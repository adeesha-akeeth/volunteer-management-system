import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../../components/Toast';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const FindPublishersScreen = ({ navigation, route }) => {
  const toast = useToast();
  const followedOnly = route.params?.followedOnly || false;

  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [followLoading, setFollowLoading] = useState({});

  const fetchPublishers = async (q = '') => {
    try {
      let res;
      if (followedOnly) {
        res = await api.get('/api/follows/mine');
      } else {
        res = await api.get('/api/follows/publishers', { params: q ? { search: q } : {} });
      }
      let data = res.data || [];
      if (followedOnly && q) {
        data = data.filter(p => p.name?.toLowerCase().includes(q.toLowerCase()));
      }
      setPublishers(data);
    } catch {
      toast.error('Error', 'Failed to load publishers');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPublishers(); }, []));

  const handleSearch = (text) => {
    setSearch(text);
    fetchPublishers(text);
  };

  const handleFollow = async (publisher) => {
    setFollowLoading(prev => ({ ...prev, [publisher._id]: true }));
    try {
      const res = await api.post(`/api/follows/${publisher._id}`);
      if (followedOnly && !res.data.following) {
        // Unfollow in "followed only" view — remove from list
        setPublishers(prev => prev.filter(p => p._id !== publisher._id));
      } else {
        setPublishers(prev => prev.map(p =>
          p._id === publisher._id ? { ...p, isFollowing: res.data.following } : p
        ));
      }
    } catch {
      toast.error('Error', 'Failed to update follow');
    } finally {
      setFollowLoading(prev => ({ ...prev, [publisher._id]: false }));
    }
  };

  const renderItem = ({ item }) => {
    const photoUri = item.profileImage ? `${BASE_URL}/${item.profileImage}` : null;
    const isLoading = followLoading[item._id];
    const isFollowing = followedOnly ? true : item.isFollowing;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardLeft}
          onPress={() => navigation.navigate('PublisherProfile', { publisherId: item._id })}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <View style={styles.ratingRow}>
              {item.averageRating ? (
                <Text style={styles.rating}>⭐ {item.averageRating}</Text>
              ) : (
                <Text style={styles.noRating}>No ratings yet</Text>
              )}
            </View>
            <Text style={styles.stats}>
              {item.opportunityCount} opportunit{item.opportunityCount === 1 ? 'y' : 'ies'} · {item.followerCount || 0} follower{item.followerCount === 1 ? '' : 's'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followBtnActive]}
          onPress={() => handleFollow(item)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? '#2e86de' : '#fff'} />
          ) : (
            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
              {isFollowing ? '✓ Following' : '+ Follow'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#999" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={followedOnly ? 'Search followed publishers...' : 'Search publishers by name...'}
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={handleSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={18} color="#aaa" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>
      ) : (
        <FlatList
          data={publishers}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={60} color="#ddd" />
              <Text style={styles.emptyText}>
                {followedOnly ? "You're not following anyone yet" : 'No publishers found'}
              </Text>
              {followedOnly && (
                <TouchableOpacity onPress={() => navigation.navigate('FindPublishers')}>
                  <Text style={styles.emptyLink}>Find publishers to follow →</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 15, marginBottom: 0, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#dee2e6' },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },

  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, padding: 14, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#666' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  rating: { fontSize: 13, color: '#f39c12', fontWeight: '600' },
  noRating: { fontSize: 12, color: '#bbb' },
  stats: { fontSize: 12, color: '#888' },

  followBtn: { backgroundColor: '#2e86de', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, minWidth: 90, alignItems: 'center' },
  followBtnActive: { backgroundColor: '#f0f4f8', borderWidth: 1.5, borderColor: '#2e86de' },
  followBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  followBtnTextActive: { color: '#2e86de' },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#999', fontSize: 16, marginTop: 12 },
  emptyLink: { color: '#2e86de', fontWeight: 'bold', fontSize: 14, marginTop: 8 }
});

export default FindPublishersScreen;
