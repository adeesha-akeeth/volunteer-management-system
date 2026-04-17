import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, SectionList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import api from '../../api';

const statusColor = (s) => {
  if (s === 'active') return '#27ae60';
  if (s === 'completed') return '#888';
  if (s === 'stopped') return '#e74c3c';
  return '#f39c12';
};

const statusLabel = (s) => {
  if (s === 'active') return 'Active';
  if (s === 'completed') return 'Completed';
  if (s === 'stopped') return 'Stopped';
  return s;
};

const MyFundraisersScreen = ({ navigation }) => {
  const toast = useToast();
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFundraisers = async () => {
    try {
      const res = await api.get('/api/fundraisers/my');
      setFundraisers(res.data);
    } catch {
      toast.error('Error', 'Failed to load your fundraisers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchFundraisers(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchFundraisers(); };

  // Build sections
  const standalone = fundraisers.filter(f => !f.opportunity);
  const fromOpportunities = fundraisers.filter(f => !!f.opportunity);

  const sections = [];
  if (standalone.length > 0 || fromOpportunities.length === 0) {
    sections.push({ title: 'Standalone Fundraisers', data: standalone });
  } else {
    sections.push({ title: 'Standalone Fundraisers', data: standalone });
  }
  sections.push({ title: 'From Volunteering Opportunities', data: fromOpportunities });

  const renderCard = ({ item }) => {
    const pct = item.targetAmount > 0
      ? Math.min(100, Math.round((item.collectedAmount / item.targetAmount) * 100))
      : 0;
    const sColor = statusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ManageMyFundraiser', { fundraiserId: item._id })}
        activeOpacity={0.85}
      >
        {/* Card top row */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardIconCircle}>
            <Ionicons name="cash-outline" size={22} color="#27ae60" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            {item.opportunity?.title ? (
              <Text style={styles.cardOppTitle} numberOfLines={1}>
                {item.opportunity.title}
              </Text>
            ) : item.description ? (
              <Text style={styles.cardOppTitle} numberOfLines={1}>{item.description}</Text>
            ) : (
              <Text style={styles.cardOppTitle}>Standalone fundraiser</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sColor }]}>
            <Text style={styles.statusBadgeText}>{statusLabel(item.status)}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, {
            width: `${pct}%`,
            backgroundColor: item.status === 'completed' ? '#888' : '#27ae60'
          }]} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Text style={styles.collectedText}>LKR {(item.collectedAmount || 0).toLocaleString()}</Text>
          <Text style={styles.targetText}> / {item.targetAmount.toLocaleString()} ({pct}%)</Text>
        </View>

        {/* Footer row */}
        <View style={styles.cardFooter}>
          <View style={styles.footerStat}>
            <Ionicons name="people-outline" size={14} color="#888" style={{ marginRight: 4 }} />
            <Text style={styles.footerStatText}>{item.donorCount || 0} donor{item.donorCount !== 1 ? 's' : ''}</Text>
          </View>
          {item.pendingCount > 0 && (
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={13} color="#f39c12" style={{ marginRight: 4 }} />
              <Text style={styles.pendingBadgeText}>{item.pendingCount} pending</Text>
            </View>
          )}
          <View style={styles.manageBtnRow}>
            <Text style={styles.manageBtnText}>Manage</Text>
            <Ionicons name="chevron-forward" size={15} color="#2e86de" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Ionicons
        name={section.title === 'Standalone Fundraisers' ? 'cash-outline' : 'heart-outline'}
        size={16}
        color="#555"
        style={{ marginRight: 6 }}
      />
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length}</Text>
    </View>
  );

  const renderSectionEmpty = (section) => {
    if (section.data.length > 0) return null;
    return (
      <View style={styles.sectionEmpty}>
        <Text style={styles.sectionEmptyText}>
          {section.title === 'Standalone Fundraisers'
            ? 'No standalone fundraisers yet.'
            : 'No fundraisers linked to opportunities.'}
        </Text>
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#27ae60" /></View>;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarTitle}>My Fundraisers</Text>
          <Text style={styles.topBarSub}>{fundraisers.length} total fundraiser{fundraisers.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateFundraiser')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.createBtnText}>Create New</Text>
        </TouchableOpacity>
      </View>

      {fundraisers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cash-outline" size={64} color="#ddd" />
          <Text style={styles.emptyTitle}>No Fundraisers Yet</Text>
          <Text style={styles.emptySubtitle}>Create your first standalone fundraiser or add one to an opportunity you created.</Text>
          <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => navigation.navigate('CreateFundraiser')}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.emptyCreateBtnText}>Create Fundraiser</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderCard}
          renderSectionHeader={renderSectionHeader}
          renderSectionFooter={({ section }) => renderSectionEmpty(section)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 15, paddingTop: 10 }}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  topBarTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  topBarSub: { fontSize: 12, color: '#999', marginTop: 2 },
  createBtn: {
    backgroundColor: '#27ae60',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2
  },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 10
  },
  sectionHeaderText: { fontSize: 14, fontWeight: 'bold', color: '#555', flex: 1 },
  sectionCount: {
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    color: '#2e86de',
    fontWeight: 'bold'
  },

  sectionEmpty: { paddingVertical: 12, alignItems: 'center' },
  sectionEmptyText: { color: '#bbb', fontSize: 13 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 3
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#d5f5e3',
    justifyContent: 'center',
    alignItems: 'center'
  },
  cardName: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  cardOppTitle: { fontSize: 12, color: '#888' },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  progressBg: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },

  statsRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 10 },
  collectedText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  targetText: { fontSize: 12, color: '#888' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerStat: { flexDirection: 'row', alignItems: 'center' },
  footerStatText: { fontSize: 12, color: '#888' },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  pendingBadgeText: { fontSize: 12, color: '#f39c12', fontWeight: '600' },
  manageBtnRow: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' },
  manageBtnText: { fontSize: 13, color: '#2e86de', fontWeight: 'bold', marginRight: 2 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyCreateBtn: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  emptyCreateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});

export default MyFundraisersScreen;
