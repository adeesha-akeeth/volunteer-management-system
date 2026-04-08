import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import api from '../../api';

const MyLikesCommentsScreen = ({ navigation }) => {
  const [votes, setVotes] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  const fetchData = async () => {
    try {
      const res = await api.get('/api/votes/my-activity');
      setVotes(res.data.votes || []);
      setComments(res.data.comments || []);
    } catch {
      Alert.alert('Error', 'Failed to load activity');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleDeleteComment = (id) => {
    Alert.alert('Delete Comment', 'Delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/comments/${id}`);
            setComments(prev => prev.filter(c => c._id !== id));
          } catch { Alert.alert('Error', 'Failed to delete'); }
        }
      }
    ]);
  };

  const handleRemoveVote = async (vote) => {
    try {
      await api.post('/api/votes', { targetId: vote.targetId._id || vote.targetId, targetType: 'opportunity', vote: vote.vote });
      setVotes(prev => prev.filter(v => v._id !== vote._id));
    } catch { Alert.alert('Error', 'Failed to remove vote'); }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'comments' && styles.tabActive]} onPress={() => setActiveTab('comments')}>
          <Text style={[styles.tabLabel, activeTab === 'comments' && styles.tabLabelActive]}>💬 Comments ({comments.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'likes' && styles.tabActive]} onPress={() => setActiveTab('likes')}>
          <Text style={[styles.tabLabel, activeTab === 'likes' && styles.tabLabelActive]}>👍 Likes ({votes.length})</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'comments' ? (
        <FlatList
          data={comments}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No comments yet</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.opportunity?.title || 'Unknown opportunity'}</Text>
              <Text style={styles.commentText}>{item.text}</Text>
              {item.rating && <Text style={styles.rating}>{'⭐'.repeat(item.rating)}</Text>}
              {item.isUpdated && <Text style={styles.updatedLabel}>edited</Text>}
              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>{new Date(item.createdAt).toDateString()}</Text>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteComment(item._id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={votes}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No votes yet</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.targetId?.title || 'Unknown opportunity'}</Text>
              <View style={styles.cardFooter}>
                <Text style={[styles.voteLabel, item.vote === 'like' ? styles.voteLike : styles.voteDislike]}>
                  {item.vote === 'like' ? '👍 Liked' : '👎 Disliked'}
                </Text>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemoveVote(item)}>
                  <Text style={styles.deleteBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: '#2e86de' },
  tabLabel: { fontSize: 14, color: '#888', fontWeight: '600' },
  tabLabelActive: { color: '#2e86de' },
  card: { backgroundColor: '#fff', marginHorizontal: 15, marginTop: 10, borderRadius: 10, padding: 14, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#2e86de', marginBottom: 6 },
  commentText: { fontSize: 15, color: '#333', marginBottom: 4 },
  rating: { fontSize: 14, marginBottom: 4 },
  updatedLabel: { fontSize: 11, color: '#f39c12', fontStyle: 'italic', marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  dateText: { fontSize: 11, color: '#aaa' },
  deleteBtn: { backgroundColor: '#ffe8e8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  deleteBtnText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 13 },
  voteLabel: { fontSize: 15, fontWeight: 'bold' },
  voteLike: { color: '#2e86de' },
  voteDislike: { color: '#e74c3c' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#999', fontSize: 16 }
});

export default MyLikesCommentsScreen;
