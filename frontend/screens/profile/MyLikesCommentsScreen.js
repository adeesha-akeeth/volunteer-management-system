import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import api from '../../api';

const MyLikesCommentsScreen = ({ navigation }) => {
  const [opportunityVotes, setOpportunityVotes] = useState([]);
  const [commentVotes, setCommentVotes] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  const fetchData = async () => {
    try {
      const res = await api.get('/api/votes/my-activity');
      setOpportunityVotes(res.data.opportunityVotes || []);
      setCommentVotes(res.data.commentVotes || []);
      setComments(res.data.comments || []);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const navigateToOpportunity = (opportunityId) => {
    if (!opportunityId) return;
    navigation.navigate('OpportunityDetail', { opportunityId });
  };

  const likes = opportunityVotes.filter(v => v.vote === 'like');
  const dislikes = opportunityVotes.filter(v => v.vote === 'dislike');
  const commentLikes = commentVotes.filter(v => v.vote === 'like');
  const commentDislikes = commentVotes.filter(v => v.vote === 'dislike');

  const tabs = [
    { key: 'comments', label: `💬 Comments (${comments.length})` },
    { key: 'likes', label: `👍 Likes (${likes.length})` },
    { key: 'dislikes', label: `👎 Dislikes (${dislikes.length})` },
    { key: 'comment_votes', label: `🗳 Comment Votes (${commentLikes.length + commentDislikes.length})` },
  ];

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  const renderComment = ({ item }) => {
    const isReply = !!item.parentCommentId;
    const oppId = item.opportunity?._id || item.opportunity;
    const oppTitle = item.opportunity?.title || 'Unknown opportunity';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigateToOpportunity(oppId)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, isReply && styles.typeBadgeReply]}>
            <Text style={styles.typeBadgeText}>{isReply ? '↩ Reply' : '💬 Comment'}</Text>
          </View>
          {item.isUpdated && <Text style={styles.editedLabel}>edited</Text>}
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {isReply
            ? `Reply to ${item.parentCommentId?.author?.name || 'a comment'} on: ${oppTitle}`
            : `On: ${oppTitle}`}
        </Text>
        <Text style={styles.commentText} numberOfLines={3}>{item.text}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{new Date(item.createdAt).toDateString()}</Text>
          <Text style={styles.tapHint}>Tap to view →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOpportunityVote = ({ item, isDislike }) => {
    const oppId = item.targetId?._id || item.targetId;
    const oppTitle = item.targetId?.title || 'Unknown opportunity';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigateToOpportunity(oppId)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, isDislike ? styles.typeBadgeDislike : styles.typeBadgeLike]}>
            <Text style={styles.typeBadgeText}>{isDislike ? '👎 Disliked' : '👍 Liked'}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>Opportunity: {oppTitle}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{new Date(item.createdAt).toDateString()}</Text>
          <Text style={styles.tapHint}>Tap to view →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCommentVote = ({ item }) => {
    const isDislike = item.vote === 'dislike';
    const comment = item.targetId;
    const oppId = comment?.opportunity?._id || comment?.opportunity;
    const oppTitle = comment?.opportunity?.title || 'an opportunity';
    const preview = comment?.text ? (comment.text.length > 60 ? comment.text.slice(0, 60) + '…' : comment.text) : '';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigateToOpportunity(oppId)}
        activeOpacity={0.8}
      >
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, isDislike ? styles.typeBadgeDislike : styles.typeBadgeLike]}>
            <Text style={styles.typeBadgeText}>{isDislike ? '👎 Disliked comment' : '👍 Liked comment'}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>On: {oppTitle}</Text>
        {preview ? <Text style={styles.commentText} numberOfLines={2}>"{preview}"</Text> : null}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{new Date(item.createdAt).toDateString()}</Text>
          <Text style={styles.tapHint}>Tap to view →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'comments':
        return (
          <FlatList
            data={comments}
            keyExtractor={item => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No comments yet</Text></View>}
            contentContainerStyle={styles.listContent}
            renderItem={renderComment}
          />
        );
      case 'likes':
        return (
          <FlatList
            data={likes}
            keyExtractor={item => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No likes yet</Text></View>}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => renderOpportunityVote({ item, isDislike: false })}
          />
        );
      case 'dislikes':
        return (
          <FlatList
            data={dislikes}
            keyExtractor={item => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No dislikes yet</Text></View>}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => renderOpportunityVote({ item, isDislike: true })}
          />
        );
      case 'comment_votes':
        return (
          <FlatList
            data={commentVotes}
            keyExtractor={item => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No comment votes yet</Text></View>}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => renderCommentVote({ item })}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Tab bar - scrollable */}
      <View>
        <FlatList
          data={tabs}
          keyExtractor={t => t.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
          renderItem={({ item: t }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd' },
  tabActive: { backgroundColor: '#2e86de', borderColor: '#2e86de' },
  tabLabel: { fontSize: 13, color: '#888', fontWeight: '600' },
  tabLabelActive: { color: '#fff' },
  listContent: { padding: 14, paddingTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#2e86de' },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  typeBadge: { backgroundColor: '#e8f4fd', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  typeBadgeReply: { backgroundColor: '#f0fff0' },
  typeBadgeLike: { backgroundColor: '#e8f4fd' },
  typeBadgeDislike: { backgroundColor: '#ffe8e8', borderLeftColor: '#e74c3c' },
  typeBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#555' },
  editedLabel: { fontSize: 10, color: '#f39c12', fontStyle: 'italic' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#2e86de', marginBottom: 4 },
  commentText: { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  dateText: { fontSize: 11, color: '#aaa' },
  tapHint: { fontSize: 11, color: '#2e86de', fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#999', fontSize: 16 }
});

export default MyLikesCommentsScreen;
