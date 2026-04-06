import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl, Image
} from 'react-native';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const FundraiserListScreen = ({ navigation }) => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFundraisers = async () => {
    try {
      const response = await api.get('/api/opportunities/fundraisers/list');
      setOpportunities(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load fundraisers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchFundraisers(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchFundraisers(); };

  const getProgressPct = (opp) => {
    const target = opp.fundraiser?.targetAmount || 0;
    const collected = opp.fundraiser?.collectedAmount || 0;
    if (target <= 0) return 0;
    return Math.min(100, Math.round((collected / target) * 100));
  };

  const renderItem = ({ item }) => {
    const pct = getProgressPct(item);
    const collected = item.fundraiser?.collectedAmount || 0;
    const target = item.fundraiser?.targetAmount || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('OpportunityDetailFromDonations', { opportunityId: item._id })}
        activeOpacity={0.8}
      >
        {item.bannerImage ? (
          <Image
            source={{ uri: `${BASE_URL}/${item.bannerImage}` }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={styles.cardImagePlaceholderText}>Fundraiser</Text>
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.organization ? <Text style={styles.cardOrg}>{item.organization}</Text> : null}

          <View style={styles.fundraiserSection}>
            <View style={styles.amountRow}>
              <Text style={styles.collected}>LKR {collected.toLocaleString()}</Text>
              <Text style={styles.target}> of LKR {target.toLocaleString()}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.pctText}>{pct}% funded</Text>
          </View>

          <TouchableOpacity
            style={styles.donateButton}
            onPress={() => navigation.navigate('Donate', { opportunityId: item._id, opportunityTitle: item.title })}
          >
            <Text style={styles.donateButtonText}>Donate</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#27ae60" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Fundraisers</Text>
        <Text style={styles.headerSubtitle}>Support causes that matter</Text>
      </View>

      <FlatList
        data={opportunities}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No active fundraisers right now</Text>
            <Text style={styles.emptySubText}>Check back soon!</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#27ae60', padding: 20, paddingTop: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, elevation: 3, overflow: 'hidden' },
  cardImage: { width: '100%', height: 150 },
  cardImagePlaceholder: { width: '100%', height: 100, backgroundColor: '#d5f5e3', justifyContent: 'center', alignItems: 'center' },
  cardImagePlaceholderText: { color: '#27ae60', fontWeight: 'bold', fontSize: 16 },
  cardBody: { padding: 14 },
  categoryBadge: { backgroundColor: '#d5f5e3', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  categoryText: { color: '#27ae60', fontSize: 12, fontWeight: 'bold' },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  cardOrg: { fontSize: 13, color: '#888', marginBottom: 10 },
  fundraiserSection: { marginBottom: 12 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  collected: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  target: { fontSize: 13, color: '#888' },
  progressBarBg: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden', marginBottom: 4 },
  progressBarFill: { height: '100%', backgroundColor: '#27ae60', borderRadius: 5 },
  pctText: { fontSize: 12, color: '#888' },
  donateButton: { backgroundColor: '#27ae60', borderRadius: 8, padding: 12, alignItems: 'center' },
  donateButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptySubText: { fontSize: 14, color: '#999', marginTop: 5 }
});

export default FundraiserListScreen;
