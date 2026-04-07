import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator,
  Alert, RefreshControl, Image, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const OpportunityListScreen = ({ navigation }) => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const { user, logout } = useContext(AuthContext);

  // Favourites modal
  const [favModalVisible, setFavModalVisible] = useState(false);
  const [favLists, setFavLists] = useState([]);
  const [pendingFavOpp, setPendingFavOpp] = useState(null);
  const [favLoading, setFavLoading] = useState(false);

  const fetchOpportunities = async (searchTerm = '') => {
    try {
      const response = await api.get(`/api/opportunities?search=${searchTerm}`);
      setOpportunities(response.data);
    } catch {
      Alert.alert('Error', 'Failed to load opportunities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchOpportunities(); }, []);

  const handleSearch = (text) => { setSearch(text); fetchOpportunities(text); };
  const onRefresh = () => { setRefreshing(true); fetchOpportunities(search); };

  const handleAddToFavourites = async (opportunity) => {
    setPendingFavOpp(opportunity);
    setFavLoading(true);
    setFavModalVisible(true);
    try {
      const res = await api.get('/api/favourites');
      setFavLists(res.data);
    } catch {
      Alert.alert('Error', 'Failed to load your lists');
      setFavModalVisible(false);
    } finally {
      setFavLoading(false);
    }
  };

  const addToList = async (listId) => {
    setFavModalVisible(false);
    try {
      await api.post(`/api/favourites/${listId}/add`, { opportunityId: pendingFavOpp._id });
      Alert.alert('Added!', `"${pendingFavOpp.title}" saved to your list.`);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add');
    }
  };

  const createDefaultAndAdd = async () => {
    setFavModalVisible(false);
    try {
      const res = await api.post('/api/favourites', { name: 'Favourites', description: 'My saved opportunities' });
      await api.post(`/api/favourites/${res.data._id}/add`, { opportunityId: pendingFavOpp._id });
      Alert.alert('Saved!', `Created "Favourites" list and added "${pendingFavOpp.title}".`);
    } catch {
      Alert.alert('Error', 'Failed to save');
    }
  };

  const renderItem = ({ item }) => {
    const isOwn = item.createdBy?._id === user?.id || item.createdBy?.id === user?.id;
    const hasFundraisers = item.fundraisers?.length > 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item._id })}
        activeOpacity={0.7}
      >
        {item.bannerImage ? (
          <Image source={{ uri: `${BASE_URL}/${item.bannerImage}` }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}><Text style={styles.cardImagePlaceholderText}>🌍</Text></View>
        )}

        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.categoryBadge}><Text style={styles.categoryText}>{item.category}</Text></View>
            {item.averageRating && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>⭐ {item.averageRating}</Text>
              </View>
            )}
          </View>
          {isOwn && <View style={styles.ownBadge}><Text style={styles.ownBadgeText}>Your Post</Text></View>}
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.organization ? <Text style={styles.cardDetail}>🏢 {item.organization}</Text> : null}
        <Text style={styles.cardDetail}>📍 {item.location}</Text>
        <Text style={styles.cardDetail}>
          📅 {item.startDate
            ? `${new Date(item.startDate).toDateString()} — ${new Date(item.endDate).toDateString()}`
            : 'Date not set'}
        </Text>

        {/* Fundraiser mini-bars */}
        {hasFundraisers && item.fundraisers.map(fr => {
          const pct = fr.targetAmount > 0 ? Math.min(100, Math.round((fr.collectedAmount / fr.targetAmount) * 100)) : 0;
          return (
            <View key={fr._id} style={styles.fundraiserMini}>
              <View style={styles.fundraiserMiniRow}>
                <Text style={styles.fundraiserMiniName}>{fr.name}</Text>
                {fr.status === 'completed' && <Text style={styles.fundraiserMiniDone}>✓ Done</Text>}
              </View>
              <View style={styles.fundraiserMiniBarBg}>
                <View style={[styles.fundraiserMiniBarFill, { width: `${pct}%`, backgroundColor: fr.status === 'completed' ? '#888' : '#27ae60' }]} />
              </View>
              <Text style={styles.fundraiserMiniPct}>{pct}% · LKR {fr.collectedAmount.toLocaleString()} / {fr.targetAmount.toLocaleString()}</Text>
            </View>
          );
        })}

        <View style={styles.cardFooter}>
          <Text style={styles.cardSpots}>👥 {item.spotsAvailable} spots</Text>
          <View style={styles.footerRight}>
            <TouchableOpacity style={styles.heartButton} onPress={(e) => { e.stopPropagation?.(); handleAddToFavourites(item); }}>
              <Text style={styles.heartIcon}>❤️</Text>
            </TouchableOpacity>
            <View style={[styles.applyBadge, isOwn && styles.applyBadgeOwn]}>
              <Text style={styles.applyBadgeText}>{isOwn ? 'View' : 'View & Apply'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello, {user?.name}! 👋</Text>
          <Text style={styles.headerSubtitle}>Find your next volunteer opportunity</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
        <TextInput style={styles.searchInput} placeholderTextColor="#999" placeholder="Search opportunities..." value={search} onChangeText={handleSearch} />
      </View>

      <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('CreateOpportunity')}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.createButtonText}>Post New Opportunity</Text>
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Opportunities</Text>
        <Text style={styles.sectionCount}>{opportunities.length} found</Text>
      </View>

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

      {/* Favourites list picker modal */}
      <Modal visible={favModalVisible} transparent animationType="slide" onRequestClose={() => setFavModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFavModalVisible(false)}>
          <View style={styles.favModal} onStartShouldSetResponder={() => true}>
            <View style={styles.favModalHandle} />
            <Text style={styles.favModalTitle}>Save to Favourites</Text>
            {pendingFavOpp && <Text style={styles.favModalOppTitle} numberOfLines={1}>{pendingFavOpp.title}</Text>}

            {favLoading ? (
              <ActivityIndicator color="#e74c3c" style={{ marginVertical: 20 }} />
            ) : favLists.length === 0 ? (
              <View style={styles.noListsContainer}>
                <Text style={styles.noListsText}>You don't have any lists yet.</Text>
                <TouchableOpacity style={styles.favActionBtn} onPress={createDefaultAndAdd}>
                  <Text style={styles.favActionBtnText}>Create "Favourites" list & Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.favSecondaryBtn} onPress={() => { setFavModalVisible(false); navigation.navigate('Favourites'); }}>
                  <Text style={styles.favSecondaryBtnText}>Manage my lists</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.favModalHint}>Choose a list:</Text>
                {favLists.map(list => (
                  <TouchableOpacity key={list._id} style={styles.favListItem} onPress={() => addToList(list._id)}>
                    <View style={styles.favListIcon}><Text>❤️</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.favListName}>{list.name}</Text>
                      <Text style={styles.favListCount}>{list.opportunities?.length || 0} saved</Text>
                    </View>
                    <Text style={styles.favListArrow}>→</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.favNewListBtn} onPress={() => { setFavModalVisible(false); navigation.navigate('Favourites'); }}>
                  <Text style={styles.favNewListBtnText}>+ Create New List</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.favCancelBtn} onPress={() => setFavModalVisible(false)}>
              <Text style={styles.favCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  cardImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 10 },
  cardImagePlaceholder: { width: '100%', height: 100, borderRadius: 8, marginBottom: 10, backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center' },
  cardImagePlaceholderText: { color: '#2e86de', fontSize: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  categoryBadge: { backgroundColor: '#e8f4fd', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#2e86de', fontSize: 12, fontWeight: 'bold' },
  ratingBadge: { backgroundColor: '#fff8e1', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText: { color: '#f39c12', fontSize: 12, fontWeight: 'bold' },
  ownBadge: { backgroundColor: '#e8f4fd', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ownBadgeText: { color: '#2e86de', fontSize: 11, fontWeight: 'bold' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  cardDetail: { color: '#555', marginBottom: 4, fontSize: 14 },
  fundraiserMini: { backgroundColor: '#f0fff4', borderRadius: 6, padding: 8, marginTop: 6, marginBottom: 2 },
  fundraiserMiniRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  fundraiserMiniName: { fontSize: 12, fontWeight: 'bold', color: '#27ae60' },
  fundraiserMiniDone: { fontSize: 11, color: '#888', fontWeight: 'bold' },
  fundraiserMiniBarBg: { height: 6, backgroundColor: '#d4edda', borderRadius: 3, overflow: 'hidden', marginBottom: 3 },
  fundraiserMiniBarFill: { height: '100%', borderRadius: 3 },
  fundraiserMiniPct: { fontSize: 11, color: '#888' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  cardSpots: { color: '#27ae60', fontWeight: 'bold', fontSize: 14 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heartButton: { backgroundColor: '#ffe0e0', borderRadius: 20, padding: 6 },
  heartIcon: { fontSize: 16 },
  applyBadge: { backgroundColor: '#2e86de', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  applyBadgeOwn: { backgroundColor: '#888' },
  applyBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 15 },
  emptySubText: { fontSize: 14, color: '#999', marginTop: 5 },
  // Favourites modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  favModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  favModalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  favModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  favModalOppTitle: { fontSize: 14, color: '#888', marginBottom: 16 },
  favModalHint: { fontSize: 13, color: '#888', marginBottom: 8 },
  noListsContainer: { alignItems: 'center', paddingVertical: 10 },
  noListsText: { color: '#888', fontSize: 15, marginBottom: 16 },
  favActionBtn: { backgroundColor: '#e74c3c', borderRadius: 10, padding: 14, alignItems: 'center', width: '100%', marginBottom: 10 },
  favActionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  favSecondaryBtn: { padding: 10 },
  favSecondaryBtnText: { color: '#2e86de', fontSize: 14 },
  favListItem: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#f8f9fa', borderRadius: 10, marginBottom: 8 },
  favListIcon: { width: 36, height: 36, backgroundColor: '#ffe0e0', borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  favListName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  favListCount: { fontSize: 12, color: '#888', marginTop: 2 },
  favListArrow: { fontSize: 18, color: '#e74c3c', fontWeight: 'bold' },
  favNewListBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  favNewListBtnText: { color: '#2e86de', fontWeight: 'bold', fontSize: 15 },
  favCancelBtn: { marginTop: 8, padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  favCancelText: { color: '#888', fontSize: 15 }
});

export default OpportunityListScreen;
