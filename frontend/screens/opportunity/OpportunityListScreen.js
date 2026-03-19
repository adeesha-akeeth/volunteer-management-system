import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator,
  Alert, RefreshControl
} from 'react-native';
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
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>
      <Text style={styles.cardDetail}>🏢 {item.organization}</Text>
      <Text style={styles.cardDetail}>📍 {item.location}</Text>
      <Text style={styles.cardDetail}>📅 {new Date(item.date).toDateString()}</Text>
      <Text style={styles.cardSpots}>👥 {item.spotsAvailable} spots available</Text>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hello, {user?.name}! 👋</Text>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search opportunities..."
        value={search}
        onChangeText={handleSearch}
      />

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateOpportunity')}
      >
        <Text style={styles.createButtonText}>+ Post New Opportunity</Text>
      </TouchableOpacity>

      <FlatList
        data={opportunities}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No opportunities found</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  logoutText: { color: '#e74c3c', fontWeight: 'bold' },
  searchInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#ddd', fontSize: 16 },
  createButton: { backgroundColor: '#2e86de', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 15 },
  createButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 },
  categoryBadge: { backgroundColor: '#e8f4fd', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#2e86de', fontSize: 12, fontWeight: 'bold' },
  cardDetail: { color: '#555', marginBottom: 4 },
  cardSpots: { color: '#27ae60', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 }
});

export default OpportunityListScreen;