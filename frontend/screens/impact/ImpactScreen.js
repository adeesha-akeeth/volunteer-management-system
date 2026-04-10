import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import api from '../../api';

const MEDAL = ['🥇', '🥈', '🥉'];

const ImpactScreen = ({ navigation }) => {
  const toast = useToast();
  const [points, setPoints] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      toast.error('Error', 'Failed to load impact data');
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
            <Text style={styles.heroBadgeIcon}>🎖️</Text>
            <Text style={styles.heroBadgeValue}>{points?.completionPoints || 0}</Text>
            <Text style={styles.heroBadgeLabel}>completion bonus</Text>
          </View>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{points?.totalHours || 0}</Text>
          <Text style={styles.statLabel}>⏱ Hours{'\n'}Verified</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{points?.completedCount || 0}</Text>
          <Text style={styles.statLabel}>🎖️ Completed{'\n'}Opportunities</Text>
        </View>
      </View>

      {/* How points work */}
      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>How Points Work</Text>
        <Text style={styles.rulesItem}>⏱  <Text style={styles.rulesBold}>10 pts</Text> per verified contribution hour</Text>
        <Text style={styles.rulesItem}>🎖️  <Text style={styles.rulesBold}>300 pts</Text> when marked as completed by publisher</Text>
      </View>

      {/* Log Contributions button — prominent CTA */}
      <TouchableOpacity style={styles.logBtn} onPress={() => navigation.navigate('OngoingOpportunities')}>
        <View style={styles.logBtnLeft}>
          <View style={styles.logBtnIconCircle}>
            <Ionicons name="add" size={28} color="#fff" />
          </View>
          <View style={{ marginLeft: 14 }}>
            <Text style={styles.logBtnTitle}>Log Contribution Hours</Text>
            <Text style={styles.logBtnSubtitle}>Submit hours for verification & earn points</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>

      {/* Points History — always visible */}
      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>📊 Points History</Text>
          <Text style={styles.historySub}>{history.length} event{history.length !== 1 ? 's' : ''}</Text>
        </View>

        {history.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyHistoryIcon}>🌱</Text>
            <Text style={styles.emptyHistoryText}>No points yet</Text>
            <Text style={styles.emptyHistorySub}>Start volunteering to earn points!</Text>
          </View>
        ) : (
          history.map((item, i) => (
            <View key={i} style={[styles.historyRow, i === history.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.historyIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyLabel} numberOfLines={2}>{item.label}</Text>
                <Text style={styles.historyDate}>{new Date(item.date).toDateString()}</Text>
              </View>
              <View style={styles.historyPoints}>
                <Text style={styles.historyPtsText}>+{item.points} pts</Text>
              </View>
            </View>
          ))
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
  heroBreakdown: { flexDirection: 'row', gap: 14 },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: 14, alignItems: 'center', minWidth: 110 },
  heroBadgeIcon: { fontSize: 22, marginBottom: 4 },
  heroBadgeValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  heroBadgeLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 10, padding: 15, paddingBottom: 0 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#9b59b6', textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center', lineHeight: 16 },

  rulesCard: { margin: 15, marginBottom: 0, backgroundColor: '#f8f4ff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e0d0f0' },
  rulesTitle: { fontSize: 13, fontWeight: 'bold', color: '#9b59b6', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  rulesItem: { fontSize: 13, color: '#555', marginBottom: 5 },
  rulesBold: { fontWeight: 'bold', color: '#333' },

  logBtn: { marginHorizontal: 15, marginTop: 15, backgroundColor: '#27ae60', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 4 },
  logBtnLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logBtnIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  logBtnTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  logBtnSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },

  historyCard: { margin: 15, marginTop: 15, backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  historySub: { fontSize: 12, color: '#888' },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 10 },
  historyIcon: { fontSize: 22, width: 30 },
  historyLabel: { flex: 1, fontSize: 13, color: '#444', lineHeight: 18 },
  historyDate: { fontSize: 10, color: '#aaa', marginTop: 2 },
  historyPoints: { backgroundColor: '#f8f4ff', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  historyPtsText: { color: '#9b59b6', fontWeight: 'bold', fontSize: 13 },
  emptyHistory: { alignItems: 'center', paddingVertical: 24 },
  emptyHistoryIcon: { fontSize: 36, marginBottom: 8 },
  emptyHistoryText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  emptyHistorySub: { fontSize: 13, color: '#999', marginTop: 4 },

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
