import React, { useState, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../../components/Toast';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const StarRow = ({ rating, onRate, interactive = false, size = 22 }) => (
  <View style={{ flexDirection: 'row', gap: 4 }}>
    {[1, 2, 3, 4, 5].map(s => (
      <TouchableOpacity key={s} onPress={() => interactive && onRate(s)} disabled={!interactive}>
        <Ionicons name={rating >= s ? 'star' : 'star-outline'} size={size} color="#f39c12" />
      </TouchableOpacity>
    ))}
  </View>
);

const PublisherProfileScreen = ({ route, navigation }) => {
  const { publisherId } = route.params;
  const { user } = useContext(AuthContext);
  const isSelf = user?.id === publisherId;
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [latestReview, setLatestReview] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [userStats, setUserStats] = useState(null);

  const [myRating, setMyRating] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);

  const [oppFilter, setOppFilter] = useState('all');

  const fetchData = async () => {
    try {
      const [profileRes, reviewsRes, statsRes] = await Promise.all([
        api.get(`/api/publisher/${publisherId}`),
        api.get(`/api/publisher/${publisherId}/reviews`),
        api.get(`/api/points/user/${publisherId}`).catch(() => ({ data: null }))
      ]);
      setProfile(profileRes.data.publisher);
      setOpportunities(profileRes.data.opportunities || []);
      setIsFollowing(profileRes.data.isFollowing || false);
      setMyRating(profileRes.data.myRating || null);

      const reviews = reviewsRes.data || [];
      // reviews is a tree: top-level items with replies
      const allTopLevel = reviews.filter(r => !r.parentReview);
      setReviewCount(reviews.length);
      // Show latest top-level review
      setLatestReview(allTopLevel.length > 0 ? allTopLevel[allTopLevel.length - 1] : null);

      setUserStats(statsRes.data);
    } catch {
      toast.error('Error', 'Failed to load publisher profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [publisherId]));

  const handleFollow = async () => {
    if (!user) { toast.warning('Sign in required', 'Please sign in to follow publishers'); return; }
    setFollowLoading(true);
    try {
      const res = await api.post(`/api/follows/${publisherId}`);
      setIsFollowing(res.data.following);
      setProfile(prev => ({
        ...prev,
        followerCount: (prev.followerCount || 0) + (res.data.following ? 1 : -1)
      }));
    } catch {
      toast.error('Error', 'Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRate = async (rating) => {
    if (!user) { toast.warning('Sign in required', 'Please sign in to rate publishers'); return; }
    setRatingLoading(true);
    try {
      let res;
      if (rating === myRating) {
        res = await api.delete(`/api/publisher/${publisherId}/rate`);
        setMyRating(null);
      } else {
        res = await api.post(`/api/publisher/${publisherId}/rate`, { rating });
        setMyRating(res.data.myRating);
      }
      setProfile(prev => ({
        ...prev,
        averageRating: res.data.averageRating,
        ratingCount: res.data.ratingCount
      }));
    } catch {
      toast.error('Error', 'Failed to rate publisher');
    } finally {
      setRatingLoading(false);
    }
  };

  const filteredOpps = oppFilter === 'all'
    ? opportunities
    : opportunities.filter(o => o.status === oppFilter);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;
  if (!profile) return <View style={styles.centered}><Text>Publisher not found</Text></View>;

  const photoUri = profile.profileImage ? `${BASE_URL}/${profile.profileImage}` : null;
  const latestAvatarUri = latestReview?.author?.profileImage ? `${BASE_URL}/${latestReview.author.profileImage}` : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header card */}
        <View style={styles.headerCard}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{profile.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

          <View style={styles.ratingRow}>
            <StarRow rating={profile.averageRating || 0} />
            <Text style={styles.ratingText}>
              {profile.averageRating ? `${profile.averageRating} / 5` : 'No ratings yet'}
              {profile.ratingCount > 0 ? ` (${profile.ratingCount})` : ''}
            </Text>
          </View>

          <Text style={styles.followerText}>{profile.followerCount || 0} followers</Text>

          {!isSelf && user && (
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followBtnActive]}
              onPress={handleFollow}
              disabled={followLoading}
            >
              {followLoading
                ? <ActivityIndicator size="small" color={isFollowing ? '#2e86de' : '#fff'} />
                : <>
                    <Ionicons
                      name={isFollowing ? 'checkmark-circle' : 'person-add-outline'}
                      size={15} color={isFollowing ? '#2e86de' : '#fff'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* Volunteer impact stats */}
        {userStats && (userStats.total > 0 || userStats.contributionCount > 0 || userStats.completedCount > 0) && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Volunteer Impact</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{userStats.total || 0}</Text>
                <Text style={styles.statLabel}>Total Points</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#27ae60' }]}>{userStats.contributionCount || 0}</Text>
                <Text style={styles.statLabel}>Contributions</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: '#e67e22' }]}>{userStats.completedCount || 0}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
          </View>
        )}

        {/* Rate this publisher */}
        {!isSelf && user && (
          <View style={styles.rateCard}>
            <Text style={styles.rateTitle}>Rate this Publisher</Text>
            {ratingLoading ? <ActivityIndicator size="small" color="#f39c12" /> : (
              <>
                <StarRow rating={myRating || 0} onRate={handleRate} interactive size={28} />
                <Text style={styles.rateHint}>
                  {myRating ? `Your rating: ${myRating} star${myRating > 1 ? 's' : ''} — tap again to remove` : 'Tap a star to rate'}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Comments preview — ABOVE opportunities */}
        <View style={styles.commentsPreviewCard}>
          <View style={styles.commentsPreviewHeader}>
            <Ionicons name="chatbubbles-outline" size={17} color="#2e86de" style={{ marginRight: 6 }} />
            <Text style={styles.commentsPreviewTitle}>Comments & Reviews ({reviewCount})</Text>
          </View>

          {latestReview ? (
            <View style={styles.latestReview}>
              <View style={styles.latestReviewHeader}>
                {latestAvatarUri ? (
                  <Image source={{ uri: latestAvatarUri }} style={styles.latestAvatar} />
                ) : (
                  <View style={styles.latestAvatarPlaceholder}>
                    <Text style={styles.latestAvatarText}>{latestReview.author?.name?.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View>
                  <Text style={styles.latestAuthor}>{latestReview.author?.name || 'Anonymous'}</Text>
                  <Text style={styles.latestDate}>{new Date(latestReview.createdAt).toDateString()}</Text>
                </View>
              </View>
              <Text style={styles.latestText} numberOfLines={2}>{latestReview.text}</Text>
              <View style={styles.latestFooter}>
                <View style={styles.latestVotes}>
                  <Ionicons name="thumbs-up-outline" size={12} color="#777" />
                  <Text style={styles.latestVoteText}> {latestReview.likes || 0}</Text>
                  <Ionicons name="thumbs-down-outline" size={12} color="#777" style={{ marginLeft: 8 }} />
                  <Text style={styles.latestVoteText}> {latestReview.dislikes || 0}</Text>
                </View>
                {latestReview.replies?.length > 0 && (
                  <Text style={styles.latestRepliesText}>{latestReview.replies.length} repl{latestReview.replies.length === 1 ? 'y' : 'ies'}</Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
          )}

          <TouchableOpacity
            style={styles.viewAllCommentsBtn}
            onPress={() => navigation.navigate('PublisherComments', { publisherId, publisherName: profile.name })}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.viewAllCommentsBtnText}>
              {user && !isSelf ? 'Comment & Review' : 'View All Comments'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Opportunities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Opportunities ({opportunities.length})</Text>
          <View style={styles.filterRow}>
            {['all', 'open', 'closed', 'completed'].map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, oppFilter === f && styles.filterBtnActive]}
                onPress={() => setOppFilter(f)}
              >
                <Text style={[styles.filterBtnText, oppFilter === f && styles.filterBtnTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {filteredOpps.length === 0 ? (
            <Text style={styles.emptyText}>No opportunities found</Text>
          ) : (
            filteredOpps.map(opp => (
              <TouchableOpacity
                key={opp._id}
                style={styles.oppCard}
                onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: opp._id })}
              >
                {opp.bannerImage ? (
                  <Image source={{ uri: `${BASE_URL}/${opp.bannerImage}` }} style={styles.oppBanner} resizeMode="cover" />
                ) : null}
                <View style={styles.oppBody}>
                  <Text style={styles.oppTitle} numberOfLines={2}>{opp.title}</Text>
                  <Text style={styles.oppMeta}>📍 {opp.location}</Text>
                  <Text style={styles.oppMeta}>📅 {opp.startDate ? new Date(opp.startDate).toDateString() : 'TBD'}</Text>
                  <View style={styles.oppFooter}>
                    <View style={[styles.statusBadge, { backgroundColor: opp.status === 'open' ? '#d4efdf' : '#fde8e8' }]}>
                      <Text style={[styles.statusText, { color: opp.status === 'open' ? '#27ae60' : '#c0392b' }]}>
                        {opp.status || 'open'}
                      </Text>
                    </View>
                    <Text style={styles.oppCategory}>{opp.category}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerCard: { backgroundColor: '#2e86de', padding: 24, alignItems: 'center', paddingBottom: 28 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff', marginBottom: 12 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  name: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 2 },
  email: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 10 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  ratingText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  followerText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 14 },
  bio: { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center', marginBottom: 8, fontStyle: 'italic', paddingHorizontal: 20 },
  followBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1.5, borderColor: '#fff' },
  followBtnActive: { backgroundColor: '#fff' },
  followBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  followBtnTextActive: { color: '#2e86de' },

  statsCard: { margin: 15, marginBottom: 0, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2 },
  statsTitle: { fontSize: 13, fontWeight: 'bold', color: '#9b59b6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: '#f8f4ff', borderRadius: 10, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#9b59b6' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2, textAlign: 'center' },

  rateCard: { margin: 15, marginBottom: 0, backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2 },
  rateTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  rateHint: { fontSize: 12, color: '#888', marginTop: 6 },

  // Comments preview card
  commentsPreviewCard: { margin: 15, marginBottom: 0, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2 },
  commentsPreviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  commentsPreviewTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  latestReview: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 12 },
  latestReviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  latestAvatar: { width: 30, height: 30, borderRadius: 15 },
  latestAvatarPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  latestAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  latestAuthor: { fontWeight: 'bold', color: '#333', fontSize: 13 },
  latestDate: { fontSize: 11, color: '#aaa' },
  latestText: { fontSize: 13, color: '#555', lineHeight: 19 },
  latestFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  latestVotes: { flexDirection: 'row', alignItems: 'center' },
  latestVoteText: { fontSize: 12, color: '#777' },
  latestRepliesText: { fontSize: 11, color: '#2e86de', fontWeight: '600' },
  noCommentsText: { color: '#999', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  viewAllCommentsBtn: { backgroundColor: '#2e86de', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  viewAllCommentsBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  section: { margin: 15, marginTop: 15, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 12 },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#e9ecef', borderWidth: 1, borderColor: '#dee2e6' },
  filterBtnActive: { backgroundColor: '#2e86de', borderColor: '#2e86de' },
  filterBtnText: { color: '#555', fontSize: 13 },
  filterBtnTextActive: { color: '#fff' },

  oppCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, elevation: 2, overflow: 'hidden' },
  oppBanner: { width: '100%', height: 100 },
  oppBody: { padding: 12 },
  oppTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  oppMeta: { fontSize: 12, color: '#666', marginBottom: 2 },
  oppFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  oppCategory: { fontSize: 12, color: '#888' },

  emptyText: { color: '#999', textAlign: 'center', padding: 20 }
});

export default PublisherProfileScreen;
