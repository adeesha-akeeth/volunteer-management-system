import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import api from '../../api';

const MyLikesCommentsScreen = ({ navigation }) => {
  const toast = useToast();
  const [data, setData] = useState({
    opportunityVotes: [],
    commentVotes: [],
    publisherReviewVotes: [],
    comments: [],
    publisherReviews: [],
    publisherRatingsMade: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('comments');

  const fetchData = async () => {
    try {
      const res = await api.get('/api/votes/my-activity');
      setData({
        opportunityVotes: res.data.opportunityVotes || [],
        commentVotes: res.data.commentVotes || [],
        publisherReviewVotes: res.data.publisherReviewVotes || [],
        comments: res.data.comments || [],
        publisherReviews: res.data.publisherReviews || [],
        publisherRatingsMade: res.data.publisherRatingsMade || []
      });
    } catch {
      toast.error('Error', 'Failed to load activity');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const oppLikes = data.opportunityVotes.filter(v => v.vote === 'like');
  const oppDislikes = data.opportunityVotes.filter(v => v.vote === 'dislike');
  const allComments = [...data.comments, ...data.publisherReviews].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const allVotes = [...data.opportunityVotes, ...data.commentVotes, ...data.publisherReviewVotes].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const tabs = [
    { key: 'comments', label: 'Comments', icon: 'chatbubbles-outline', count: allComments.length },
    { key: 'votes', label: 'My Votes', icon: 'thumbs-up-outline', count: allVotes.length },
    { key: 'ratings', label: 'Ratings', icon: 'star-outline', count: data.publisherRatingsMade.length }
  ];

  const navigateToOpportunity = (opportunityId) => {
    if (!opportunityId) return;
    navigation.navigate('OpportunityDetail', { opportunityId });
  };

  const navigateToPublisher = (publisherId) => {
    if (!publisherId) return;
    navigation.navigate('PublisherProfile', { publisherId: publisherId.toString() });
  };

  // ── renderers ────────────────────────────────────────────────────────────────

  const renderOpportunityComment = (item) => {
    const isReply = !!item.parentComment;
    const oppId = item.opportunity?._id || item.opportunity;
    const oppTitle = item.opportunity?.title || 'Unknown opportunity';
    const parentAuthor = item.parentComment?.author?.name;
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigateToOpportunity(oppId)} activeOpacity={0.8}>
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, isReply ? styles.badgeReply : styles.badgeComment]}>
            <Ionicons name={isReply ? 'return-down-back-outline' : 'chatbubble-outline'} size={11} color="#555" />
            <Text style={styles.typeBadgeText}> {isReply ? 'Reply' : 'Comment'}</Text>
          </View>
          {item.isUpdated && <Text style={styles.editedLabel}>edited</Text>}
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {isReply
            ? `Reply to ${parentAuthor || 'a comment'} on: ${oppTitle}`
            : `On: ${oppTitle}`}
        </Text>
        <Text style={styles.commentText} numberOfLines={3}>{item.text}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{new Date(item.createdAt).toDateString()}</Text>
          <Text style={styles.tapHint}>View →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPublisherReview = (item) => {
    const isReply = !!item.parentReview;
    const publisherId = item.publisher?._id || item.publisher;
    const publisherName = item.publisher?.name || 'a publisher';
    const parentAuthor = item.parentReview?.author?.name;
    return (
      <TouchableOpacity style={[styles.card, styles.cardPublisher]} onPress={() => navigateToPublisher(publisherId)} activeOpacity={0.8}>
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, isReply ? styles.badgeReply : styles.badgePublisher]}>
            <Ionicons name={isReply ? 'return-down-back-outline' : 'person-outline'} size={11} color="#555" />
            <Text style={styles.typeBadgeText}> {isReply ? 'Reply' : 'Publisher Review'}</Text>
          </View>
          {item.isUpdated && <Text style={styles.editedLabel}>edited</Text>}
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {isReply
            ? `Reply to ${parentAuthor || 'a review'} on: ${publisherName}`
            : `On publisher: ${publisherName}`}
        </Text>
        <Text style={styles.commentText} numberOfLines={3}>{item.text}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{new Date(item.createdAt).toDateString()}</Text>
          <Text style={styles.tapHint}>View →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderVoteItem = (item) => {
    const type = item.targetType;
    const isDislike = item.vote === 'dislike';

    if (type === 'opportunity') {
      const oppId = item.targetId?._id || item.targetId;
      const oppTitle = item.targetId?.title || 'Unknown opportunity';
      return (
        <TouchableOpacity style={styles.card} onPress={() => navigateToOpportunity(oppId)} activeOpacity={0.8}>
          <View style={styles.cardTopRow}>
            <View style={[styles.typeBadge, isDislike ? styles.badgeDislike : styles.badgeLike]}>
              <Ionicons name={isDislike ? 'thumbs-down-outline' : 'thumbs-up-outline'} size={11} color={isDislike ? '#e74c3c' : '#2e86de'} />
              <Text style={[styles.typeBadgeText, { color: isDislike ? '#e74c3c' : '#2e86de' }]}>
                {' '}{isDislike ? 'Disliked' : 'Liked'} opportunity
              </Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>{oppTitle}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.dateText}>{new Date(item.createdAt).toDateString()}</Text>
            <Text style={styles.tapHint}>View →</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (type === 'comment') {
      const comment = item.targetId;
      const oppId = comment?.opportunity?._id || comment?.opportunity;
      const oppTitle = comment?.opportunity?.title || 'an opportunity';
      const preview = comment?.text?.slice(0, 60) + (comment?.text?.length > 60 ? '…' : '');
      return (
        <TouchableOpacity style={styles.card} onPress={() => navigateToOpportunity(oppId)} activeOpacity={0.8}>
          <View style={styles.cardTopRow}>
            <View style={[styles.typeBadge, isDislike ? styles.badgeDislike : styles.badgeLike]}>
              <Ionicons name={isDislike ? 'thumbs-down-outline' : 'thumbs-up-outline'} size={11} color={isDislike ? '#e74c3c' : '#2e86de'} />
              <Text style={[styles.typeBadgeText, { color: isDislike ? '#e74c3c' : '#2e86de' }]}>
                {' '}{isDislike ? 'Disliked' : 'Liked'} comment
              </Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>On: {oppTitle}</Text>
          {preview ? <Text style={styles.commentText} numberOfLines={2}>"{preview}"</Text> : null}
          <View style={styles.cardFooter}>
            <Text style={styles.dateText}>{new Date(item.createdAt).toDateString()}</Text>
            <Text style={styles.tapHint}>View →</Text>
          </View>
        </TouchableOpacity>
      );
    }

    if (type === 'publisher_review') {
      const review = item.targetId;
      const publisherId = review?.publisher?._id || review?.publisher;
      const publisherName = review?.publisher?.name || 'a publisher';
      const preview = review?.text?.slice(0, 60) + (review?.text?.length > 60 ? '…' : '');
      return (
        <TouchableOpacity style={[styles.card, styles.cardPublisher]} onPress={() => navigateToPublisher(publisherId)} activeOpacity={0.8}>
          <View style={styles.cardTopRow}>
            <View style={[styles.typeBadge, isDislike ? styles.badgeDislike : styles.badgeLike]}>
              <Ionicons name={isDislike ? 'thumbs-down-outline' : 'thumbs-up-outline'} size={11} color={isDislike ? '#e74c3c' : '#2e86de'} />
              <Text style={[styles.typeBadgeText, { color: isDislike ? '#e74c3c' : '#2e86de' }]}>
                {' '}{isDislike ? 'Disliked' : 'Liked'} publisher review
              </Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>Publisher: {publisherName}</Text>
          {preview ? <Text style={styles.commentText} numberOfLines={2}>"{preview}"</Text> : null}
          <View style={styles.cardFooter}>
            <Text style={styles.dateText}>{new Date(item.createdAt).toDateString()}</Text>
            <Text style={styles.tapHint}>View →</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderRatingItem = (item) => {
    const publisherId = item.publisher?._id || item.publisher;
    const publisherName = item.publisher?.name || 'a publisher';
    return (
      <TouchableOpacity style={[styles.card, styles.cardPublisher]} onPress={() => navigateToPublisher(publisherId)} activeOpacity={0.8}>
        <View style={styles.cardTopRow}>
          <View style={[styles.typeBadge, styles.badgeRating]}>
            <Ionicons name="star-outline" size={11} color="#f39c12" />
            <Text style={[styles.typeBadgeText, { color: '#f39c12' }]}> Publisher Rating</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={1}>{publisherName}</Text>
        <View style={{ flexDirection: 'row', gap: 3, marginBottom: 4 }}>
          {[1,2,3,4,5].map(s => (
            <Ionicons key={s} name={item.rating >= s ? 'star' : 'star-outline'} size={14} color="#f39c12" />
          ))}
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>{new Date(item.createdAt).toDateString()}</Text>
          <Text style={styles.tapHint}>View →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (activeTab === 'comments') {
      return (
        <FlatList
          data={allComments}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No comments or reviews yet</Text></View>}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) =>
            item.publisher ? renderPublisherReview(item) : renderOpportunityComment(item)
          }
        />
      );
    }

    if (activeTab === 'votes') {
      return (
        <FlatList
          data={allVotes}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No votes yet</Text></View>}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => renderVoteItem(item)}
        />
      );
    }

    if (activeTab === 'ratings') {
      return (
        <FlatList
          data={data.publisherRatingsMade}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No publisher ratings yet</Text></View>}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => renderRatingItem(item)}
        />
      );
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons name={t.icon} size={14} color={activeTab === t.key ? '#fff' : '#888'} />
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>
              {' '}{t.label} ({t.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', padding: 10, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#ddd' },
  tabActive: { backgroundColor: '#2e86de', borderColor: '#2e86de' },
  tabLabel: { fontSize: 12, color: '#888', fontWeight: '600' },
  tabLabelActive: { color: '#fff' },
  listContent: { padding: 14, paddingTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#2e86de' },
  cardPublisher: { borderLeftColor: '#9b59b6' },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f4fd', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeComment: { backgroundColor: '#e8f4fd' },
  badgeReply: { backgroundColor: '#f0fff0' },
  badgePublisher: { backgroundColor: '#f8f4ff' },
  badgeLike: { backgroundColor: '#e8f4fd' },
  badgeDislike: { backgroundColor: '#ffe8e8' },
  badgeRating: { backgroundColor: '#fff8e1' },
  typeBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#555' },
  editedLabel: { fontSize: 10, color: '#f39c12', fontStyle: 'italic' },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  commentText: { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  dateText: { fontSize: 11, color: '#aaa' },
  tapHint: { fontSize: 11, color: '#2e86de', fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#999', fontSize: 16 }
});

export default MyLikesCommentsScreen;
