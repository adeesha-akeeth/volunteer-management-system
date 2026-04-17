import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Image, TextInput, KeyboardAvoidingView,
  Platform, RefreshControl, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const ReviewItem = ({ item, publisherId, userId, handlers, isReply = false }) => {
  const {
    handleVote, handleDelete,
    replyingTo, setReplyingTo,
    replyText, setReplyText,
    replyPhoto, pickReplyPhoto,
    replySubmitting, handleAddReply
  } = handlers;

  const isOwn = item.author?._id === userId || item.author?.id === userId;
  const hasReplies = item.replies?.length > 0;
  const [repliesOpen, setRepliesOpen] = useState(false);
  const avatarUri = item.author?.profileImage ? `${BASE_URL}/${item.author.profileImage}` : null;

  return (
    <View style={[styles.reviewCard, isReply && styles.reviewCardReply]}>
      <View style={styles.reviewHeader}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.author?.name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{item.author?.name || 'Anonymous'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.date}>{new Date(item.createdAt).toDateString()}</Text>
            {item.isUpdated && <Text style={styles.editedLabel}>edited</Text>}
          </View>
        </View>
        {isOwn && (
          <TouchableOpacity onPress={() => handleDelete(item._id, isReply ? item.parentReview : null)} style={styles.deleteBtn}>
            <Ionicons name="close" size={14} color="#e74c3c" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.reviewText}>{item.text}</Text>
      {item.photo ? (
        <Image source={{ uri: `${BASE_URL}/${item.photo}` }} style={styles.reviewPhoto} resizeMode="cover" />
      ) : null}

      {/* Like / Dislike / Reply row */}
      <View style={styles.reviewFooter}>
        <TouchableOpacity
          style={[styles.voteBtn, item.userVote === 'like' && styles.voteBtnLikeActive]}
          onPress={() => handleVote(item, 'like')}
        >
          <Ionicons name="thumbs-up-outline" size={13} color={item.userVote === 'like' ? '#2e86de' : '#777'} />
          <Text style={styles.voteBtnText}> {item.likes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.voteBtn, item.userVote === 'dislike' && styles.voteBtnDislikeActive]}
          onPress={() => handleVote(item, 'dislike')}
        >
          <Ionicons name="thumbs-down-outline" size={13} color={item.userVote === 'dislike' ? '#e74c3c' : '#777'} />
          <Text style={styles.voteBtnText}> {item.dislikes || 0}</Text>
        </TouchableOpacity>
        {!isReply && (
          <TouchableOpacity
            style={styles.replyToggleBtn}
            onPress={() => {
              const opening = replyingTo?.id !== item._id;
              setReplyingTo(opening ? { id: item._id, authorName: item.author?.name } : null);
            }}
          >
            <Ionicons name="return-down-back-outline" size={13} color="#555" />
            <Text style={styles.replyToggleBtnText}> Reply</Text>
          </TouchableOpacity>
        )}
        {hasReplies && !isReply && (
          <TouchableOpacity onPress={() => setRepliesOpen(p => !p)} style={styles.showRepliesBtn}>
            <Text style={styles.showRepliesText}>
              {repliesOpen ? 'Hide' : `${item.replies.length} repl${item.replies.length === 1 ? 'y' : 'ies'}`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reply form */}
      {!isReply && replyingTo?.id === item._id && (
        <View style={styles.replyFormWrap}>
          <View style={styles.replyInputRow}>
            <TextInput
              style={styles.replyInput}
              placeholder={`Reply to ${replyingTo.authorName}...`}
              placeholderTextColor="#aaa"
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />
            <TouchableOpacity style={styles.replySubmitBtn} onPress={handleAddReply} disabled={replySubmitting}>
              {replySubmitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.replySubmitText}>Send</Text>
              }
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.replyPhotoBtn} onPress={pickReplyPhoto}>
            <Ionicons name={replyPhoto ? 'checkmark-circle' : 'camera-outline'} size={14} color="#9b59b6" />
            <Text style={styles.replyPhotoBtnText}>{replyPhoto ? 'Photo selected' : 'Add photo (optional)'}</Text>
          </TouchableOpacity>
          {replyPhoto && <Image source={{ uri: replyPhoto.uri }} style={styles.replyPhotoPreview} resizeMode="cover" />}
        </View>
      )}

      {/* Nested replies */}
      {!isReply && repliesOpen && (item.replies || []).map(reply => (
        <ReviewItem
          key={reply._id}
          item={reply}
          publisherId={publisherId}
          userId={userId}
          handlers={handlers}
          isReply
        />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const PublisherCommentsScreen = ({ route, navigation }) => {
  const { publisherId, publisherName } = route.params;
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const confirm = useConfirm();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [newText, setNewText] = useState('');
  const [newPhoto, setNewPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyPhoto, setReplyPhoto] = useState(null);
  const [replySubmitting, setReplySubmitting] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/api/publisher/${publisherId}/reviews`);
      setReviews(res.data || []);
    } catch {
      toast.error('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchReviews(); };

  const pickNewPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setNewPhoto(result.assets[0]);
  };

  const pickReplyPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setReplyPhoto(result.assets[0]);
  };

  const handleSubmitReview = async () => {
    if (!newText.trim()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('text', newText.trim());
      if (newPhoto) {
        const name = newPhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(name);
        fd.append('photo', { uri: newPhoto.uri, name, type: match ? `image/${match[1]}` : 'image/jpeg' });
      }
      const res = await api.post(`/api/publisher/${publisherId}/reviews`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReviews(prev => [res.data, ...prev]);
      setNewText('');
      setNewPhoto(null);
      setShowForm(false);
    } catch (e) {
      toast.error('Error', e.response?.data?.message || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (review, vote) => {
    try {
      const res = await api.post('/api/votes', { targetId: review._id, targetType: 'publisher_review', vote });
      const update = r => r._id === review._id
        ? { ...r, likes: res.data.likes, dislikes: res.data.dislikes, userVote: res.data.userVote }
        : r;
      setReviews(prev => prev.map(r => ({
        ...update(r),
        replies: (r.replies || []).map(update)
      })));
    } catch {
      toast.error('Error', 'Failed to vote');
    }
  };

  const handleDelete = (reviewId, parentId) => {
    confirm.show({
      title: 'Delete Comment',
      message: 'Delete this comment?',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/publisher/reviews/${reviewId}`);
          if (parentId) {
            setReviews(prev => prev.map(r =>
              r._id === parentId ? { ...r, replies: (r.replies || []).filter(rep => rep._id !== reviewId) } : r
            ));
          } else {
            setReviews(prev => prev.filter(r => r._id !== reviewId));
          }
        } catch {
          toast.error('Error', 'Failed to delete');
        }
      }
    });
  };

  const handleAddReply = async () => {
    if (!replyText.trim() || !replyingTo) return;
    setReplySubmitting(true);
    try {
      const fd = new FormData();
      fd.append('text', replyText.trim());
      fd.append('parentReviewId', replyingTo.id);
      if (replyPhoto) {
        const name = replyPhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(name);
        fd.append('photo', { uri: replyPhoto.uri, name, type: match ? `image/${match[1]}` : 'image/jpeg' });
      }
      const res = await api.post(`/api/publisher/${publisherId}/reviews`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReviews(prev => prev.map(r =>
        r._id === replyingTo.id ? { ...r, replies: [...(r.replies || []), res.data] } : r
      ));
      setReplyText('');
      setReplyPhoto(null);
      setReplyingTo(null);
    } catch (e) {
      toast.error('Error', e.response?.data?.message || 'Failed to reply');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handlers = {
    handleVote, handleDelete,
    replyingTo, setReplyingTo,
    replyText, setReplyText,
    replyPhoto, pickReplyPhoto,
    replySubmitting, handleAddReply
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? 80 : 0}>
      <FlatList
        data={reviews}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>Comments on {publisherName}</Text>
            {user && !showForm && (
              <TouchableOpacity style={styles.writeBtn} onPress={() => setShowForm(true)}>
                <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.writeBtnText}>Write a Comment</Text>
              </TouchableOpacity>
            )}
            {showForm && (
              <View style={styles.newReviewForm}>
                <Text style={styles.formTitle}>New Comment</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Share your experience with this publisher..."
                  placeholderTextColor="#aaa"
                  value={newText}
                  onChangeText={setNewText}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity style={styles.photoPickerBtn} onPress={pickNewPhoto}>
                  <Ionicons name={newPhoto ? 'checkmark-circle' : 'camera-outline'} size={16} color="#2e86de" style={{ marginRight: 6 }} />
                  <Text style={styles.photoPickerBtnText}>{newPhoto ? 'Photo selected — tap to change' : 'Add Photo (optional)'}</Text>
                </TouchableOpacity>
                {newPhoto && <Image source={{ uri: newPhoto.uri }} style={styles.newPhotoPreview} resizeMode="cover" />}
                <View style={styles.formBtns}>
                  <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitReview} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Post Comment</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowForm(false); setNewText(''); setNewPhoto(null); }}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={50} color="#ddd" />
            <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ReviewItem
            item={item}
            publisherId={publisherId}
            userId={user?.id}
            handlers={handlers}
          />
        )}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 14, paddingTop: 6 },
  heading: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },

  writeBtn: { backgroundColor: '#2e86de', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  writeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  newReviewForm: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, elevation: 2 },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  formInput: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12, minHeight: 90, textAlignVertical: 'top', fontSize: 14, borderWidth: 1, borderColor: '#ddd', color: '#333', marginBottom: 10 },
  photoPickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f4fd', borderRadius: 8, padding: 10, marginBottom: 10 },
  photoPickerBtnText: { color: '#2e86de', fontWeight: '600', fontSize: 13 },
  newPhotoPreview: { width: '100%', height: 140, borderRadius: 8, marginBottom: 10 },
  formBtns: { flexDirection: 'row', gap: 10 },
  submitBtn: { flex: 1, backgroundColor: '#2e86de', borderRadius: 8, padding: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  cancelBtn: { flex: 1, backgroundColor: '#f0f4f8', borderRadius: 8, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  cancelBtnText: { color: '#666' },

  reviewCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2 },
  reviewCardReply: { backgroundColor: '#f8f9fa', marginLeft: 20, marginTop: 8, elevation: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  authorName: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  date: { fontSize: 11, color: '#aaa' },
  editedLabel: { fontSize: 10, color: '#f39c12', fontStyle: 'italic' },
  deleteBtn: { backgroundColor: '#ffe0e0', borderRadius: 12, padding: 5 },
  reviewText: { fontSize: 14, color: '#444', lineHeight: 21, marginBottom: 8 },
  reviewPhoto: { width: '100%', height: 160, borderRadius: 8, marginBottom: 10 },

  reviewFooter: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  voteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4f8', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#ddd' },
  voteBtnLikeActive: { backgroundColor: '#e8f4fd', borderColor: '#2e86de' },
  voteBtnDislikeActive: { backgroundColor: '#ffe8e8', borderColor: '#e74c3c' },
  voteBtnText: { fontSize: 12, color: '#555' },
  replyToggleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4f8', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#ddd' },
  replyToggleBtnText: { fontSize: 12, color: '#555', fontWeight: '600' },
  showRepliesBtn: { backgroundColor: '#e8f4fd', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  showRepliesText: { fontSize: 12, color: '#2e86de', fontWeight: '600' },

  replyFormWrap: { marginTop: 10 },
  replyInputRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  replyInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#ddd', color: '#333', minHeight: 40, textAlignVertical: 'top' },
  replySubmitBtn: { backgroundColor: '#2e86de', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  replySubmitText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  replyPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: '#f8f4ff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  replyPhotoBtnText: { fontSize: 12, color: '#9b59b6', fontWeight: '600' },
  replyPhotoPreview: { width: 80, height: 80, borderRadius: 8, marginTop: 6 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#999', fontSize: 16, marginTop: 12 }
});

export default PublisherCommentsScreen;
