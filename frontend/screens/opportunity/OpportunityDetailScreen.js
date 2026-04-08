import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, Modal, FlatList,
  KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

// ── CommentItem defined OUTSIDE the parent component to avoid re-mount bug ──
const CommentItem = ({ item, parentId, userId, handlers }) => {
  const {
    handleDeleteComment, handleCommentVote,
    setReplyingTo, replyingTo,
    setExpandedReplies, expandedReplies,
    handleAddReply, replyText, setReplyText, replySubmitting,
    openEditComment
  } = handlers;

  const isOwn = item.author?._id === userId || item.author?.id === userId;
  const hasReplies = item.replies?.length > 0;
  const repliesExpanded = expandedReplies[item._id];

  return (
    <View style={[styles.commentItem, parentId && styles.commentItemReply]}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAvatar}>
          <Text style={styles.commentAvatarText}>{item.author?.name?.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.commentAuthor}>{item.author?.name || 'Unknown'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.commentDate}>{new Date(item.createdAt).toDateString()}</Text>
            {item.isUpdated && <Text style={styles.updatedLabel}>edited</Text>}
          </View>
        </View>
        {isOwn && (
          <View style={styles.commentActions}>
            <TouchableOpacity onPress={() => openEditComment(item)} style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteComment(item._id, parentId)} style={styles.commentDeleteBtn}>
              <Text style={styles.commentDeleteText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {item.rating && (
        <Text style={styles.commentRating}>{'⭐'.repeat(item.rating)}</Text>
      )}
      <Text style={styles.commentText}>{item.text}</Text>
      {item.photo ? (
        <Image source={{ uri: `${BASE_URL}/${item.photo}` }} style={styles.commentPhoto} resizeMode="cover" />
      ) : null}

      <View style={styles.commentFooter}>
        <TouchableOpacity
          style={[styles.commentVoteBtn, item.userVote === 'like' && styles.commentVoteBtnLikeActive]}
          onPress={() => handleCommentVote(item, 'like')}
        >
          <Text style={styles.commentVoteBtnText}>👍 {item.likes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.commentVoteBtn, item.userVote === 'dislike' && styles.commentVoteBtnDislikeActive]}
          onPress={() => handleCommentVote(item, 'dislike')}
        >
          <Text style={styles.commentVoteBtnText}>👎 {item.dislikes || 0}</Text>
        </TouchableOpacity>
        {!parentId && (
          <TouchableOpacity
            style={styles.replyBtn}
            onPress={() => setReplyingTo(replyingTo?.id === item._id ? null : { id: item._id, authorName: item.author?.name })}
          >
            <Text style={styles.replyBtnText}>↩ Reply</Text>
          </TouchableOpacity>
        )}
        {hasReplies && !parentId && (
          <TouchableOpacity style={styles.showRepliesBtn} onPress={() => setExpandedReplies(prev => ({ ...prev, [item._id]: !prev[item._id] }))}>
            <Text style={styles.showRepliesBtnText}>{repliesExpanded ? 'Hide' : `${item.replies.length} repl${item.replies.length === 1 ? 'y' : 'ies'}`}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!parentId && replyingTo?.id === item._id && (
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
            {replySubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.replySubmitText}>Send</Text>}
          </TouchableOpacity>
        </View>
      )}

      {!parentId && repliesExpanded && item.replies.map(reply => (
        <CommentItem key={reply._id} item={reply} parentId={item._id} userId={userId} handlers={handlers} />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const OpportunityDetailScreen = ({ route, navigation }) => {
  const { opportunityId } = route.params;
  const { user } = useContext(AuthContext);
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [isPast, setIsPast] = useState(false);

  // Donors modal
  const [donorsModal, setDonorsModal] = useState(null);
  const [donors, setDonors] = useState([]);
  const [donorsLoading, setDonorsLoading] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState(0);
  const [commentPhoto, setCommentPhoto] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);

  // Comment editing
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(0);
  const [editPhoto, setEditPhoto] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});

  const fetchData = async () => {
    try {
      const [oppRes, commentsRes] = await Promise.all([
        api.get(`/api/opportunities/${opportunityId}`),
        api.get(`/api/comments/opportunity/${opportunityId}`)
      ]);
      const opp = oppRes.data;
      setOpportunity(opp);
      setComments(commentsRes.data || []);
      setIsCreator(opp.createdBy?._id === user?.id);
      if (opp.endDate && new Date() > new Date(opp.endDate)) setIsPast(true);
    } catch {
      Alert.alert('Error', 'Failed to load opportunity details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleVote = async (vote) => {
    try {
      const res = await api.post('/api/votes', { targetId: opportunityId, targetType: 'opportunity', vote });
      setOpportunity(prev => ({ ...prev, likes: res.data.likes, dislikes: res.data.dislikes, userVote: res.data.userVote }));
    } catch {
      Alert.alert('Error', 'Failed to vote');
    }
  };

  const handleCommentVote = async (comment, vote) => {
    try {
      const res = await api.post('/api/votes', { targetId: comment._id, targetType: 'comment', vote });
      setComments(prev => prev.map(c => {
        if (c._id === comment._id) return { ...c, likes: res.data.likes, dislikes: res.data.dislikes, userVote: res.data.userVote };
        return {
          ...c,
          replies: c.replies.map(r => r._id === comment._id
            ? { ...r, likes: res.data.likes, dislikes: res.data.dislikes, userVote: res.data.userVote }
            : r
          )
        };
      }));
    } catch {
      Alert.alert('Error', 'Failed to vote');
    }
  };

  const pickCommentPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setCommentPhoto(result.assets[0]);
  };

  const pickEditPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setEditPhoto(result.assets[0]);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('opportunityId', opportunityId);
      fd.append('text', commentText);
      if (commentRating) fd.append('rating', commentRating.toString());
      if (commentPhoto) {
        const filename = commentPhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        fd.append('photo', { uri: commentPhoto.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
      }
      const res = await api.post('/api/comments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setComments(prev => [...prev, res.data]);
      setCommentText(''); setCommentRating(0); setCommentPhoto(null); setShowCommentForm(false);
      // Refresh opportunity to get updated averageRating
      const oppRes = await api.get(`/api/opportunities/${opportunityId}`);
      setOpportunity(oppRes.data);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to post comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleAddReply = async () => {
    if (!replyText.trim() || !replyingTo) return;
    setReplySubmitting(true);
    try {
      const res = await api.post('/api/comments', { opportunityId, text: replyText, parentCommentId: replyingTo.id });
      setComments(prev => prev.map(c =>
        c._id === replyingTo.id ? { ...c, replies: [...c.replies, res.data] } : c
      ));
      setReplyText('');
      setReplyingTo(null);
      setExpandedReplies(prev => ({ ...prev, [replyingTo.id]: true }));
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to post reply');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId, parentId) => {
    Alert.alert('Delete Comment', 'Delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/comments/${commentId}`);
            if (parentId) {
              setComments(prev => prev.map(c =>
                c._id === parentId ? { ...c, replies: c.replies.filter(r => r._id !== commentId) } : c
              ));
            } else {
              setComments(prev => prev.filter(c => c._id !== commentId));
            }
          } catch { Alert.alert('Error', 'Failed to delete'); }
        }
      }
    ]);
  };

  const openEditComment = (comment) => {
    setEditingComment(comment);
    setEditText(comment.text);
    setEditRating(comment.rating || 0);
    setEditPhoto(null);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setEditSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('text', editText);
      if (editRating) fd.append('rating', editRating.toString());
      if (editPhoto) {
        const filename = editPhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        fd.append('photo', { uri: editPhoto.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
      }
      const res = await api.put(`/api/comments/${editingComment._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const updated = res.data;
      setComments(prev => prev.map(c => {
        if (c._id === editingComment._id) return { ...c, text: updated.text, rating: updated.rating, photo: updated.photo, isUpdated: true };
        return { ...c, replies: c.replies.map(r => r._id === editingComment._id ? { ...r, text: updated.text, rating: updated.rating, photo: updated.photo, isUpdated: true } : r) };
      }));
      setEditingComment(null);
      if (editRating) {
        const oppRes = await api.get(`/api/opportunities/${opportunityId}`);
        setOpportunity(oppRes.data);
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update');
    } finally {
      setEditSubmitting(false);
    }
  };

  const openDonors = async (fundraiser) => {
    setDonorsModal(fundraiser);
    setDonorsLoading(true);
    try {
      const res = await api.get(`/api/fundraisers/${fundraiser._id}/donors`);
      setDonors(res.data.donors);
    } catch {
      setDonors([]);
    } finally {
      setDonorsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Opportunity', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/opportunities/${opportunityId}`);
            Alert.alert('Deleted', 'Opportunity removed');
            navigation.goBack();
          } catch { Alert.alert('Error', 'Failed to delete'); }
        }
      }
    ]);
  };

  const formatDateRange = (opp) => {
    if (opp.startDate && opp.endDate) return `${new Date(opp.startDate).toDateString()} — ${new Date(opp.endDate).toDateString()}`;
    if (opp.date) return new Date(opp.date).toDateString();
    return 'Date not set';
  };

  const commentHandlers = {
    handleDeleteComment, handleCommentVote,
    setReplyingTo, replyingTo,
    setExpandedReplies, expandedReplies,
    handleAddReply, replyText, setReplyText, replySubmitting,
    openEditComment
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;
  if (!opportunity) return <View style={styles.centered}><Text>Opportunity not found</Text></View>;

  const likeActive = opportunity.userVote === 'like';
  const dislikeActive = opportunity.userVote === 'dislike';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {opportunity.bannerImage ? (
        <Image source={{ uri: `${BASE_URL}/${opportunity.bannerImage}` }} style={styles.bannerImage} resizeMode="cover" />
      ) : null}

      {isPast && <View style={styles.pastBanner}><Text style={styles.pastBannerText}>⏰ This opportunity has ended</Text></View>}
      {opportunity.status === 'closed' && !isPast && (
        <View style={styles.closedBanner}><Text style={styles.closedBannerText}>🔒 Applications are closed</Text></View>
      )}

      <View style={styles.headerCard}>
        <Text style={styles.title}>{opportunity.title}</Text>
        <View style={styles.headerRow}>
          <View style={styles.categoryBadge}><Text style={styles.categoryText}>{opportunity.category}</Text></View>
          {opportunity.averageRating && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {opportunity.averageRating} ({opportunity.reviewCount})</Text>
            </View>
          )}
        </View>
        <View style={styles.voteRow}>
          <TouchableOpacity style={[styles.voteBtn, likeActive && styles.voteBtnLikeActive]} onPress={() => handleVote('like')}>
            <Text style={styles.voteBtnText}>👍 {opportunity.likes || 0} Likes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.voteBtn, dislikeActive && styles.voteBtnDislikeActive]} onPress={() => handleVote('dislike')}>
            <Text style={styles.voteBtnText}>👎 {opportunity.dislikes || 0} Dislikes</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Details</Text>
        {opportunity.organization ? <Text style={styles.detail}>🏢 {opportunity.organization}</Text> : null}
        <Text style={styles.detail}>📍 {opportunity.location}</Text>
        <Text style={styles.detail}>📅 {formatDateRange(opportunity)}</Text>
        <Text style={styles.detail}>👥 {opportunity.spotsAvailable} spots available</Text>
        <Text style={styles.detail}>👤 Posted by: {opportunity.createdBy?.name}</Text>
        {opportunity.responsibleName ? <Text style={styles.detail}>🙋 {opportunity.responsibleName}</Text> : null}
        {opportunity.responsibleEmail ? <Text style={styles.detail}>✉️ {opportunity.responsibleEmail}</Text> : null}
        {opportunity.responsiblePhone ? <Text style={styles.detail}>📞 {opportunity.responsiblePhone}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{opportunity.description}</Text>
      </View>

      {/* Fundraisers */}
      {opportunity.fundraisers?.map(fr => {
        const pct = fr.targetAmount > 0 ? Math.min(100, Math.round((fr.collectedAmount / fr.targetAmount) * 100)) : 0;
        const isActive = fr.status === 'active';
        return (
          <View key={fr._id} style={[styles.fundraiserCard, !isActive && styles.fundraiserCardDone]}>
            <View style={styles.fundraiserHeader}>
              <Text style={styles.fundraiserName}>{fr.name}</Text>
              {!isActive && <View style={[styles.statusBadge, fr.status === 'stopped' && styles.stoppedBadge]}><Text style={styles.statusBadgeText}>{fr.status}</Text></View>}
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.collected}>LKR {fr.collectedAmount.toLocaleString()}</Text>
              <Text style={styles.target}> of LKR {fr.targetAmount.toLocaleString()} goal</Text>
            </View>
            <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: isActive ? '#27ae60' : '#888' }]} /></View>
            <Text style={styles.pctText}>{pct}% funded</Text>
            <View style={styles.fundraiserButtons}>
              <TouchableOpacity style={styles.viewDonorsBtn} onPress={() => openDonors(fr)}>
                <Text style={styles.viewDonorsBtnText}>View Donors</Text>
              </TouchableOpacity>
              {!isCreator && isActive && (
                <TouchableOpacity
                  style={styles.donateBtn}
                  onPress={() => navigation.navigate('Donate', { fundraiserId: fr._id, fundraiserName: fr.name, opportunityTitle: opportunity.title })}
                >
                  <Text style={styles.donateBtnText}>Donate</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      {/* Actions */}
      <View style={styles.buttonContainer}>
        {isCreator ? (
          <>
            <TouchableOpacity style={styles.manageButton} onPress={() => navigation.navigate('CreatorOpportunityDetail', { opportunityId })}>
              <Text style={styles.manageButtonText}>Manage</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete Opportunity</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.applyButton, (isPast || opportunity.status !== 'open') && styles.disabledButton]}
            onPress={() => {
              if (isPast) { Alert.alert('Ended', 'This opportunity has already ended.'); return; }
              if (opportunity.status === 'closed') { Alert.alert('Closed', 'Applications are closed for this opportunity.'); return; }
              navigation.navigate('Apply', { opportunity });
            }}
            disabled={isPast || opportunity.status !== 'open'}
          >
            <Text style={styles.applyButtonText}>
              {isPast ? 'Opportunity Ended' : opportunity.status === 'closed' ? 'Applications Closed' : 'Apply Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Comments & Reviews (merged) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Comments & Reviews {comments.length > 0 ? `(${comments.length})` : ''}</Text>

        {/* Post a comment */}
        {user && !showCommentForm && (
          <TouchableOpacity style={styles.addCommentButton} onPress={() => setShowCommentForm(true)}>
            <Text style={styles.addCommentButtonText}>✍️ Write a Comment</Text>
          </TouchableOpacity>
        )}

        {showCommentForm && (
          <View style={styles.commentForm}>
            <Text style={styles.formTitle}>Write a Comment</Text>
            <Text style={styles.formLabel}>Rating (optional)</Text>
            <View style={styles.starContainer}>
              {[1,2,3,4,5].map(star => (
                <TouchableOpacity key={star} onPress={() => setCommentRating(commentRating === star ? 0 : star)}>
                  <Text style={styles.star}>{commentRating >= star ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.formTextArea}
              placeholder="Share your thoughts..."
              placeholderTextColor="#aaa"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity style={styles.photoPickerButton} onPress={pickCommentPhoto}>
              <Text style={styles.photoPickerText}>{commentPhoto ? '✅ Photo selected' : '📷 Add a Photo (optional)'}</Text>
            </TouchableOpacity>
            {commentPhoto && <Image source={{ uri: commentPhoto.uri }} style={styles.formPhotoPreview} resizeMode="cover" />}
            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.submitCommentButton} onPress={handleAddComment} disabled={commentSubmitting}>
                {commentSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitCommentText}>Post</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelCommentButton} onPress={() => { setShowCommentForm(false); setCommentText(''); setCommentRating(0); setCommentPhoto(null); }}>
                <Text style={styles.cancelCommentText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {comments.length === 0 ? (
          <Text style={styles.noFeedbackText}>No comments yet. Be the first!</Text>
        ) : (
          comments.map(item => (
            <CommentItem key={item._id} item={item} parentId={null} userId={user?.id} handlers={commentHandlers} />
          ))
        )}
      </View>

      {/* Edit Comment Modal */}
      <Modal visible={!!editingComment} transparent animationType="slide" onRequestClose={() => setEditingComment(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditingComment(null)}>
          <View style={styles.editModal} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.formTitle}>Edit Comment</Text>
            <Text style={styles.formLabel}>Rating (optional)</Text>
            <View style={styles.starContainer}>
              {[1,2,3,4,5].map(star => (
                <TouchableOpacity key={star} onPress={() => setEditRating(editRating === star ? 0 : star)}>
                  <Text style={styles.star}>{editRating >= star ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.formTextArea}
              value={editText}
              onChangeText={setEditText}
              multiline
              numberOfLines={4}
              placeholderTextColor="#aaa"
            />
            <TouchableOpacity style={styles.photoPickerButton} onPress={pickEditPhoto}>
              <Text style={styles.photoPickerText}>{editPhoto ? '✅ New photo selected' : '📷 Change photo (optional)'}</Text>
            </TouchableOpacity>
            {editPhoto && <Image source={{ uri: editPhoto.uri }} style={styles.formPhotoPreview} resizeMode="cover" />}
            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.submitCommentButton} onPress={handleSaveEdit} disabled={editSubmitting}>
                {editSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitCommentText}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelCommentButton} onPress={() => setEditingComment(null)}>
                <Text style={styles.cancelCommentText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Donors Modal */}
      <Modal visible={!!donorsModal} animationType="slide" onRequestClose={() => setDonorsModal(null)}>
        <View style={styles.donorsModal}>
          <View style={styles.donorsHeader}>
            <Text style={styles.donorsTitle}>{donorsModal?.name}</Text>
            <TouchableOpacity onPress={() => setDonorsModal(null)} style={styles.donorsCloseBtn}>
              <Text style={styles.donorsCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.donorsSubtitle}>Donors ranked by contribution</Text>
          {donorsLoading ? (
            <ActivityIndicator size="large" color="#27ae60" style={{ marginTop: 40 }} />
          ) : donors.length === 0 ? (
            <Text style={styles.noDonorsText}>No confirmed donors yet</Text>
          ) : (
            <FlatList
              data={donors}
              keyExtractor={(_, i) => i.toString()}
              contentContainerStyle={{ padding: 15 }}
              renderItem={({ item }) => (
                <View style={[styles.donorCard, item.rank <= 3 && styles.donorCardTop]}>
                  <View style={styles.donorRank}>
                    <Text style={styles.donorRankText}>{item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.donorName}>{item.name}</Text>
                    {item.message ? <Text style={styles.donorMessage}>"{item.message}"</Text> : null}
                    <Text style={styles.donorDate}>{new Date(item.date).toDateString()}</Text>
                  </View>
                  <Text style={styles.donorAmount}>LKR {item.amount.toLocaleString()}</Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10 },
  pastBanner: { backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, marginBottom: 8, alignItems: 'center' },
  pastBannerText: { color: '#fff', fontWeight: 'bold' },
  closedBanner: { backgroundColor: '#f39c12', borderRadius: 8, padding: 10, marginBottom: 8, alignItems: 'center' },
  closedBannerText: { color: '#fff', fontWeight: 'bold' },
  headerCard: { backgroundColor: '#2e86de', borderRadius: 10, padding: 20, marginBottom: 15 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  headerRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  categoryBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  ratingBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  voteRow: { flexDirection: 'row', gap: 10 },
  voteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  voteBtnLikeActive: { backgroundColor: 'rgba(46,134,222,0.5)', borderColor: '#fff' },
  voteBtnDislikeActive: { backgroundColor: 'rgba(231,76,60,0.4)', borderColor: '#fff' },
  voteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  detail: { fontSize: 15, color: '#555', marginBottom: 7 },
  description: { fontSize: 16, color: '#555', lineHeight: 24 },
  fundraiserCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#27ae60' },
  fundraiserCardDone: { borderLeftColor: '#888', backgroundColor: '#fafafa' },
  fundraiserHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fundraiserName: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  statusBadge: { backgroundColor: '#888', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  stoppedBadge: { backgroundColor: '#e74c3c' },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  collected: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  target: { fontSize: 13, color: '#888' },
  progressBg: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden', marginBottom: 5 },
  progressFill: { height: '100%', borderRadius: 5 },
  pctText: { fontSize: 12, color: '#888', marginBottom: 12 },
  fundraiserButtons: { flexDirection: 'row', gap: 8 },
  viewDonorsBtn: { flex: 1, backgroundColor: '#f0f4f8', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  viewDonorsBtnText: { color: '#555', fontWeight: 'bold', fontSize: 13 },
  donateBtn: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, padding: 10, alignItems: 'center' },
  donateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  buttonContainer: { marginBottom: 15 },
  applyButton: { backgroundColor: '#27ae60', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  disabledButton: { backgroundColor: '#aaa' },
  applyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  manageButton: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  manageButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  deleteButton: { backgroundColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  deleteButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  // Comments
  noFeedbackText: { color: '#999', fontSize: 14, textAlign: 'center', padding: 10 },
  addCommentButton: { marginBottom: 14, backgroundColor: '#9b59b6', borderRadius: 10, padding: 12, alignItems: 'center' },
  addCommentButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  commentForm: { marginBottom: 14, backgroundColor: '#f8f4ff', borderRadius: 10, padding: 15 },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  formLabel: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 6 },
  starContainer: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  star: { fontSize: 32 },
  formTextArea: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd', minHeight: 90, textAlignVertical: 'top', color: '#333', marginBottom: 12 },
  photoPickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#9b59b6', borderStyle: 'dashed', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 },
  photoPickerText: { color: '#9b59b6', fontWeight: 'bold', fontSize: 14 },
  formPhotoPreview: { width: '100%', height: 180, borderRadius: 8, marginBottom: 12 },
  formButtons: { flexDirection: 'row', gap: 10 },
  submitCommentButton: { flex: 1, backgroundColor: '#9b59b6', borderRadius: 8, padding: 12, alignItems: 'center' },
  submitCommentText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelCommentButton: { flex: 1, borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelCommentText: { color: '#555', fontWeight: 'bold', fontSize: 15 },
  // Comment items
  commentItem: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 10 },
  commentItemReply: { backgroundColor: '#f0f4f8', marginLeft: 20, marginTop: 6, marginBottom: 4 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  commentAuthor: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  commentDate: { fontSize: 11, color: '#aaa' },
  updatedLabel: { fontSize: 10, color: '#f39c12', fontStyle: 'italic' },
  commentActions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#2e86de', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  editBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  commentDeleteBtn: { backgroundColor: '#ffe0e0', borderRadius: 12, padding: 4, paddingHorizontal: 7 },
  commentDeleteText: { color: '#e74c3c', fontSize: 12, fontWeight: 'bold' },
  commentRating: { fontSize: 14, marginBottom: 4 },
  commentText: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 6 },
  commentPhoto: { width: '100%', height: 160, borderRadius: 8, marginBottom: 8 },
  commentFooter: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  commentVoteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: '#ddd' },
  commentVoteBtnLikeActive: { backgroundColor: '#e8f4fd', borderColor: '#2e86de' },
  commentVoteBtnDislikeActive: { backgroundColor: '#ffe8e8', borderColor: '#e74c3c' },
  commentVoteBtnText: { fontSize: 12, color: '#555' },
  replyBtn: { backgroundColor: '#f0f4f8', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#ddd' },
  replyBtnText: { fontSize: 12, color: '#555', fontWeight: '600' },
  showRepliesBtn: { backgroundColor: '#e8f4fd', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  showRepliesBtnText: { fontSize: 12, color: '#2e86de', fontWeight: '600' },
  replyInputRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  replyInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#ddd', color: '#333', minHeight: 38, textAlignVertical: 'top' },
  replySubmitBtn: { backgroundColor: '#2e86de', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  replySubmitText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  // Edit modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  editModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  // Donors modal
  donorsModal: { flex: 1, backgroundColor: '#f0f4f8' },
  donorsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27ae60', padding: 20, paddingTop: 15 },
  donorsTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1 },
  donorsCloseBtn: { padding: 5 },
  donorsCloseText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  donorsSubtitle: { fontSize: 13, color: '#888', paddingHorizontal: 15, paddingTop: 10 },
  noDonorsText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 },
  donorCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  donorCardTop: { borderLeftWidth: 4, borderLeftColor: '#f39c12' },
  donorRank: { width: 36, alignItems: 'center' },
  donorRankText: { fontSize: 22 },
  donorName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  donorMessage: { fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 2 },
  donorDate: { fontSize: 11, color: '#aaa', marginTop: 3 },
  donorAmount: { fontSize: 16, fontWeight: 'bold', color: '#27ae60' }
});

export default OpportunityDetailScreen;
