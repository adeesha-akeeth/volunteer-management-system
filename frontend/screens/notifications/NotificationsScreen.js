import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import api from '../../api';

const TYPE_ICON = {
  application_status:     { name: 'document-text-outline',   color: '#2e86de' },
  new_application:        { name: 'person-add-outline',       color: '#27ae60' },
  donation_status:        { name: 'cash-outline',             color: '#f39c12' },
  donation_received:      { name: 'wallet-outline',           color: '#27ae60' },
  contribution_received:  { name: 'time-outline',             color: '#9b59b6' },
  contribution_status:    { name: 'checkmark-circle-outline', color: '#27ae60' },
  comment_reply:          { name: 'chatbubble-outline',       color: '#2e86de' },
  comment_like:           { name: 'thumbs-up-outline',        color: '#e67e22' },
  follow_new_opportunity: { name: 'star-outline',             color: '#f39c12' },
  opportunity_comment:    { name: 'chatbubbles-outline',      color: '#9b59b6' },
  opportunity_vote:       { name: 'heart-outline',            color: '#e74c3c' },
  publisher_review:       { name: 'chatbubble-ellipses-outline', color: '#2e86de' },
  publisher_rating:       { name: 'star-outline',             color: '#f39c12' },
  publisher_vote:         { name: 'thumbs-up-outline',        color: '#27ae60' }
};

const NotificationsScreen = ({ navigation }) => {
  const toast = useToast();
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
    if (!notification.read) {
      markRead(notification._id);
    }

    const relId = notification.relatedId;

    switch (notification.type) {
      case 'application_status':
        // Route to specific opportunity detail so user can see their accepted status inline
        if (relId) {
          navigation.navigate('OpportunityDetail', { opportunityId: relId });
        } else {
          navigation.getParent()?.navigate('Profile', { screen: 'MyApplications' });
        }
        break;

      case 'new_application':
        if (relId) navigation.navigate('ManageApplications', { opportunityId: relId });
        break;

      case 'donation_received':
        // Creator received a donation — go to My Fundraisers
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

      default:
        break;
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
          <Text style={styles.markAllText}>Mark all as read ({unreadCount})</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={60} color="#ddd" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const iconInfo = TYPE_ICON[item.type] || { name: 'notifications-outline', color: '#888' };
          return (
            <TouchableOpacity
              style={[styles.item, !item.read && styles.itemUnread]}
              onPress={() => handlePress(item)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: iconInfo.color + '18' }]}>
                <Ionicons name={iconInfo.name} size={20} color={iconInfo.color} />
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>{new Date(item.createdAt).toDateString()}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  markAllBtn: { padding: 12, alignItems: 'flex-end', paddingHorizontal: 16 },
  markAllText: { color: '#2e86de', fontWeight: 'bold', fontSize: 14 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, marginHorizontal: 15, marginTop: 8, borderRadius: 10, elevation: 1 },
  itemUnread: { backgroundColor: '#f0f8ff', borderLeftWidth: 4, borderLeftColor: '#2e86de' },
  iconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemBody: { flex: 1 },
  message: { fontSize: 14, color: '#333', lineHeight: 20 },
  time: { fontSize: 11, color: '#aaa', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2e86de', marginLeft: 8 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#999', fontSize: 16, marginTop: 12 }
});

export default NotificationsScreen;
