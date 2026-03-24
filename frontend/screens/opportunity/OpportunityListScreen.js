import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator,
  Alert, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';

const OpportunityListScreen = ({ navigation }) => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const { user, logout } = useContext(AuthContext);

  const fetchOpportunities = async (searchTerm = '') => {
    try {
      const response = await api.get(`/api/opportunities?search=${searchTerm}`);
      setOpportunities(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load opportunities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleSearch = (text) => {
    setSearch(text);
    fetchOpportunities(text);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOpportunities();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item._id })}
      activeOpacity={0.7}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        <View style={styles.tapHint}>
          <Text style={styles.tapHintText}>Tap to apply →</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.cardTitle}>{item.title}</Text>

      {/* Details */}
      <Text style={styles.cardDetail}>🏢 {item.organization}</Text>
      <Text style={styles.cardDetail}>📍 {item.location}</Text>
      <Text style={styles.cardDetail}>📅 {new Date(item.date).toDateString()}</Text>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.cardSpots}>👥 {item.spotsAvailable} spots left</Text>
        <View style={styles.applyNowBadge}>
          <Text style={styles.applyNowText}>View & Apply</Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e86de" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello, {user?.name}! 👋</Text>
          <Text style={styles.headerSubtitle}>Find your next volunteer opportunity</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholderTextColor="#999" placeholder="Search opportunities..."
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {/* Post Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateOpportunity')}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Post New Opportunity</Text>
      </TouchableOpacity>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Opportunities</Text>
        <Text style={styles.sectionCount}>{opportunities.length} found</Text>
      </View>

      {/* List */}
      <FlatList
        data={opportunities}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#ddd" />
            <Text style={styles.emptyText}>No opportunities found</Text>
            <Text style={styles.emptySubText}>Be the first to post one!</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  logoutButton: { padding: 5 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, padding: 12, fontSize: 16 },
  createButton: { backgroundColor: '#2e86de', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 15, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  createButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sectionCount: { fontSize: 14, color: '#888' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#2e86de' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { backgroundColor: '#e8f4fd', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#2e86de', fontSize: 12, fontWeight: 'bold' },
  tapHint: { backgroundColor: '#fff3e0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tapHintText: { color: '#f39c12', fontSize: 12, fontWeight: 'bold' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  cardDetail: { color: '#555', marginBottom: 4, fontSize: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  cardSpots: { color: '#27ae60', fontWeight: 'bold', fontSize: 14 },
  applyNowBadge: { backgroundColor: '#2e86de', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  applyNowText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 15 },
  emptySubText: { fontSize: 14, color: '#999', marginTop: 5 }
});

export default OpportunityListScreen;