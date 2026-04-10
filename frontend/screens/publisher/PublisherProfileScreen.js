import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Image,
  TextInput, Modal, Platform, RefreshControl
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const StarRow = ({ rating, onRate, interactive = false, size = 22 }) => (
  <View style={{ flexDirection: 'row', gap: 4 }}>
    {[1, 2, 3, 4, 5].map(s => (
      <TouchableOpacity key={s} onPress={() => interactive && onRate(s)} disabled={!interactive}>
        <Text style={{ fontSize: size }}>{rating >= s ? '⭐' : '☆'}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const PublisherProfileScreen = ({ route, navigation }) => {
  const { publisherId } = route.params;
  const { user } = useContext(AuthContext);
  const isSelf = user?.id === publisherId;

  const [profile, setProfile] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [userStats, setUserStats] = useState(null);

  const [myRating, setMyRating] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);

  const [reviewText, setReviewText] = useState('');
  const [reviewPhoto, setReviewPhoto] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

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
      setReviews(reviewsRes.data || []);
      setUserStats(statsRes.data);
    } catch {
      Alert.alert('Error', 'Failed to load publisher profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [publisherId]));

  const handleFollow = async () => {
    if (!user) { Alert.alert('Sign in required', 'Please sign in to follow publishers'); return; }
    setFollowLoading(true);
    try {
      const res = await api.post(`/api/follows/${publisherId}`);
      setIsFollowing(res.data.following);
      setProfile(prev => ({
        ...prev,
        followerCount: (prev.followerCount || 0) + (res.data.following ? 1 : -1)
      }));
    } catch {
      Alert.alert('Error', 'Failed to update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRate = async (rating) => {
    if (!user) { Alert.alert('Sign in required'); return; }
    setRatingLoading(true);
    try {
      let res;
      if (rating === myRating) {
        // Toggle off — remove rating
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
      Alert.alert('Error', 'Failed to rate publisher');
    } finally {
      setRatingLoading(false);
    }
  };

  const pickReviewPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setReviewPhoto(result.assets[0]);
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) return;
    setReviewSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('text', reviewText.trim());
      if (reviewPhoto) {
        const name = reviewPhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(name);
        fd.append('photo', { uri: reviewPhoto.uri, name, type: match ? `image/${match[1]}` : 'image/jpeg' });
      }
      const res = await api.post(`/api/publisher/${publisherId}/reviews`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReviews(prev => [res.data, ...prev]);
      setReviewText('');
      setReviewPhoto(null);
      setShowReviewForm(false);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to post review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = (reviewId) => {
    Alert.alert('Delete Review', 'Delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/publisher/reviews/${reviewId}`);
            setReviews(prev => prev.filter(r => r._id !== reviewId));
          } catch { Alert.alert('Error', 'Failed to delete review'); }
        }
      }
    ]);
  };

  const filteredOpps = oppFilter === 'all'
    ? opportunities
    : opportunities.filter(o => o.status === oppFilter);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;
  if (!profile) return <View style={styles.centered}><Text>Publisher not found</Text></View>;

  const photoUri = profile.profileImage ? `${BASE_URL}/${profile.profileImage}` : null;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}>

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
              : <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>{isFollowing ? '✓ Following' : '+ Follow'}</Text>
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
              {myRating && <Text style={styles.rateHint}>Tap your rating again to remove it</Text>}
              {!myRating && <Text style={styles.rateHint}>Tap a star to rate</Text>}
            </>
          )}
        </View>
      )}

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

      {/* Reviews */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comments & Reviews ({reviews.length})</Text>

        {!isSelf && user && !showReviewForm && (
          <TouchableOpacity style={styles.addReviewBtn} onPress={() => setShowReviewForm(true)}>
            <Text style={styles.addReviewBtnText}>✍️ Write a Comment</Text>
          </TouchableOpacity>
        )}

        {showReviewForm && (
          <View style={styles.reviewForm}>
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience with this publisher..."
              placeholderTextColor="#aaa"
              value={reviewText}
              onChangeText={setReviewText}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity style={styles.photoBtn} onPress={pickReviewPhoto}>
              <Text style={styles.photoBtnText}>{reviewPhoto ? '✅ Photo selected' : '📷 Add Photo (optional)'}</Text>
            </TouchableOpacity>
            {reviewPhoto && <Image source={{ uri: reviewPhoto.uri }} style={styles.photoPreview} resizeMode="cover" />}
            <View style={styles.formBtns}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitReview} disabled={reviewSubmitting}>
                {reviewSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Post</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowReviewForm(false); setReviewText(''); setReviewPhoto(null); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {reviews.length === 0 ? (
          <Text style={styles.emptyText}>No reviews yet. Be the first!</Text>
        ) : (
          reviews.map(review => {
            const revPhotoUri = review.author?.profileImage ? `${BASE_URL}/${review.author.profileImage}` : null;
            const isOwn = review.author?._id === user?.id;
            return (
              <View key={review._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  {revPhotoUri ? (
                    <Image source={{ uri: revPhotoUri }} style={styles.reviewAvatar} />
                  ) : (
                    <View style={styles.reviewAvatarPlaceholder}>
                      <Text style={styles.reviewAvatarText}>{review.author?.name?.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewAuthor}>{review.author?.name || 'Anonymous'}</Text>
                    <Text style={styles.reviewDate}>{new Date(review.createdAt).toDateString()}</Text>
                  </View>
                  {isOwn && (
                    <TouchableOpacity onPress={() => handleDeleteReview(review._id)}>
                      <Text style={styles.deleteBtn}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
                {review.photo ? (
                  <Image source={{ uri: `${BASE_URL}/${review.photo}` }} style={styles.reviewPhoto} resizeMode="cover" />
                ) : null}
                {review.isUpdated && <Text style={styles.editedLabel}>edited</Text>}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
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
  followBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, borderWidth: 1.5, borderColor: '#fff' },
  followBtnActive: { backgroundColor: '#fff' },
  followBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  followBtnTextActive: { color: '#2e86de' },

  statsCard: { margin: 15, marginBottom: 0, backgroundColor: '#fff', borderRadius: 12, padding: 14, elevation: 2 },
  statsTitle: { fontSize: 13, fontWeight: 'bold', color: '#9b59b6', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: '#f8f4ff', borderRadius: 10, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#9b59b6' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2, textAlign: 'center' },

  rateCard: { margin: 15, backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2 },
  rateTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  rateHint: { fontSize: 12, color: '#888', marginTop: 6 },

  section: { margin: 15, marginTop: 0, marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 12, marginTop: 15 },

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

  emptyText: { color: '#999', textAlign: 'center', padding: 20 },

  addReviewBtn: { backgroundColor: '#f0f4f8', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#dee2e6' },
  addReviewBtnText: { color: '#2e86de', fontWeight: 'bold' },

  reviewForm: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2 },
  reviewInput: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top', fontSize: 14, borderWidth: 1, borderColor: '#ddd', color: '#333', marginBottom: 10 },
  photoBtn: { backgroundColor: '#f0f4f8', borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 8 },
  photoBtnText: { color: '#555' },
  photoPreview: { width: '100%', height: 120, borderRadius: 8, marginBottom: 10 },
  formBtns: { flexDirection: 'row', gap: 10 },
  submitBtn: { flex: 1, backgroundColor: '#2e86de', borderRadius: 8, padding: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  cancelBtn: { flex: 1, backgroundColor: '#f0f4f8', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  cancelBtnText: { color: '#666' },

  reviewCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  reviewAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { fontWeight: 'bold', color: '#555' },
  reviewAuthor: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  reviewDate: { fontSize: 12, color: '#aaa' },
  deleteBtn: { color: '#e74c3c', fontWeight: 'bold', padding: 4 },
  reviewText: { fontSize: 14, color: '#444', lineHeight: 20 },
  reviewPhoto: { width: '100%', height: 150, borderRadius: 8, marginTop: 8 },
  editedLabel: { fontSize: 11, color: '#aaa', marginTop: 4 }
});

export default PublisherProfileScreen;
