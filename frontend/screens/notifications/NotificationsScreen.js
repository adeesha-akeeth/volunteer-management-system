import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';

const getTypeInfo = (t) => ({
  application_status:     { name: 'document-text-outline',      color: t.accent },
  new_application:        { name: 'person-add-outline',          color: t.success },
  donation_status:        { name: 'cash-outline',                color: t.warning },
  donation_received:      { name: 'wallet-outline',              color: t.success },
  contribution_received:  { name: 'time-outline',                color: t.purple },
  contribution_status:    { name: 'checkmark-circle-outline',    color: t.success },
  comment_reply:          { name: 'chatbubble-outline',          color: t.accent },
  comment_like:           { name: 'thumbs-up-outline',           color: t.warning },
  follow_new_opportunity: { name: 'star-outline',                color: t.warning },
  opportunity_comment:    { name: 'chatbubbles-outline',         color: t.purple },
  opportunity_vote:       { name: 'heart-outline',               color: t.danger },
  publisher_review:       { name: 'chatbubble-ellipses-outline', color: t.accent },
  publisher_rating:       { name: 'star-outline',                color: t.warning },
  publisher_vote:         { name: 'thumbs-up-outline',           color: t.success },
  goal_complete:          { name: 'trophy-outline',              color: t.success },
  goal_overdue:           { name: 'hourglass-outline',           color: t.danger },
  feedback_reply:         { name: 'mail-outline',                color: t.accent },
  new_feedback:           { name: 'chatbubble-ellipses-outline', color: t.warning },
});

const NotificationsScreen = ({ navigation }) => {
  const toast = useToast();
  const t = useTheme();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'admin';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data.notifications || []);
    } catch {
      toast.error('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const markRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const handlePress = (notification) => {
    if (!notification.read) markRead(notification._id);
    const relId = notification.relatedId;

    switch (notification.type) {
      case 'application_status':
        if (relId) navigation.navigate('OpportunityDetail', { opportunityId: relId });
        else navigation.getParent()?.navigate('Profile', { screen: 'MyApplications' });
        break;
      case 'new_application':
        if (relId) navigation.navigate('ManageApplications', { opportunityId: relId });
        break;
      case 'donation_received':
        navigation.getParent()?.navigate('Donations', { screen: 'MyFundraisers' });
        break;
      case 'contribution_received':
        navigation.getParent()?.navigate('Profile', { screen: 'AllContributions' });
        break;
      case 'contribution_status':
        navigation.getParent()?.navigate('Impact', { screen: 'ImpactMain' });
        break;
      case 'donation_status':
        navigation.getParent()?.navigate('Donations', { screen: 'MyDonations' });
        break;
      case 'follow_new_opportunity':
        if (relId) navigation.navigate('OpportunityDetail', { opportunityId: relId });
        break;
      case 'comment_reply':
      case 'comment_like':
      case 'opportunity_comment':
      case 'opportunity_vote':
        if (relId) navigation.navigate('OpportunityDetail', { opportunityId: relId });
        break;
      case 'publisher_review':
      case 'publisher_rating':
      case 'publisher_vote':
        if (relId) navigation.navigate('PublisherProfile', { publisherId: relId.toString() });
        break;
      case 'goal_complete':
      case 'goal_overdue':
        navigation.getParent()?.navigate('Impact', { screen: 'ImpactMain' });
        break;
      case 'feedback_reply':
        if (isAdmin) navigation.navigate('AdminFeedback');
        else navigation.getParent()?.navigate('Profile', { screen: 'Feedback' });
        break;
      case 'new_feedback':
        navigation.navigate('AdminFeedback');
        break;
      default:
        break;
    }
  };

  const s = makeStyles(t);
  const TYPE_INFO = getTypeInfo(t);
  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={t.accent} /></View>;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={s.container}>
      {unreadCount > 0 && (
        <TouchableOpacity style={s.markAllBtn} onPress={markAllRead}>
          <Ionicons name="checkmark-done-outline" size={16} color={t.accent} style={{ marginRight: 5 }} />
          <Text style={s.markAllText}>Mark all as read ({unreadCount})</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="notifications-off-outline" size={60} color={t.border} />
            <Text style={s.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const iconInfo = TYPE_INFO[item.type] || { name: 'notifications-outline', color: t.textMuted };
          return (
            <TouchableOpacity
              style={[s.item, !item.read && s.itemUnread]}
              onPress={() => handlePress(item)}
              activeOpacity={0.75}
            >
              <View style={[s.iconCircle, { backgroundColor: iconInfo.color + '22' }]}>
                <Ionicons name={iconInfo.name} size={20} color={iconInfo.color} />
              </View>
              <View style={s.itemBody}>
                <Text style={s.message}>{item.message}</Text>
                <Text style={s.time}>{new Date(item.createdAt).toDateString()}</Text>
              </View>
              {!item.read && <View style={[s.unreadDot, { backgroundColor: t.accent }]} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, alignSelf: 'flex-end', paddingHorizontal: 16 },
  markAllText: { color: t.accent, fontWeight: 'bold', fontSize: 14 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.bgCard, padding: 14, marginHorizontal: 15, marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: t.border },
  itemUnread: { backgroundColor: t.accentBg, borderLeftWidth: 4, borderLeftColor: t.accent },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemBody: { flex: 1 },
  message: { fontSize: 14, color: t.text, lineHeight: 20 },
  time: { fontSize: 11, color: t.textMuted, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: t.textMuted, fontSize: 16, marginTop: 12 },
});

export default NotificationsScreen;
