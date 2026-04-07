import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, Switch, Modal, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const OpportunityDetailScreen = ({ route, navigation }) => {
  const { opportunityId } = route.params;
  const { user } = useContext(AuthContext);
  const [opportunity, setOpportunity] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [isPast, setIsPast] = useState(false);

  // Donors modal
  const [donorsModal, setDonorsModal] = useState(null);
  const [donors, setDonors] = useState([]);
  const [donorsLoading, setDonorsLoading] = useState(false);

  // Review form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [formPhoto, setFormPhoto] = useState(null);
  const [formAnonymous, setFormAnonymous] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id, authorName }
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});

  const fetchData = async () => {
    try {
      const [oppRes, feedbackRes, commentsRes] = await Promise.all([
        api.get(`/api/opportunities/${opportunityId}`),
        api.get(`/api/feedback/opportunity/${opportunityId}`),
        api.get(`/api/comments/opportunity/${opportunityId}`)
      ]);
      const opp = oppRes.data;
      setOpportunity(opp);
      setFeedback(feedbackRes.data.feedback || []);
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

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const res = await api.post('/api/comments', { opportunityId, text: commentText });
      setComments(prev => [...prev, res.data]);
      setCommentText('');
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

  const myFeedback = feedback.find(f => f.volunteer?._id === user?.id);

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

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setFormPhoto(result.assets[0]);
  };

  const openAddForm = () => { setEditingId(null); setFormRating(0); setFormComment(''); setFormPhoto(null); setFormAnonymous(false); setShowForm(true); };
  const openEditForm = (item) => { setEditingId(item._id); setFormRating(item.rating); setFormComment(item.comment || ''); setFormPhoto(null); setFormAnonymous(item.anonymous || false); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); setFormRating(0); setFormComment(''); setFormPhoto(null); setFormAnonymous(false); };

  const handleSubmitReview = async () => {
    if (!formRating) { Alert.alert('Rating required', 'Please select a star rating'); return; }
    setFormLoading(true);
    try {
      const buildFD = () => {
        const fd = new FormData();
        fd.append('rating', formRating.toString());
        fd.append('comment', formComment);
        fd.append('anonymous', formAnonymous.toString());
        if (formPhoto) {
          const filename = formPhoto.uri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          fd.append('photo', { uri: formPhoto.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
        }
        return fd;
      };
      if (editingId) {
        await api.put(`/api/feedback/${editingId}`, buildFD());
      } else {
        const fd = buildFD();
        fd.append('opportunityId', opportunityId);
        await api.post('/api/feedback', fd);
      }
      closeForm();
      await fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteReview = (feedbackId) => {
    Alert.alert('Delete Review', 'Remove your review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await api.delete(`/api/feedback/${feedbackId}`); fetchData(); } catch { Alert.alert('Error', 'Failed'); } } }
    ]);
  };

  const renderStars = (r) => [1,2,3,4,5].map(i => i <= r ? '⭐' : '☆').join('');

  const formatDateRange = (opp) => {
    if (opp.startDate && opp.endDate) return `${new Date(opp.startDate).toDateString()} — ${new Date(opp.endDate).toDateString()}`;
    if (opp.date) return new Date(opp.date).toDateString();
    return 'Date not set';
  };

  const CommentItem = ({ item, parentId = null }) => {
    const isOwn = item.author?._id === user?.id || item.author?.id === user?.id;
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
            <Text style={styles.commentDate}>{new Date(item.createdAt).toDateString()}</Text>
          </View>
          {isOwn && (
            <TouchableOpacity onPress={() => handleDeleteComment(item._id, parentId)} style={styles.commentDeleteBtn}>
              <Text style={styles.commentDeleteText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.commentText}>{item.text}</Text>

        <View style={styles.commentFooter}>
          {/* Vote buttons */}
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
          {/* Reply button — only for top-level */}
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

        {/* Reply input box */}
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

        {/* Replies */}
        {!parentId && repliesExpanded && item.replies.map(reply => (
          <CommentItem key={reply._id} item={reply} parentId={item._id} />
        ))}
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;
  if (!opportunity) return <View style={styles.centered}><Text>Opportunity not found</Text></View>;

  const likeActive = opportunity.userVote === 'like';
  const dislikeActive = opportunity.userVote === 'dislike';

  return (
    <ScrollView style={styles.container}>
      {opportunity.bannerImage ? (
        <Image source={{ uri: `${BASE_URL}/${opportunity.bannerImage}` }} style={styles.bannerImage} resizeMode="cover" />
      ) : null}

      {isPast && <View style={styles.pastBanner}><Text style={styles.pastBannerText}>⏰ This opportunity has ended</Text></View>}

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
        {/* Like/Dislike row */}
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
        return (
          <View key={fr._id} style={[styles.fundraiserCard, fr.status === 'completed' && styles.fundraiserCardDone]}>
            <View style={styles.fundraiserHeader}>
              <Text style={styles.fundraiserName}>{fr.name}</Text>
              {fr.status === 'completed' && <View style={styles.completedBadge}><Text style={styles.completedText}>Completed</Text></View>}
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.collected}>LKR {fr.collectedAmount.toLocaleString()}</Text>
              <Text style={styles.target}> of LKR {fr.targetAmount.toLocaleString()} goal</Text>
            </View>
            <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${pct}%` }]} /></View>
            <Text style={styles.pctText}>{pct}% funded · {fr.donorCount || 0} donor{(fr.donorCount || 0) !== 1 ? 's' : ''}</Text>
            <View style={styles.fundraiserButtons}>
              <TouchableOpacity style={styles.viewDonorsBtn} onPress={() => openDonors(fr)}>
                <Text style={styles.viewDonorsBtnText}>View Donors</Text>
              </TouchableOpacity>
              {!isCreator && fr.status === 'active' && (
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
            style={[styles.applyButton, isPast && styles.disabledButton]}
            onPress={() => {
              if (isPast) { Alert.alert('Ended', 'This opportunity has already ended.'); return; }
              navigation.navigate('Apply', { opportunity });
            }}
            disabled={isPast}
          >
            <Text style={styles.applyButtonText}>{isPast ? 'Opportunity Ended' : 'Apply Now'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Reviews */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Reviews {feedback.length > 0 ? `(${feedback.length})` : ''}</Text>
        {feedback.length === 0 ? (
          <Text style={styles.noFeedbackText}>No reviews yet. Be the first!</Text>
        ) : (
          feedback.map(item => (
            <View key={item._id} style={styles.feedbackItem}>
              <View style={styles.feedbackHeader}>
                <View style={styles.feedbackAvatar}>
                  <Text style={styles.feedbackAvatarText}>{item.anonymous ? 'A' : item.volunteer?.name?.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedbackName}>{item.volunteer?.name}{item.anonymous && <Text style={styles.anonTag}> (anonymous)</Text>}</Text>
                  <Text style={styles.feedbackStars}>{renderStars(item.rating)}</Text>
                </View>
                {item.volunteer?._id === user?.id && (
                  <View style={styles.commentActions}>
                    <TouchableOpacity onPress={() => openEditForm(item)} style={styles.editBtn}><Text style={styles.editBtnText}>Edit</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteReview(item._id)} style={styles.deleteBtn}><Text style={styles.deleteBtnText}>Del</Text></TouchableOpacity>
                  </View>
                )}
              </View>
              {item.comment ? <Text style={styles.feedbackComment}>{item.comment}</Text> : null}
              {item.photo ? <Image source={{ uri: `${BASE_URL}/${item.photo}` }} style={styles.feedbackPhoto} resizeMode="cover" /> : null}
              <Text style={styles.feedbackDate}>{new Date(item.createdAt).toDateString()}</Text>
            </View>
          ))
        )}

        {user && !myFeedback && !showForm && (
          <TouchableOpacity style={styles.addCommentButton} onPress={openAddForm}>
            <Text style={styles.addCommentButtonText}>✍️ Write a Review</Text>
          </TouchableOpacity>
        )}

        {showForm && (
          <View style={styles.commentForm}>
            <Text style={styles.formTitle}>{editingId ? 'Edit Review' : 'Write a Review'}</Text>
            <Text style={styles.formLabel}>Rating *</Text>
            <View style={styles.starContainer}>
              {[1,2,3,4,5].map(star => (
                <TouchableOpacity key={star} onPress={() => setFormRating(star)}>
                  <Text style={styles.star}>{formRating >= star ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.formTextArea} placeholder="Share your experience..." placeholderTextColor="#aaa" value={formComment} onChangeText={setFormComment} multiline numberOfLines={4} />
            <TouchableOpacity style={styles.photoPickerButton} onPress={pickPhoto}>
              <Text style={styles.photoPickerText}>{formPhoto ? '✅ Photo selected' : '📷 Add a Photo (optional)'}</Text>
            </TouchableOpacity>
            {formPhoto && <Image source={{ uri: formPhoto.uri }} style={styles.formPhotoPreview} resizeMode="cover" />}
            <View style={styles.anonymousRow}>
              <Text style={styles.formLabel}>Post anonymously</Text>
              <Switch value={formAnonymous} onValueChange={setFormAnonymous} trackColor={{ false: '#ccc', true: '#2e86de' }} thumbColor="#fff" />
            </View>
            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.submitCommentButton} onPress={handleSubmitReview} disabled={formLoading}>
                {formLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitCommentText}>{editingId ? 'Update' : 'Submit'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelCommentButton} onPress={closeForm}>
                <Text style={styles.cancelCommentText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Comments Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Comments {comments.length > 0 ? `(${comments.length})` : ''}</Text>

        {/* Add comment input */}
        <View style={styles.addCommentRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor="#aaa"
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity style={styles.commentSubmitBtn} onPress={handleAddComment} disabled={commentSubmitting || !commentText.trim()}>
            {commentSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.commentSubmitText}>Post</Text>}
          </TouchableOpacity>
        </View>

        {comments.length === 0 ? (
          <Text style={styles.noFeedbackText}>No comments yet. Start the conversation!</Text>
        ) : (
          comments.map(item => <CommentItem key={item._id} item={item} />)
        )}
      </View>

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
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10 },
  pastBanner: { backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, marginBottom: 12, alignItems: 'center' },
  pastBannerText: { color: '#fff', fontWeight: 'bold' },
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
  completedBadge: { backgroundColor: '#888', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  completedText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  collected: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  target: { fontSize: 13, color: '#888' },
  progressBg: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden', marginBottom: 5 },
  progressFill: { height: '100%', backgroundColor: '#27ae60', borderRadius: 5 },
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
  // Reviews
  noFeedbackText: { color: '#999', fontSize: 14, textAlign: 'center', padding: 10 },
  feedbackItem: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 12 },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  feedbackAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  feedbackAvatarText: { color: '#fff', fontWeight: 'bold' },
  feedbackName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  anonTag: { color: '#888', fontWeight: 'normal', fontSize: 12 },
  feedbackStars: { fontSize: 14 },
  feedbackComment: { fontSize: 14, color: '#555', marginBottom: 8, lineHeight: 20 },
  feedbackPhoto: { width: '100%', height: 200, borderRadius: 10, marginBottom: 8 },
  feedbackDate: { fontSize: 12, color: '#999' },
  commentActions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#2e86de', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  editBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#e74c3c', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  deleteBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  addCommentButton: { marginTop: 15, backgroundColor: '#9b59b6', borderRadius: 10, padding: 12, alignItems: 'center' },
  addCommentButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  commentForm: { marginTop: 15, backgroundColor: '#f8f4ff', borderRadius: 10, padding: 15 },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  formLabel: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 6 },
  starContainer: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  star: { fontSize: 32 },
  formTextArea: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd', minHeight: 90, textAlignVertical: 'top', color: '#333', marginBottom: 12 },
  photoPickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#9b59b6', borderStyle: 'dashed', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 },
  photoPickerText: { color: '#9b59b6', fontWeight: 'bold', fontSize: 14 },
  formPhotoPreview: { width: '100%', height: 180, borderRadius: 8, marginBottom: 12 },
  anonymousRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  formButtons: { flexDirection: 'row', gap: 10 },
  submitCommentButton: { flex: 1, backgroundColor: '#9b59b6', borderRadius: 8, padding: 12, alignItems: 'center' },
  submitCommentText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelCommentButton: { flex: 1, borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelCommentText: { color: '#555', fontWeight: 'bold', fontSize: 15 },
  // Comments section
  addCommentRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  commentInput: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#ddd', color: '#333', minHeight: 44, textAlignVertical: 'top' },
  commentSubmitBtn: { backgroundColor: '#2e86de', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  commentSubmitText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  commentItem: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 10 },
  commentItemReply: { backgroundColor: '#f0f4f8', marginLeft: 20, marginTop: 6, marginBottom: 4 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  commentAuthor: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  commentDate: { fontSize: 11, color: '#aaa' },
  commentDeleteBtn: { backgroundColor: '#ffe0e0', borderRadius: 12, padding: 4, paddingHorizontal: 7 },
  commentDeleteText: { color: '#e74c3c', fontSize: 12, fontWeight: 'bold' },
  commentText: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 8 },
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
