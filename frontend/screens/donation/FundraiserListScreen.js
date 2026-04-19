import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Image, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const FundraiserListScreen = ({ navigation }) => {
  const toast = useToast();
  const { user } = useContext(AuthContext);
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchFundraisers = async (q = '') => {
    try {
      const res = await api.get(`/api/fundraisers?search=${encodeURIComponent(q)}`);
      setFundraisers(res.data);
    } catch {
      toast.error('Error', 'Failed to load fundraisers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchFundraisers(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchFundraisers(search); };
  const handleSearch = (t) => { setSearch(t); fetchFundraisers(t); };

  const renderItem = ({ item }) => {
    const pct = item.targetAmount > 0 ? Math.min(100, Math.round((item.collectedAmount / item.targetAmount) * 100)) : 0;
    const isCompleted = item.status === 'completed';
    const isCreator = item.createdBy?._id === user?.id || item.createdBy?.id === user?.id || item.createdBy === user?.id;
    const isStandalone = !item.opportunity;

    return (
      <TouchableOpacity
        style={[styles.card, isCompleted && styles.cardCompleted]}
        onPress={() => {
          if (isStandalone && isCreator) {
            navigation.navigate('ManageMyFundraiser', { fundraiserId: item._id });
          } else if (item.opportunity?._id) {
            navigation.navigate('OpportunityDetailFromDonations', { opportunityId: item.opportunity._id });
          }
        }}
        activeOpacity={0.8}
      >
        {item.opportunity?.bannerImage ? (
          <Image source={{ uri: `${BASE_URL}/${item.opportunity.bannerImage}` }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="cash-outline" size={30} color="#27ae60" />
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            {item.opportunity?.category
              ? <View style={styles.categoryBadge}><Text style={styles.categoryText}>{item.opportunity.category}</Text></View>
              : <View style={styles.categoryBadge}><Text style={styles.categoryText}>Standalone</Text></View>
            }
            {isCompleted
              ? <View style={styles.completedBadge}><Text style={styles.completedText}>Completed</Text></View>
              : <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>
            }
          </View>

          <Text style={styles.fundraiserName}>{item.name}</Text>
          {item.opportunity?.title
            ? <Text style={styles.oppTitle}>{item.opportunity.title}</Text>
            : item.description
              ? <Text style={styles.oppTitle} numberOfLines={2}>{item.description}</Text>
              : null
          }
          {item.opportunity?.organization ? <Text style={styles.orgText}>{item.opportunity.organization}</Text> : null}

          <View style={styles.amountRow}>
            <Text style={styles.collected}>LKR {item.collectedAmount.toLocaleString()}</Text>
            <Text style={styles.target}> of LKR {item.targetAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: isCompleted ? '#888' : '#27ae60' }]} />
          </View>
          <Text style={styles.pctText}>{pct}% funded · {item.donorCount} donor{item.donorCount !== 1 ? 's' : ''}</Text>

          {isCreator ? (
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => navigation.navigate('ManageMyFundraiser', { fundraiserId: item._id })}
            >
              <Ionicons name="settings-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.manageBtnText}>Manage</Text>
            </TouchableOpacity>
          ) : !isCompleted && (
            <TouchableOpacity
              style={styles.donateBtn}
              onPress={() => navigation.navigate('Donate', { fundraiserId: item._id, fundraiserName: item.name, opportunityTitle: item.opportunity?.title })}
            >
              <Text style={styles.donateBtnText}>Donate Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#27ae60" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support a Cause</Text>
        <Text style={styles.headerSubtitle}>Find fundraisers that need your help</Text>
        <TouchableOpacity
          style={styles.myFundraisersBtn}
          onPress={() => navigation.navigate('MyFundraisers')}
        >
          <Ionicons name="list-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.myFundraisersBtnText}>My Fundraisers</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#999" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholderTextColor="#999"
          placeholder="Search fundraisers..."
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={fundraisers}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No fundraisers found</Text>
            <Text style={styles.emptySubText}>{search ? 'Try a different search' : 'Check back soon!'}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#27ae60', padding: 20 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  myFundraisersBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  myFundraisersBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, margin: 15, marginBottom: 0, borderWidth: 1, borderColor: '#ddd' },
  searchInput: { flex: 1, padding: 12, fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, elevation: 3, overflow: 'hidden' },
  cardCompleted: { opacity: 0.8 },
  cardImage: { width: '100%', height: 140 },
  cardImagePlaceholder: { width: '100%', height: 90, backgroundColor: '#d5f5e3', justifyContent: 'center', alignItems: 'center' },
  manageBtn: { backgroundColor: '#2e86de', borderRadius: 8, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  manageBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cardBody: { padding: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  categoryBadge: { backgroundColor: '#d5f5e3', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  categoryText: { color: '#27ae60', fontSize: 11, fontWeight: 'bold' },
  completedBadge: { backgroundColor: '#888', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  completedText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  activeBadge: { backgroundColor: '#27ae60', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  activeBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  fundraiserName: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 3 },
  oppTitle: { fontSize: 13, color: '#555', marginBottom: 2 },
  orgText: { fontSize: 12, color: '#888', marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  collected: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  target: { fontSize: 13, color: '#888' },
  progressBg: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 5 },
  pctText: { fontSize: 12, color: '#888', marginBottom: 12 },
  donateBtn: { backgroundColor: '#27ae60', borderRadius: 8, padding: 12, alignItems: 'center' },
  donateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptySubText: { fontSize: 14, color: '#999', marginTop: 5 }
});

export default FundraiserListScreen;
