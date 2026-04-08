import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';

const MEDAL = ['🥇', '🥈', '🥉'];

const ImpactScreen = ({ navigation }) => {
  const [points, setPoints] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const fetchData = async () => {
    try {
      const [ptRes, lbRes, histRes] = await Promise.all([
        api.get('/api/points/me'),
        api.get('/api/points/leaderboard'),
        api.get('/api/points/history')
      ]);
      setPoints(ptRes.data);
      setLeaderboard(lbRes.data);
      setHistory(histRes.data || []);
    } catch {
      Alert.alert('Error', 'Failed to load impact data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#9b59b6" /></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

      {/* Points Hero Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Your Total Points</Text>
        <Text style={styles.heroPoints}>{points?.total || 0}</Text>
        <Text style={styles.heroSubLabel}>pts</Text>
        <View style={styles.heroBreakdown}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeIcon}>⏱</Text>
            <Text style={styles.heroBadgeValue}>{points?.hoursPoints || 0}</Text>
            <Text style={styles.heroBadgeLabel}>from hours</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeIcon}>🤝</Text>
            <Text style={styles.heroBadgeValue}>{points?.donationPoints || 0}</Text>
            <Text style={styles.heroBadgeLabel}>from donations</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeIcon}>🎖️</Text>
            <Text style={styles.heroBadgeValue}>{points?.completionPoints || 0}</Text>
            <Text style={styles.heroBadgeLabel}>volunteers helped</Text>
          </View>
        </View>
      </View>

      {/* Clear stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{points?.totalHours || 0}</Text>
          <Text style={styles.statLabel}>⏱ Hours{'\n'}Verified</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue} numberOfLines={1}>LKR {(points?.totalDonated || 0).toLocaleString()}</Text>
          <Text style={styles.statLabel}>🤝 Total{'\n'}Donated</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{points?.completedVolunteers || 0}</Text>
          <Text style={styles.statLabel}>🎖️ Volunteers{'\n'}You Supported</Text>
        </View>
      </View>

      {/* How points work */}
      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>How Points Work</Text>
        <Text style={styles.rulesItem}>⏱  10 pts per verified contribution hour</Text>
        <Text style={styles.rulesItem}>🤝  1 pt per LKR 100 donated (confirmed)</Text>
        <Text style={styles.rulesItem}>🎖️  100 pts per volunteer you helped complete</Text>
      </View>

      {/* Action buttons */}
      <TouchableOpacity style={styles.volunteeringBtn} onPress={() => navigation.navigate('OngoingOpportunities')}>
        <View style={styles.volunteeringBtnLeft}>
          <Ionicons name="people-outline" size={28} color="#fff" />
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.volunteeringBtnTitle}>Active Volunteering</Text>
            <Text style={styles.volunteeringBtnSubtitle}>Log hours for ongoing opportunities</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.pastBtn} onPress={() => navigation.navigate('PastVolunteering')}>
        <View style={styles.volunteeringBtnLeft}>
          <Ionicons name="checkmark-circle-outline" size={28} color="#9b59b6" />
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.pastBtnTitle}>Past Volunteering</Text>
            <Text style={styles.pastBtnSubtitle}>View completed opportunities</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#9b59b6" />
      </TouchableOpacity>

      {/* Points History */}
      <View style={styles.historyCard}>
        <TouchableOpacity style={styles.historyHeader} onPress={() => setShowHistory(v => !v)}>
          <View>
            <Text style={styles.historyTitle}>📊 Points History</Text>
            <Text style={styles.historySub}>{history.length} events</Text>
          </View>
          <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={20} color="#555" />
        </TouchableOpacity>

        {showHistory && (
          history.length === 0 ? (
            <Text style={styles.noDataText}>No history yet — start volunteering!</Text>
          ) : (
            history.map((item, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyIcon}>{item.icon}</Text>
                <Text style={styles.historyLabel} numberOfLines={2}>{item.label}</Text>
                <View style={styles.historyPoints}>
                  <Text style={styles.historyPtsText}>+{item.points}</Text>
                </View>
              </View>
            ))
          )
        )}
      </View>

      {/* Leaderboard */}
      <View style={styles.leaderboardCard}>
        <View style={styles.leaderboardHeader}>
          <Text style={styles.leaderboardTitle}>🏆 Leaderboard</Text>
          <Text style={styles.leaderboardSub}>Top contributors</Text>
        </View>

        {leaderboard?.top5?.length === 0 ? (
          <Text style={styles.noDataText}>No data yet — be the first!</Text>
        ) : (
          leaderboard?.top5?.map((entry, i) => (
            <View key={entry.userId} style={[styles.lbRow, i === 0 && styles.lbRowFirst]}>
              <Text style={styles.lbMedal}>{i < 3 ? MEDAL[i] : `#${entry.rank}`}</Text>
              <Text style={styles.lbName} numberOfLines={1}>{entry.name}</Text>
              <View style={styles.lbPointsBadge}>
                <Text style={styles.lbPoints}>{entry.points} pts</Text>
              </View>
            </View>
          ))
        )}

        {leaderboard && leaderboard.myRank > 5 && (
          <>
            <View style={styles.lbDivider}><Text style={styles.lbDividerText}>• • •</Text></View>
            <View style={[styles.lbRow, styles.lbRowMe]}>
              <Text style={styles.lbMedal}>#{leaderboard.myRank}</Text>
              <Text style={styles.lbName}>You</Text>
              <View style={styles.lbPointsBadge}><Text style={styles.lbPoints}>{leaderboard.myPoints} pts</Text></View>
            </View>
          </>
        )}

        {leaderboard && leaderboard.myRank <= 5 && (
          <View style={styles.lbYouIndicator}>
            <Text style={styles.lbYouText}>🎉 You're in the top {leaderboard.myRank === 1 ? '1' : leaderboard.myRank}!</Text>
          </View>
        )}
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  heroCard: { backgroundColor: '#9b59b6', padding: 24, alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 6 },
  heroPoints: { color: '#fff', fontSize: 56, fontWeight: 'bold', lineHeight: 60 },
  heroSubLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 20 },
  heroBreakdown: { flexDirection: 'row', gap: 10 },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 12, alignItems: 'center', minWidth: 88 },
  heroBadgeIcon: { fontSize: 20, marginBottom: 4 },
  heroBadgeValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  heroBadgeLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 2, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 8, padding: 15, paddingBottom: 0 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 14, fontWeight: 'bold', color: '#9b59b6', textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 4, textAlign: 'center', lineHeight: 14 },

  rulesCard: { margin: 15, marginBottom: 0, backgroundColor: '#f8f4ff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0d0f0' },
  rulesTitle: { fontSize: 14, fontWeight: 'bold', color: '#9b59b6', marginBottom: 8 },
  rulesItem: { fontSize: 13, color: '#555', marginBottom: 4 },

  volunteeringBtn: { marginHorizontal: 15, marginTop: 15, backgroundColor: '#2e86de', borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 4 },
  volunteeringBtnLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  volunteeringBtnTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  volunteeringBtnSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  pastBtn: { marginHorizontal: 15, marginTop: 10, backgroundColor: '#f8f4ff', borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2, borderWidth: 1, borderColor: '#e0d0f0' },
  pastBtnTitle: { color: '#9b59b6', fontSize: 17, fontWeight: 'bold' },
  pastBtnSubtitle: { color: '#aaa', fontSize: 12, marginTop: 2 },

  historyCard: { margin: 15, marginTop: 15, backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  historySub: { fontSize: 12, color: '#888', marginTop: 2 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 10 },
  historyIcon: { fontSize: 20, width: 28 },
  historyLabel: { flex: 1, fontSize: 13, color: '#444' },
  historyPoints: { backgroundColor: '#f8f4ff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  historyPtsText: { color: '#9b59b6', fontWeight: 'bold', fontSize: 13 },

  leaderboardCard: { margin: 15, marginTop: 0, backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 3, marginBottom: 30 },
  leaderboardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  leaderboardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  leaderboardSub: { fontSize: 12, color: '#888' },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 10 },
  lbRowFirst: { backgroundColor: '#fffbf0', borderRadius: 10, paddingHorizontal: 8 },
  lbRowMe: { backgroundColor: '#f8f4ff', borderRadius: 10, paddingHorizontal: 8 },
  lbMedal: { fontSize: 22, width: 40, textAlign: 'center' },
  lbName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#333' },
  lbPointsBadge: { backgroundColor: '#9b59b6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  lbPoints: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  lbDivider: { alignItems: 'center', paddingVertical: 6 },
  lbDividerText: { color: '#ccc', fontSize: 16, letterSpacing: 4 },
  lbYouIndicator: { backgroundColor: '#f0fff4', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 },
  lbYouText: { color: '#27ae60', fontWeight: 'bold', fontSize: 14 },
  noDataText: { color: '#999', textAlign: 'center', padding: 20 }
});

export default ImpactScreen;
