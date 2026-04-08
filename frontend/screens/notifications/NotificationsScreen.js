import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api';

const typeIcon = {
  application_status: '📋',
  new_application: '🔔',
  donation_status: '💰',
  donation_received: '💵',
  contribution_received: '⏱',
  comment_reply: '💬',
  comment_like: '👍',
  follow_new_opportunity: '🌟'
};

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data.notifications || []);
    } catch {
      Alert.alert('Error', 'Failed to load notifications');
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
    // Mark as read immediately for live count update
    if (!notification.read) {
      markRead(notification._id);
    }

    const relId = notification.relatedId;

    switch (notification.type) {
      case 'application_status':
        navigation.getParent()?.navigate('Profile', { screen: 'MyApplications' });
        break;

      case 'new_application':
      case 'contribution_received':
      case 'donation_received':
        if (relId) navigation.navigate('CreatorOpportunityDetail', { opportunityId: relId });
        break;

      case 'donation_status':
        navigation.getParent()?.navigate('Donations', { screen: 'MyDonations' });
        break;

      case 'comment_reply':
      case 'comment_like':
      case 'follow_new_opportunity':
        if (relId) navigation.navigate('OpportunityDetail', { opportunityId: relId });
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
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.read && styles.itemUnread]}
            onPress={() => handlePress(item)}
            activeOpacity={0.75}
          >
            <Text style={styles.icon}>{typeIcon[item.type] || '🔔'}</Text>
            <View style={styles.itemBody}>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>{new Date(item.createdAt).toDateString()}</Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
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
  icon: { fontSize: 24, marginRight: 12 },
  itemBody: { flex: 1 },
  message: { fontSize: 14, color: '#333', lineHeight: 20 },
  time: { fontSize: 11, color: '#aaa', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2e86de', marginLeft: 8 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#999', fontSize: 16, marginTop: 12 }
});

export default NotificationsScreen;
