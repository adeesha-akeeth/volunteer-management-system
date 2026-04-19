import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Modal, TextInput, Platform, KeyboardAvoidingView, Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';

const MEDAL = ['🥇', '🥈', '🥉'];

const PRESETS = [
  { points: 100, bonus: 10 },
  { points: 200, bonus: 20 },
  { points: 300, bonus: 30 },
  { points: 500, bonus: 50 },
  { points: 1000, bonus: 100 }
];

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

// ── Goal progress card ───────────────────────────────────────────────────────
const GoalCard = ({ goal, onEdit, onDelete }) => {
  const pct = Math.round((goal.progress || 0) * 100);
  const isComplete = goal.status === 'completed';
  const isOverdue = goal.status === 'overdue';

  const barColor = isComplete ? '#27ae60' : isOverdue ? '#e74c3c' : '#2e86de';

  return (
    <View style={[gStyles.card, isComplete && gStyles.cardDone, isOverdue && gStyles.cardOverdue]}>
      <View style={gStyles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={gStyles.title} numberOfLines={1}>{goal.title}</Text>
          <Text style={gStyles.dates}>{fmt(goal.startDate)} → {fmt(goal.endDate)}</Text>
        </View>
        {isComplete ? (
          <View style={gStyles.doneBadge}>
            <Text style={gStyles.doneBadgeText}>+{goal.bonusPoints} pts</Text>
          </View>
        ) : isOverdue ? (
          <View style={gStyles.overdueBadge}>
            <Ionicons name="hourglass-outline" size={12} color="#e74c3c" style={{ marginRight: 3 }} />
            <Text style={gStyles.overdueBadgeText}>Overdue</Text>
          </View>
        ) : (
          <View style={gStyles.actions}>
            <TouchableOpacity onPress={() => onEdit(goal)} style={gStyles.iconBtn}>
              <Ionicons name="pencil-outline" size={16} color="#9b59b6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(goal._id)} style={gStyles.iconBtn}>
              <Ionicons name="trash-outline" size={16} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={gStyles.barBg}>
        <View style={[gStyles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      <View style={gStyles.barRow}>
        <Text style={gStyles.gained}>{goal.gained} / {goal.targetPoints} pts</Text>
        <Text style={[gStyles.pct, isComplete && { color: '#27ae60' }, isOverdue && { color: '#e74c3c' }]}>
          {pct}%{isComplete ? ' ✓' : isOverdue ? ' ✗' : ''}
        </Text>
      </View>
    </View>
  );
};

// ── Main Screen ──────────────────────────────────────────────────────────────
const ImpactScreen = ({ navigation }) => {
  const toast = useToast();
  const confirm = useConfirm();

  const [points, setPoints] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [history, setHistory] = useState([]);
  const [goals, setGoals] = useState([]);
  const [pendingContribs, setPendingContribs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Goal modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null); // null = create
  const [gTitle, setGTitle] = useState('');
  const [gPreset, setGPreset] = useState(null);
  const [gStartDate, setGStartDate] = useState(null);
  const [gEndDate, setGEndDate] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('end');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [ptRes, lbRes, histRes, goalsRes, contribRes] = await Promise.all([
        api.get('/api/points/me'),
        api.get('/api/points/leaderboard'),
        api.get('/api/points/history'),
        api.get('/api/goals/my'),
        api.get('/api/contributions/my')
      ]);
      setPoints(ptRes.data);
      setLeaderboard(lbRes.data);
      setHistory(histRes.data || []);
      setGoals(goalsRes.data || []);
      const allContribs = contribRes.data || [];
      setPendingContribs(allContribs.filter(c => c.status === 'pending'));
    } catch {
      toast.error('Error', 'Failed to load impact data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // ── Goal modal helpers ───────────────────────────────────────────────────
  const openCreate = () => {
    setEditingGoal(null);
    setGTitle('');
    setGPreset(null);
    setGStartDate(today());
    setGEndDate(null);
    setModalVisible(true);
  };

  const openEdit = (goal) => {
    setEditingGoal(goal);
    setGTitle(goal.title);
    setGPreset(PRESETS.find(p => p.points === goal.targetPoints) || null);
    setGStartDate(new Date(goal.startDate));
    setGEndDate(new Date(goal.endDate));
    setModalVisible(true);
  };

  const closeModal = () => { setModalVisible(false); setEditingGoal(null); };

  const onDateChange = (event, selected) => {
    setShowPicker(Platform.OS === 'ios');
    if (event.type === 'dismissed') return;
    if (selected) {
      if (pickerTarget === 'start') setGStartDate(selected);
      else setGEndDate(selected);
    }
  };

  const handleSubmit = async () => {
    if (!gTitle.trim()) { toast.error('Required', 'Please enter a goal title'); return; }
    if (!gPreset) { toast.error('Required', 'Please choose a points target'); return; }
    if (!gEndDate) { toast.error('Required', 'Please pick an end date'); return; }
    if (editingGoal && gStartDate && gEndDate && gStartDate >= gEndDate) {
      toast.error('Invalid Dates', 'End date must be after start date'); return;
    }

    setSubmitting(true);
    try {
      if (editingGoal) {
        const res = await api.put(`/api/goals/${editingGoal._id}`, {
          title: gTitle.trim(),
          targetPoints: gPreset.points,
          startDate: gStartDate?.toISOString(),
          endDate: gEndDate.toISOString()
        });
        setGoals(prev => prev.map(g => g._id === editingGoal._id ? res.data : g));
      } else {
        const res = await api.post('/api/goals', {
          title: gTitle.trim(),
          targetPoints: gPreset.points,
          startDate: (gStartDate || today()).toISOString(),
          endDate: gEndDate.toISOString()
        });
        setGoals(prev => [res.data, ...prev]);
      }
      closeModal();
      toast.success('Saved', editingGoal ? 'Goal updated!' : 'Goal created!');
    } catch (e) {
      toast.error('Error', e.response?.data?.message || 'Failed to save goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    confirm.show({
      title: 'Delete Goal',
      message: 'Delete this goal? This cannot be undone.',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/goals/${id}`);
          setGoals(prev => prev.filter(g => g._id !== id));
          toast.success('Deleted', 'Goal removed');
        } catch {
          toast.error('Error', 'Failed to delete goal');
        }
      }
    });
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#9b59b6" /></View>;

  const activeGoals = goals.filter(g => g.status === 'active');
  const doneGoals = goals.filter(g => g.status === 'completed');

  return (
    <>
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* ── Points Hero ── */}
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
              <Text style={styles.heroBadgeLabel}>completion</Text>
            </View>
            {(points?.goalBonusPoints || 0) > 0 && (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeIcon}>🎯</Text>
                <Text style={styles.heroBadgeValue}>{points.goalBonusPoints}</Text>
                <Text style={styles.heroBadgeLabel}>goal bonus</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{points?.totalHours || 0}</Text>
            <Text style={styles.statLabel}>⏱ Hours{'\n'}Verified</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{points?.completedCount || 0}</Text>
            <Text style={styles.statLabel}>🎖️ Completed{'\n'}Opps</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#27ae60' }]}>{doneGoals.length}</Text>
            <Text style={styles.statLabel}>🎯 Goals{'\n'}Achieved</Text>
          </View>
        </View>

        {/* ── How points work ── */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>How Points Work</Text>
          <Text style={styles.rulesItem}>⏱  <Text style={styles.rulesBold}>10 pts</Text> per verified contribution hour</Text>
          <Text style={styles.rulesItem}>🎖️  <Text style={styles.rulesBold}>300 pts</Text> when marked completed by publisher</Text>
          <Text style={styles.rulesItem}>🎯  <Text style={styles.rulesBold}>Bonus pts</Text> for achieving your personal goals</Text>
        </View>

        {/* ── Goals Section ── */}
        <View style={styles.goalsCard}>
          <View style={styles.goalsHeader}>
            <View>
              <Text style={styles.goalsTitle}>🎯 My Goals</Text>
              <Text style={styles.goalsSub}>{activeGoals.length} active · {doneGoals.length} completed</Text>
            </View>
            <TouchableOpacity style={styles.newGoalBtn} onPress={openCreate}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.newGoalBtnText}>New Goal</Text>
            </TouchableOpacity>
          </View>

          {goals.length === 0 ? (
            <View style={styles.emptyGoals}>
              <Text style={styles.emptyGoalsIcon}>🎯</Text>
              <Text style={styles.emptyGoalsText}>No goals yet</Text>
              <Text style={styles.emptyGoalsSub}>Set a goal and earn bonus points when you hit it!</Text>
            </View>
          ) : (
            <>
              {activeGoals.map(g => (
                <GoalCard key={g._id} goal={g} onEdit={openEdit} onDelete={handleDelete} />
              ))}
              {doneGoals.length > 0 && (
                <>
                  <Text style={styles.goalsDivider}>Completed</Text>
                  {doneGoals.map(g => (
                    <GoalCard key={g._id} goal={g} onEdit={openEdit} onDelete={handleDelete} />
                  ))}
                </>
              )}
            </>
          )}
        </View>

        {/* ── Log Contributions button ── */}
        <TouchableOpacity style={styles.logBtn} onPress={() => navigation.navigate('OngoingOpportunities')}>
          <Ionicons name="time-outline" size={20} color="#27ae60" style={{ marginRight: 10 }} />
          <Text style={styles.logBtnTitle}>Log Contribution Hours</Text>
          <Ionicons name="chevron-forward" size={18} color="#27ae60" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* ── Points History ── */}
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

        {/* ── Pending Contributions ── */}
        {pendingContribs.length > 0 && (
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>⏳ Pending Contributions</Text>
              <Text style={styles.historySub}>{pendingContribs.length} awaiting verification</Text>
            </View>
            {pendingContribs.map((item, i) => (
              <View key={item._id} style={[styles.historyRow, i === pendingContribs.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={styles.historyIcon}>⏱</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyLabel} numberOfLines={2}>
                    {item.hours}h — {item.opportunity?.title || 'Unknown opportunity'}
                  </Text>
                  <Text style={styles.historyDate}>{new Date(item.createdAt).toDateString()}</Text>
                </View>
                <View style={[styles.historyPoints, { backgroundColor: '#fff3cd' }]}>
                  <Text style={[styles.historyPtsText, { color: '#856404' }]}>~{item.hours * 10} pts</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Leaderboard ── */}
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

      {/* ── Goal Create / Edit Modal ── */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeModal} />
          <View style={styles.modalBox} pointerEvents="box-none">
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingGoal ? 'Edit Goal' : 'Set New Goal'}</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={styles.mLabel}>Goal Title</Text>
              <TextInput
                style={styles.mInput}
                placeholder="e.g. Volunteer 50 hours this month"
                placeholderTextColor="#bbb"
                value={gTitle}
                onChangeText={setGTitle}
              />

              {/* Preset selector */}
              <Text style={styles.mLabel}>Points Target</Text>
              <View style={styles.presetGrid}>
                {PRESETS.map(p => (
                  <TouchableOpacity
                    key={p.points}
                    style={[styles.presetBtn, gPreset?.points === p.points && styles.presetBtnActive]}
                    onPress={() => setGPreset(p)}
                  >
                    <Text style={[styles.presetPts, gPreset?.points === p.points && styles.presetPtsActive]}>
                      {p.points} pts
                    </Text>
                    <Text style={[styles.presetBonus, gPreset?.points === p.points && styles.presetBonusActive]}>
                      +{p.bonus} bonus
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {gPreset && (
                <View style={styles.presetHint}>
                  <Ionicons name="information-circle-outline" size={15} color="#9b59b6" />
                  <Text style={styles.presetHintText}>
                    Earn <Text style={{ fontWeight: 'bold' }}>{gPreset.points} pts</Text> after creating this goal to receive <Text style={{ fontWeight: 'bold' }}>+{gPreset.bonus} bonus pts</Text>
                  </Text>
                </View>
              )}

              {/* Start date (edit only) */}
              {editingGoal && (
                <>
                  <Text style={styles.mLabel}>Start Date</Text>
                  <TouchableOpacity style={styles.datePicker} onPress={() => { setPickerTarget('start'); setShowPicker(true); }}>
                    <Ionicons name="calendar-outline" size={16} color="#9b59b6" style={{ marginRight: 8 }} />
                    <Text style={styles.datePickerText}>{gStartDate ? fmt(gStartDate) : 'Select date'}</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* End date */}
              <Text style={styles.mLabel}>End Date</Text>
              <TouchableOpacity style={styles.datePicker} onPress={() => { setPickerTarget('end'); setShowPicker(true); }}>
                <Ionicons name="calendar-outline" size={16} color="#9b59b6" style={{ marginRight: 8 }} />
                <Text style={styles.datePickerText}>{gEndDate ? fmt(gEndDate) : 'Select target date'}</Text>
              </TouchableOpacity>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.submitBtnText}>{editingGoal ? 'Save Changes' : 'Create Goal'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date picker */}
      {showPicker && (
        <DateTimePicker
          value={pickerTarget === 'start' ? (gStartDate || today()) : (gEndDate || today())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={today()}
        />
      )}
    </>
  );
};

// ── GoalCard styles ──────────────────────────────────────────────────────────
const gStyles = StyleSheet.create({
  card: { backgroundColor: '#f8f4ff', borderRadius: 12, padding: 13, marginBottom: 10, borderWidth: 1, borderColor: '#e8d5f5' },
  cardDone: { backgroundColor: '#f0fff4', borderColor: '#b7e4c7' },
  cardOverdue: { backgroundColor: '#fff5f5', borderColor: '#f5c6c6', borderLeftWidth: 3, borderLeftColor: '#e74c3c' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  title: { fontSize: 14, fontWeight: 'bold', color: '#333', flex: 1 },
  dates: { fontSize: 11, color: '#999', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
  iconBtn: { padding: 4 },
  doneBadge: { backgroundColor: '#27ae60', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  doneBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  overdueBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffeaea', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#f5c6c6' },
  overdueBadgeText: { color: '#e74c3c', fontSize: 12, fontWeight: 'bold' },
  barBg: { height: 8, backgroundColor: '#e0d0f0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#9b59b6', borderRadius: 4 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  gained: { fontSize: 11, color: '#777' },
  pct: { fontSize: 11, fontWeight: 'bold', color: '#9b59b6' }
});

// ── Screen styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  heroCard: { backgroundColor: '#9b59b6', padding: 24, alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 6 },
  heroPoints: { color: '#fff', fontSize: 56, fontWeight: 'bold', lineHeight: 60 },
  heroSubLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 20 },
  heroBreakdown: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, padding: 12, alignItems: 'center', minWidth: 90 },
  heroBadgeIcon: { fontSize: 20, marginBottom: 3 },
  heroBadgeValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  heroBadgeLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 2, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 10, padding: 15, paddingBottom: 0 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#9b59b6', textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 4, textAlign: 'center', lineHeight: 15 },

  rulesCard: { margin: 15, marginBottom: 0, backgroundColor: '#f8f4ff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e0d0f0' },
  rulesTitle: { fontSize: 12, fontWeight: 'bold', color: '#9b59b6', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  rulesItem: { fontSize: 13, color: '#555', marginBottom: 5 },
  rulesBold: { fontWeight: 'bold', color: '#333' },

  goalsCard: { margin: 15, marginTop: 12, backgroundColor: '#fff', borderRadius: 14, padding: 15, elevation: 2 },
  goalsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  goalsTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  goalsSub: { fontSize: 11, color: '#999', marginTop: 2 },
  newGoalBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#9b59b6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, gap: 4 },
  newGoalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  emptyGoals: { alignItems: 'center', paddingVertical: 20 },
  emptyGoalsIcon: { fontSize: 32, marginBottom: 6 },
  emptyGoalsText: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  emptyGoalsSub: { fontSize: 12, color: '#999', marginTop: 4, textAlign: 'center' },
  goalsDivider: { fontSize: 11, fontWeight: 'bold', color: '#27ae60', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6, marginBottom: 8 },

  logBtn: { marginHorizontal: 15, marginTop: 0, backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 2, borderWidth: 1.5, borderColor: '#27ae60' },
  logBtnTitle: { color: '#27ae60', fontSize: 15, fontWeight: 'bold' },

  historyCard: { margin: 15, marginTop: 12, backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  historySub: { fontSize: 12, color: '#888' },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', gap: 10 },
  historyIcon: { fontSize: 20, width: 28 },
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
  noDataText: { color: '#999', textAlign: 'center', padding: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: '#fff', borderRadius: 18, width: '100%', maxHeight: '85%', paddingBottom: 10, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  mLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 14, marginBottom: 6, marginHorizontal: 16 },
  mInput: { marginHorizontal: 16, borderWidth: 1.5, borderColor: '#e0d0f0', borderRadius: 10, padding: 12, fontSize: 14, color: '#333', backgroundColor: '#faf8ff' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  presetBtn: { flex: 1, minWidth: '28%', borderRadius: 10, borderWidth: 1.5, borderColor: '#e0d0f0', padding: 10, alignItems: 'center', backgroundColor: '#faf8ff' },
  presetBtnActive: { borderColor: '#9b59b6', backgroundColor: '#9b59b6' },
  presetPts: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  presetPtsActive: { color: '#fff' },
  presetBonus: { fontSize: 11, color: '#999', marginTop: 2 },
  presetBonusActive: { color: 'rgba(255,255,255,0.8)' },
  presetHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginHorizontal: 16, marginTop: 10, backgroundColor: '#f8f4ff', borderRadius: 8, padding: 10 },
  presetHintText: { flex: 1, fontSize: 12, color: '#666', lineHeight: 17 },
  datePicker: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e0d0f0', borderRadius: 10, padding: 12, backgroundColor: '#faf8ff' },
  datePickerText: { fontSize: 14, color: '#333' },
  submitBtn: { margin: 16, marginTop: 20, backgroundColor: '#9b59b6', borderRadius: 12, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});

export default ImpactScreen;
