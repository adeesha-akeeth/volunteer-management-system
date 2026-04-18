import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/Toast';
import api from '../../api';

const AdminAnalysisScreen = () => {
  const t = useTheme();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    try {
      const res = await api.get('/api/admin/stats');
      setStats(res.data);
    } catch {
      toast.error('Error', 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetch(); }, []));
  const onRefresh = () => { setRefreshing(true); fetch(); };

  const s = makeStyles(t);

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={t.accent} /></View>;

  const StatBox = ({ icon, label, value, color }) => (
    <View style={[s.statBox, { borderLeftColor: color || t.accent }]}>
      <Ionicons name={icon} size={22} color={color || t.accent} style={{ marginBottom: 6 }} />
      <Text style={s.statValue}>{value ?? '—'}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  const SectionCard = ({ title, icon, children }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Ionicons name={icon} size={18} color={t.accent} style={{ marginRight: 8 }} />
        <Text style={s.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}>

      {/* Hero */}
      <View style={s.hero}>
        <Text style={s.heroTitle}>Platform Overview</Text>
        <Text style={s.heroSub}>Real-time Kind Hands analytics</Text>
      </View>

      {/* Quick stats */}
      <View style={s.grid}>
        <StatBox icon="people-outline" label="Total Users" value={stats?.users} color={t.accent} />
        <StatBox icon="briefcase-outline" label="Open Opportunities" value={stats?.opportunities?.open} color={t.success} />
        <StatBox icon="document-text-outline" label="Total Applications" value={stats?.applications?.total} color={t.purple} />
        <StatBox icon="hourglass-outline" label="Pending Applications" value={stats?.applications?.pending} color={t.warning} />
        <StatBox icon="checkmark-circle-outline" label="Verified Contributions" value={stats?.contributions?.verified} color={t.success} />
        <StatBox icon="chatbubble-outline" label="Pending Feedbacks" value={stats?.feedbacks?.pending} color={t.danger} />
      </View>

      {/* Points generated */}
      <SectionCard title="Points Generated" icon="trophy-outline">
        <View style={s.ptsRow}>
          <View style={s.ptsBox}>
            <Text style={[s.ptsValue, { color: t.success }]}>{stats?.points?.today ?? 0}</Text>
            <Text style={s.ptsLabel}>Today</Text>
          </View>
          <View style={[s.ptsDivider, { backgroundColor: t.border }]} />
          <View style={s.ptsBox}>
            <Text style={[s.ptsValue, { color: t.accent }]}>{stats?.points?.thisWeek ?? 0}</Text>
            <Text style={s.ptsLabel}>This Week</Text>
          </View>
          <View style={[s.ptsDivider, { backgroundColor: t.border }]} />
          <View style={s.ptsBox}>
            <Text style={[s.ptsValue, { color: t.purple }]}>{stats?.points?.allTime ?? 0}</Text>
            <Text style={s.ptsLabel}>All Time</Text>
          </View>
        </View>
      </SectionCard>

      {/* Opportunities */}
      <SectionCard title="Opportunities" icon="earth-outline">
        <View style={s.row}>
          <View style={s.inlineBox}>
            <Text style={[s.inlineVal, { color: t.success }]}>{stats?.opportunities?.open}</Text>
            <Text style={s.inlineLbl}>Open</Text>
          </View>
          <View style={s.inlineBox}>
            <Text style={[s.inlineVal, { color: t.textSub }]}>{stats?.opportunities?.total}</Text>
            <Text style={s.inlineLbl}>Total</Text>
          </View>
          <View style={s.inlineBox}>
            <Text style={[s.inlineVal, { color: t.danger }]}>
              {(stats?.opportunities?.total || 0) - (stats?.opportunities?.open || 0)}
            </Text>
            <Text style={s.inlineLbl}>Closed</Text>
          </View>
        </View>
      </SectionCard>

      {/* Feedback summary */}
      <SectionCard title="Feedback & Queries" icon="mail-outline">
        <View style={s.row}>
          <View style={s.inlineBox}>
            <Text style={[s.inlineVal, { color: t.warning }]}>{stats?.feedbacks?.pending}</Text>
            <Text style={s.inlineLbl}>Pending</Text>
          </View>
          <View style={s.inlineBox}>
            <Text style={[s.inlineVal, { color: t.success }]}>
              {(stats?.feedbacks?.total || 0) - (stats?.feedbacks?.pending || 0)}
            </Text>
            <Text style={s.inlineLbl}>Replied</Text>
          </View>
          <View style={s.inlineBox}>
            <Text style={[s.inlineVal, { color: t.textSub }]}>{stats?.feedbacks?.total}</Text>
            <Text style={s.inlineLbl}>Total</Text>
          </View>
        </View>
      </SectionCard>

    </ScrollView>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  hero: {
    backgroundColor: t.bgCard, borderBottomWidth: 1, borderBottomColor: t.border,
    padding: 20, paddingTop: 24
  },
  heroTitle: { fontSize: 22, fontWeight: 'bold', color: t.text },
  heroSub: { fontSize: 13, color: t.textMuted, marginTop: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10 },
  statBox: {
    flex: 1, minWidth: '44%', backgroundColor: t.bgCard, borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderWidth: 1, borderColor: t.border
  },
  statValue: { fontSize: 24, fontWeight: 'bold', color: t.text },
  statLabel: { fontSize: 11, color: t.textMuted, marginTop: 2 },
  card: {
    marginHorizontal: 14, marginBottom: 12, backgroundColor: t.bgCard,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: t.border
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: t.text },
  ptsRow: { flexDirection: 'row', alignItems: 'center' },
  ptsBox: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  ptsValue: { fontSize: 26, fontWeight: 'bold' },
  ptsLabel: { fontSize: 11, color: t.textMuted, marginTop: 3 },
  ptsDivider: { width: 1, height: 50, marginHorizontal: 4 },
  row: { flexDirection: 'row' },
  inlineBox: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  inlineVal: { fontSize: 22, fontWeight: 'bold', color: t.text },
  inlineLbl: { fontSize: 11, color: t.textMuted, marginTop: 2 },
});

export default AdminAnalysisScreen;
