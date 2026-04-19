import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image, TextInput, Modal, FlatList,
  KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const CommentItem = ({ item, parentId, userId, handlers }) => {
  const {
    handleDeleteComment, handleCommentVote,
    setReplyingTo, replyingTo,
    setExpandedReplies, expandedReplies,
    handleAddReply, replyText, setReplyText, replyPhoto, pickReplyPhoto, replySubmitting,
    openEditComment, scrollToEnd, navigateToProfile
  } = handlers;

  const isOwn = item.author?._id === userId || item.author?.id === userId;
  const hasReplies = item.replies?.length > 0;
  const repliesExpanded = expandedReplies[item._id];

  return (
    <View style={[styles.commentItem, parentId && styles.commentItemReply]}>
      <View style={styles.commentHeader}>
        <TouchableOpacity onPress={() => navigateToProfile(item.author?._id)} activeOpacity={0.7}>
          <View style={styles.commentAvatar}>
            <Text style={styles.commentAvatarText}>{item.author?.name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => navigateToProfile(item.author?._id)} activeOpacity={0.7}>
            <Text style={styles.commentAuthor}>{item.author?.name || 'Unknown'}</Text>
          </TouchableOpacity>
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
              <Ionicons name="close" size={14} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {item.rating && <Text style={styles.commentRating}>{'⭐'.repeat(item.rating)}</Text>}
      <Text style={styles.commentText}>{item.text}</Text>
      {item.photo ? <Image source={{ uri: `${BASE_URL}/${item.photo}` }} style={styles.commentPhoto} resizeMode="cover" /> : null}

      <View style={styles.commentFooter}>
        <TouchableOpacity
          style={[styles.commentVoteBtn, item.userVote === 'like' && styles.commentVoteBtnLikeActive]}
          onPress={() => handleCommentVote(item, 'like')}
        >
          <Ionicons name="thumbs-up-outline" size={12} color={item.userVote === 'like' ? '#2e86de' : '#777'} />
          <Text style={styles.commentVoteBtnText}> {item.likes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.commentVoteBtn, item.userVote === 'dislike' && styles.commentVoteBtnDislikeActive]}
          onPress={() => handleCommentVote(item, 'dislike')}
        >
          <Ionicons name="thumbs-down-outline" size={12} color={item.userVote === 'dislike' ? '#e74c3c' : '#777'} />
          <Text style={styles.commentVoteBtnText}> {item.dislikes || 0}</Text>
        </TouchableOpacity>
        {!parentId && (
          <TouchableOpacity
            style={styles.replyBtn}
            onPress={() => {
              const opening = replyingTo?.id !== item._id;
              setReplyingTo(opening ? { id: item._id, authorName: item.author?.name } : null);
              if (opening) setTimeout(() => scrollToEnd?.(), 150);
            }}
          >
            <Ionicons name="return-down-back-outline" size={13} color="#555" />
            <Text style={styles.replyBtnText}> Reply</Text>
          </TouchableOpacity>
        )}
        {hasReplies && !parentId && (
          <TouchableOpacity style={styles.showRepliesBtn} onPress={() => setExpandedReplies(prev => ({ ...prev, [item._id]: !prev[item._id] }))}>
            <Text style={styles.showRepliesBtnText}>{repliesExpanded ? 'Hide' : `${item.replies.length} repl${item.replies.length === 1 ? 'y' : 'ies'}`}</Text>
          </TouchableOpacity>
        )}
      </View>

      {!parentId && replyingTo?.id === item._id && (
        <View style={styles.replyFormContainer}>
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
          <TouchableOpacity style={styles.replyPhotoBtn} onPress={pickReplyPhoto}>
            <Ionicons name={replyPhoto ? 'checkmark-circle' : 'camera-outline'} size={14} color="#9b59b6" />
            <Text style={styles.replyPhotoBtnText}>{replyPhoto ? 'Photo selected — tap to change' : 'Add photo (optional)'}</Text>
          </TouchableOpacity>
          {replyPhoto && <Image source={{ uri: replyPhoto.uri }} style={styles.replyPhotoPreview} resizeMode="cover" />}
        </View>
      )}

      {!parentId && repliesExpanded && item.replies.map(reply => (
        <CommentItem key={reply._id} item={reply} parentId={item._id} userId={userId} handlers={handlers} />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const DetailRow = ({ icon, label, value, valueStyle, onPress }) => (
  <TouchableOpacity style={styles.detailRow} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
    <View style={styles.detailIconWrap}>
      <Ionicons name={icon} size={17} color="#666" />
    </View>
    <View style={styles.detailTextWrap}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueStyle]}>{value}</Text>
    </View>
    {onPress && <Ionicons name="chevron-forward" size={14} color="#aaa" />}
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────

const OpportunityDetailScreen = ({ route, navigation }) => {
  const { opportunityId } = route.params;
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const confirm = useConfirm();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [isPast, setIsPast] = useState(false);
  const [myApplicationStatus, setMyApplicationStatus] = useState(null);

  const [myContributions, setMyContributions] = useState([]);

  // Log contribution modal
  const [contribModal, setContribModal] = useState(false);
  const [contribHours, setContribHours] = useState('');
  const [contribDesc, setContribDesc] = useState('');
  const [contribSubmitting, setContribSubmitting] = useState(false);

  const [donorsModal, setDonorsModal] = useState(null);
  const [donors, setDonors] = useState([]);
  const [donorsLoading, setDonorsLoading] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentPhoto, setCommentPhoto] = useState(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);

  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [editPhoto, setEditPhoto] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyPhoto, setReplyPhoto] = useState(null);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState({});

  const scrollViewRef = useRef(null);

  const [userRating, setUserRating] = useState(null);
  const [averageRating, setAverageRating] = useState(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);

  const [favLists, setFavLists] = useState([]);
  const [favModalVisible, setFavModalVisible] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const fetchData = async () => {
    try {
      const fetches = [
        api.get(`/api/opportunities/${opportunityId}`),
        api.get(`/api/comments/opportunity/${opportunityId}`),
        api.get(`/api/opportunity-ratings/${opportunityId}`)
      ];
      if (user) fetches.push(api.get('/api/applications/my'));

      const results = await Promise.all(fetches);
      const opp = results[0].data;
      setOpportunity(opp);
      setComments(results[1].data || []);
      setIsCreator(opp.createdBy?._id === user?.id);
      if (opp.endDate && new Date() > new Date(opp.endDate)) setIsPast(true);
      setUserRating(results[2].data.userRating);
      setAverageRating(results[2].data.averageRating);
      setRatingCount(results[2].data.ratingCount);

      if (user && results[3]) {
        const myApp = (results[3].data || []).find(a =>
          a.opportunity?._id === opportunityId || a.opportunity === opportunityId
        );
        const status = myApp?.status || null;
        setMyApplicationStatus(status);

        if (status === 'approved') {
          try {
            const contribRes = await api.get('/api/contributions/my-opportunities');
            const match = (contribRes.data || []).find(item =>
              item.opportunity?._id === opportunityId || item.opportunity === opportunityId
            );
            setMyContributions(match?.contributions || []);
          } catch {}
        }
      }
    } catch {
      toast.error('Error', 'Failed to load opportunity details');
    } finally {
      setLoading(false);
    }
  };

  const handleRateOpportunity = async (star) => {
    if (!user) { toast.warning('Login required', 'Please login to rate'); return; }
    setRatingLoading(true);
    try {
      if (userRating === star) {
        const res = await api.delete(`/api/opportunity-ratings/${opportunityId}`);
        setUserRating(null);
        setAverageRating(res.data.averageRating);
        setRatingCount(res.data.ratingCount);
      } else {
        const res = await api.post(`/api/opportunity-ratings/${opportunityId}`, { rating: star });
        setUserRating(res.data.userRating);
        setAverageRating(res.data.averageRating);
        setRatingCount(res.data.ratingCount);
      }
    } catch {
      toast.error('Error', 'Failed to save rating');
    } finally {
      setRatingLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenFav = async () => {
    setFavLoading(true);
    setFavModalVisible(true);
    try {
      const res = await api.get('/api/favourites');
      setFavLists(res.data);
    } catch {
      toast.error('Error', 'Failed to load your lists');
      setFavModalVisible(false);
    } finally {
      setFavLoading(false);
    }
  };

  const handleAddToFavList = async (listId) => {
    setFavModalVisible(false);
    try {
      await api.post(`/api/favourites/${listId}/add`, { opportunityId });
      toast.success('Saved!', `"${opportunity?.title}" added to your list.`);
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to add');
    }
  };

  const handleCreateFavAndAdd = async () => {
    setFavModalVisible(false);
    try {
      const res = await api.post('/api/favourites', { name: 'Favourites', description: 'My saved opportunities' });
      await api.post(`/api/favourites/${res.data._id}/add`, { opportunityId });
      toast.success('Saved!', `Created "Favourites" list and added "${opportunity?.title}".`);
    } catch {
      toast.error('Error', 'Failed to save');
    }
  };

  const handleVote = async (vote) => {
    try {
      const res = await api.post('/api/votes', { targetId: opportunityId, targetType: 'opportunity', vote });
      setOpportunity(prev => ({ ...prev, likes: res.data.likes, dislikes: res.data.dislikes, userVote: res.data.userVote }));
    } catch { toast.error('Error', 'Failed to vote'); }
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
    } catch { toast.error('Error', 'Failed to vote'); }
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
      if (commentPhoto) {
        const filename = commentPhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        fd.append('photo', { uri: commentPhoto.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
      }
      const res = await api.post('/api/comments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setComments(prev => [...prev, res.data]);
      setCommentText(''); setCommentPhoto(null); setShowCommentForm(false);
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to post comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const pickReplyPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setReplyPhoto(result.assets[0]);
  };

  const handleAddReply = async () => {
    if (!replyText.trim() || !replyingTo) return;
    setReplySubmitting(true);
    try {
      let res;
      if (replyPhoto) {
        const fd = new FormData();
        fd.append('opportunityId', opportunityId);
        fd.append('text', replyText);
        fd.append('parentCommentId', replyingTo.id);
        const filename = replyPhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        fd.append('photo', { uri: replyPhoto.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
        res = await api.post('/api/comments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        res = await api.post('/api/comments', { opportunityId, text: replyText, parentCommentId: replyingTo.id });
      }
      setComments(prev => prev.map(c =>
        c._id === replyingTo.id ? { ...c, replies: [...(c.replies || []), res.data] } : c
      ));
      setReplyText('');
      setReplyPhoto(null);
      setReplyingTo(null);
      setExpandedReplies(prev => ({ ...prev, [replyingTo.id]: true }));
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to post reply');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleDeleteComment = (commentId, parentId) => {
    confirm.show({
      title: 'Delete Comment',
      message: 'Delete this comment?',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/comments/${commentId}`);
          if (parentId) {
            setComments(prev => prev.map(c =>
              c._id === parentId ? { ...c, replies: c.replies.filter(r => r._id !== commentId) } : c
            ));
          } else {
            setComments(prev => prev.filter(c => c._id !== commentId));
          }
        } catch { toast.error('Error', 'Failed to delete'); }
      }
    });
  };

  const openEditComment = (comment) => {
    setEditingComment(comment);
    setEditText(comment.text);
    setEditPhoto(null);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setEditSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('text', editText);
      if (editPhoto) {
        const filename = editPhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        fd.append('photo', { uri: editPhoto.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
      }
      const res = await api.put(`/api/comments/${editingComment._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const updated = res.data;
      setComments(prev => prev.map(c => {
        if (c._id === editingComment._id) return { ...c, text: updated.text, photo: updated.photo, isUpdated: true };
        return { ...c, replies: c.replies.map(r => r._id === editingComment._id ? { ...r, text: updated.text, photo: updated.photo, isUpdated: true } : r) };
      }));
      setEditingComment(null);
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to update');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleLogContribution = async () => {
    if (!contribHours || isNaN(contribHours) || Number(contribHours) < 0.5) {
      toast.warning('Invalid', 'Please enter at least 0.5 hours');
      return;
    }
    setContribSubmitting(true);
    try {
      await api.post('/api/contributions', {
        opportunityId,
        hours: Number(contribHours),
        description: contribDesc
      });
      toast.success('Submitted!', 'Your contribution has been sent for verification.');
      setContribModal(false);
      setContribHours('');
      setContribDesc('');
      const contribRes = await api.get('/api/contributions/my-opportunities');
      const match = (contribRes.data || []).find(item =>
        item.opportunity?._id === opportunityId || item.opportunity === opportunityId
      );
      setMyContributions(match?.contributions || []);
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to submit');
    } finally {
      setContribSubmitting(false);
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

  const formatDateRange = (opp) => {
    if (opp.startDate && opp.endDate) return `${new Date(opp.startDate).toDateString()} — ${new Date(opp.endDate).toDateString()}`;
    if (opp.date) return new Date(opp.date).toDateString();
    return 'Date not set';
  };

  const commentHandlers = {
    handleDeleteComment, handleCommentVote,
    setReplyingTo, replyingTo,
    setExpandedReplies, expandedReplies,
    handleAddReply, replyText, setReplyText, replyPhoto, pickReplyPhoto, replySubmitting,
    openEditComment,
    scrollToEnd: () => scrollViewRef.current?.scrollToEnd({ animated: true }),
    navigateToProfile: (authorId) => {
      if (authorId) navigation.navigate('PublisherProfile', { publisherId: authorId });
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;
  if (!opportunity) return <View style={styles.centered}><Text>Opportunity not found</Text></View>;

  const likeActive = opportunity.userVote === 'like';
  const dislikeActive = opportunity.userVote === 'dislike';

  const hasContact = opportunity.responsibleName || opportunity.responsibleEmail || opportunity.responsiblePhone;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'android' ? 80 : 0}>
    <ScrollView ref={scrollViewRef} style={styles.container} keyboardShouldPersistTaps="handled">
      {opportunity.bannerImage ? (
        <Image source={{ uri: `${BASE_URL}/${opportunity.bannerImage}` }} style={styles.bannerImage} resizeMode="cover" />
      ) : null}

      {isPast && <View style={styles.pastBanner}><Text style={styles.pastBannerText}>This opportunity has ended</Text></View>}
      {opportunity.status === 'closed' && !isPast && (
        <View style={styles.closedBanner}><Text style={styles.closedBannerText}>Applications are currently closed</Text></View>
      )}

      <View style={styles.headerCard}>
        <Text style={styles.title}>{opportunity.title}</Text>
        <View style={styles.headerRow}>
          <View style={styles.categoryBadge}><Text style={styles.categoryText}>{opportunity.category}</Text></View>
          {opportunity.averageRating && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#f39c12" />
              <Text style={styles.ratingText}> {opportunity.averageRating} ({opportunity.reviewCount})</Text>
            </View>
          )}
        </View>
        <View style={styles.voteRow}>
          <TouchableOpacity style={[styles.voteBtn, likeActive && styles.voteBtnLikeActive]} onPress={() => handleVote('like')}>
            <Ionicons name="thumbs-up-outline" size={14} color="#fff" />
            <Text style={styles.voteBtnText}> {opportunity.likes || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.voteBtn, dislikeActive && styles.voteBtnDislikeActive]} onPress={() => handleVote('dislike')}>
            <Ionicons name="thumbs-down-outline" size={14} color="#fff" />
            <Text style={styles.voteBtnText}> {opportunity.dislikes || 0}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Details Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Details</Text>
        {opportunity.organization ? (
          <DetailRow icon="business-outline" label="Organization" value={opportunity.organization} />
        ) : null}
        <DetailRow icon="location-outline" label="Location" value={opportunity.location} />
        <DetailRow icon="calendar-outline" label="Date" value={formatDateRange(opportunity)} />
        <DetailRow
          icon="people-outline"
          label="Spots"
          value={opportunity.spotsLeft !== undefined
            ? `${opportunity.spotsLeft} of ${opportunity.spotsAvailable} spots left`
            : `${opportunity.spotsAvailable} spots`}
          valueStyle={opportunity.spotsLeft === 0 ? { color: '#e74c3c' } : opportunity.spotsLeft <= 2 ? { color: '#f39c12' } : undefined}
        />
        <DetailRow
          icon="person-outline"
          label="Posted by"
          value={opportunity.createdBy?.name}
          valueStyle={styles.publisherLink}
          onPress={() => navigation.navigate('PublisherProfile', { publisherId: opportunity.createdBy?._id })}
        />

        {hasContact && (
          <View style={styles.contactSection}>
            <Text style={styles.contactHeader}>Responsible Person</Text>
            {opportunity.responsibleName ? (
              <DetailRow icon="person-circle-outline" label="Name" value={opportunity.responsibleName} />
            ) : null}
            {opportunity.responsibleEmail ? (
              <DetailRow icon="mail-outline" label="Email" value={opportunity.responsibleEmail} />
            ) : null}
            {opportunity.responsiblePhone ? (
              <DetailRow icon="call-outline" label="Phone" value={opportunity.responsiblePhone} />
            ) : null}
          </View>
        )}
      </View>

      {/* About Card */}
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
          <TouchableOpacity style={styles.manageButton} onPress={() => navigation.navigate('CreatorOpportunityDetail', { opportunityId })}>
            <Ionicons name="settings-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.manageButtonText}>Manage Opportunity</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.applyRow}>
            <TouchableOpacity
              style={[styles.applyButton, (isPast || opportunity.status !== 'open') && styles.disabledButton]}
              onPress={() => {
                if (isPast) { toast.info('Ended', 'This opportunity has already ended.'); return; }
                if (opportunity.status === 'closed') { toast.info('Closed', 'Applications are closed for this opportunity.'); return; }
                if (myApplicationStatus === 'pending') {
                  toast.info('Already Applied', 'Your application is under review. Check My Applications for status.');
                  return;
                }
                if (myApplicationStatus === 'approved') {
                  toast.info('Already Accepted', 'You have already been accepted for this opportunity.');
                  return;
                }
                navigation.navigate('Apply', { opportunity });
              }}
              disabled={isPast || opportunity.status !== 'open'}
            >
              <Text style={styles.applyButtonText}>
                {isPast ? 'Opportunity Ended' : opportunity.status === 'closed' ? 'Applications Closed' : 'Apply Now'}
              </Text>
            </TouchableOpacity>
            {user && (
              <TouchableOpacity style={styles.saveButton} onPress={handleOpenFav}>
                <Ionicons name="bookmark-outline" size={22} color="#2e86de" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Contribution Stats — shown to accepted volunteers */}
      {myApplicationStatus === 'approved' && (
        <View style={styles.card}>
          <View style={styles.contribHeader}>
            <Ionicons name="trophy-outline" size={18} color="#27ae60" style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>My Contribution</Text>
          </View>
          <View style={styles.contribStatsRow}>
            <View style={styles.contribStatBox}>
              <Text style={styles.contribStatValue}>
                {myContributions.filter(c => c.status === 'verified').reduce((s, c) => s + c.hours, 0)}
              </Text>
              <Text style={styles.contribStatLabel}>hrs verified</Text>
            </View>
            <View style={styles.contribStatBox}>
              <Text style={[styles.contribStatValue, { color: '#f39c12' }]}>
                {myContributions.filter(c => c.status === 'pending').length}
              </Text>
              <Text style={styles.contribStatLabel}>pending</Text>
            </View>
            <View style={styles.contribStatBox}>
              <Text style={[styles.contribStatValue, { color: '#9b59b6' }]}>
                {myContributions.filter(c => c.status === 'verified').reduce((s, c) => s + c.hours, 0) * 10}
              </Text>
              <Text style={styles.contribStatLabel}>pts earned</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.logContribBtn} onPress={() => { setContribHours(''); setContribDesc(''); setContribModal(true); }}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.logContribBtnText}>Log Contribution Hours</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rate This Opportunity */}
      {user && !isCreator && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rate This Opportunity</Text>
          <View style={styles.ratingRow}>
            {averageRating ? (
              <Text style={styles.avgRatingText}>
                <Ionicons name="star" size={14} color="#f39c12" /> {averageRating} average ({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})
              </Text>
            ) : (
              <Text style={styles.noRatingText}>No ratings yet — be the first!</Text>
            )}
          </View>
          <Text style={styles.ratingHint}>
            {userRating ? `Your rating: ${userRating} star${userRating > 1 ? 's' : ''} — tap to change or tap again to remove` : 'Tap a star to rate:'}
          </Text>
          <View style={styles.ratingStars}>
            {[1,2,3,4,5].map(star => (
              <TouchableOpacity key={star} onPress={() => handleRateOpportunity(star)} disabled={ratingLoading}>
                <Ionicons name={userRating >= star ? 'star' : 'star-outline'} size={34} color="#f39c12" />
              </TouchableOpacity>
            ))}
            {ratingLoading && <ActivityIndicator size="small" color="#f39c12" style={{ marginLeft: 8 }} />}
          </View>
        </View>
      )}

      {/* Comments */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Comments {comments.length > 0 ? `(${comments.length})` : ''}</Text>

        {user && !showCommentForm && (
          <TouchableOpacity style={styles.addCommentButton} onPress={() => {
            setShowCommentForm(true);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
          }}>
            <Ionicons name="create-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.addCommentButtonText}>Write a Comment</Text>
          </TouchableOpacity>
        )}

        {showCommentForm && (
          <View style={styles.commentForm}>
            <Text style={styles.formTitle}>Write a Comment</Text>
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
              <Ionicons name={commentPhoto ? 'checkmark-circle' : 'camera-outline'} size={16} color="#9b59b6" style={{ marginRight: 6 }} />
              <Text style={styles.photoPickerText}>{commentPhoto ? 'Photo selected' : 'Add a Photo (optional)'}</Text>
            </TouchableOpacity>
            {commentPhoto && <Image source={{ uri: commentPhoto.uri }} style={styles.formPhotoPreview} resizeMode="cover" />}
            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.submitCommentButton} onPress={handleAddComment} disabled={commentSubmitting}>
                {commentSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitCommentText}>Post</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelCommentButton} onPress={() => { setShowCommentForm(false); setCommentText(''); setCommentPhoto(null); }}>
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

      {/* Log Contribution Modal */}
      <Modal visible={contribModal} transparent animationType="slide" onRequestClose={() => setContribModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setContribModal(false)}>
          <View style={styles.editModal} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.formTitle}>Log Contribution</Text>
            <Text style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{opportunity?.title}</Text>
            <Text style={styles.contribInputLabel}>Hours *</Text>
            <TextInput
              style={styles.contribInput}
              placeholder="e.g. 2.5"
              placeholderTextColor="#aaa"
              value={contribHours}
              onChangeText={setContribHours}
              keyboardType="decimal-pad"
            />
            <Text style={styles.contribInputHint}>Enter total hours as a number — decimals accepted (e.g. 1.5 = 1 hr 30 min).</Text>
            <Text style={styles.contribInputLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.contribInput, { minHeight: 70, textAlignVertical: 'top' }]}
              placeholder="What did you do?"
              placeholderTextColor="#aaa"
              value={contribDesc}
              onChangeText={setContribDesc}
              multiline
              numberOfLines={3}
            />
            <View style={styles.contribPointsPreview}>
              <Ionicons name="trophy-outline" size={14} color="#9b59b6" />
              <Text style={styles.contribPointsText}>
                {' '}Earns <Text style={{ fontWeight: 'bold', color: '#9b59b6' }}>{Math.floor(Number(contribHours || 0) * 10)} pts</Text> once verified
              </Text>
            </View>
            <View style={styles.formButtons}>
              <TouchableOpacity style={styles.submitCommentButton} onPress={handleLogContribution} disabled={contribSubmitting}>
                {contribSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitCommentText}>Submit</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelCommentButton} onPress={() => setContribModal(false)}>
                <Text style={styles.cancelCommentText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Comment Modal */}
      <Modal visible={!!editingComment} transparent animationType="slide" onRequestClose={() => setEditingComment(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditingComment(null)}>
          <View style={styles.editModal} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.formTitle}>Edit Comment</Text>
            <TextInput
              style={styles.formTextArea}
              value={editText}
              onChangeText={setEditText}
              multiline
              numberOfLines={4}
              placeholderTextColor="#aaa"
            />
            <TouchableOpacity style={styles.photoPickerButton} onPress={pickEditPhoto}>
              <Ionicons name={editPhoto ? 'checkmark-circle' : 'camera-outline'} size={16} color="#9b59b6" style={{ marginRight: 6 }} />
              <Text style={styles.photoPickerText}>{editPhoto ? 'New photo selected' : 'Change photo (optional)'}</Text>
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
              <Ionicons name="close" size={22} color="#fff" />
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

    {/* Favourites Modal */}
    <Modal visible={favModalVisible} transparent animationType="slide" onRequestClose={() => setFavModalVisible(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFavModalVisible(false)}>
        <View style={styles.editModal} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHandle} />
          <Text style={styles.formTitle}>Save to List</Text>
          {favLoading ? (
            <ActivityIndicator color="#2e86de" style={{ marginVertical: 20 }} />
          ) : favLists.length === 0 ? (
            <TouchableOpacity style={styles.favListItem} onPress={handleCreateFavAndAdd}>
              <Ionicons name="add-circle-outline" size={20} color="#2e86de" style={{ marginRight: 10 }} />
              <Text style={styles.favListItemText}>Create "Favourites" list & save</Text>
            </TouchableOpacity>
          ) : (
            <>
              {favLists.map(list => (
                <TouchableOpacity key={list._id} style={styles.favListItem} onPress={() => handleAddToFavList(list._id)}>
                  <Ionicons name="bookmark-outline" size={20} color="#2e86de" style={{ marginRight: 10 }} />
                  <Text style={styles.favListItemText}>{list.name}</Text>
                  <Text style={styles.favListItemCount}>{list.opportunities?.length || 0}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.favListItem, { marginTop: 4, borderTopWidth: 1, borderTopColor: '#f0f0f0' }]} onPress={handleCreateFavAndAdd}>
                <Ionicons name="add-circle-outline" size={20} color="#888" style={{ marginRight: 10 }} />
                <Text style={[styles.favListItemText, { color: '#888' }]}>Create new list</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>

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
  ratingBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' },
  ratingText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  voteRow: { flexDirection: 'row', gap: 10 },
  voteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  voteBtnLikeActive: { backgroundColor: 'rgba(46,134,222,0.5)', borderColor: '#fff' },
  voteBtnDislikeActive: { backgroundColor: 'rgba(231,76,60,0.4)', borderColor: '#fff' },
  voteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  // Detail rows
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detailIconWrap: { width: 30, alignItems: 'center', paddingTop: 2 },
  detailTextWrap: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontSize: 15, color: '#333', fontWeight: '500' },
  publisherLink: { color: '#2e86de' },
  // Contact section
  contactSection: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  contactHeader: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
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
  applyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  applyButton: { flex: 1, backgroundColor: '#27ae60', borderRadius: 10, padding: 15, alignItems: 'center' },
  disabledButton: { backgroundColor: '#aaa' },
  applyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  saveButton: { backgroundColor: '#e8f4fd', borderRadius: 10, padding: 15, borderWidth: 1.5, borderColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  manageButton: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10, flexDirection: 'row', justifyContent: 'center' },
  manageButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  favListItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  favListItemText: { flex: 1, fontSize: 15, color: '#333', fontWeight: '600' },
  favListItemCount: { fontSize: 13, color: '#aaa', fontWeight: 'bold' },
  // Rating
  ratingRow: { marginBottom: 6 },
  avgRatingText: { fontSize: 15, color: '#f39c12', fontWeight: 'bold' },
  noRatingText: { fontSize: 13, color: '#aaa' },
  ratingHint: { fontSize: 12, color: '#888', marginBottom: 8 },
  ratingStars: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  // Comments
  noFeedbackText: { color: '#999', fontSize: 14, textAlign: 'center', padding: 10 },
  addCommentButton: { marginBottom: 14, backgroundColor: '#9b59b6', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  addCommentButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  commentForm: { marginBottom: 14, backgroundColor: '#f8f4ff', borderRadius: 10, padding: 15 },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  formTextArea: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd', minHeight: 90, textAlignVertical: 'top', color: '#333', marginBottom: 12 },
  photoPickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#9b59b6', borderStyle: 'dashed', borderRadius: 8, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  photoPickerText: { color: '#9b59b6', fontWeight: 'bold', fontSize: 14 },
  formPhotoPreview: { width: '100%', height: 180, borderRadius: 8, marginBottom: 12 },
  formButtons: { flexDirection: 'row', gap: 10 },
  submitCommentButton: { flex: 1, backgroundColor: '#9b59b6', borderRadius: 8, padding: 12, alignItems: 'center' },
  submitCommentText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelCommentButton: { flex: 1, borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelCommentText: { color: '#555', fontWeight: 'bold', fontSize: 15 },
  commentItem: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 10 },
  commentItemReply: { backgroundColor: '#f0f4f8', marginLeft: 20, marginTop: 6, marginBottom: 4 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  commentAuthor: { fontSize: 13, fontWeight: 'bold', color: '#2e86de' },
  commentDate: { fontSize: 11, color: '#aaa' },
  updatedLabel: { fontSize: 10, color: '#f39c12', fontStyle: 'italic' },
  commentActions: { flexDirection: 'row', gap: 6 },
  editBtn: { backgroundColor: '#2e86de', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  editBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  commentDeleteBtn: { backgroundColor: '#ffe0e0', borderRadius: 12, padding: 5 },
  commentRating: { fontSize: 14, marginBottom: 4 },
  commentText: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 6 },
  commentPhoto: { width: '100%', height: 160, borderRadius: 8, marginBottom: 8 },
  commentFooter: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  commentVoteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: '#ddd' },
  commentVoteBtnLikeActive: { backgroundColor: '#e8f4fd', borderColor: '#2e86de' },
  commentVoteBtnDislikeActive: { backgroundColor: '#ffe8e8', borderColor: '#e74c3c' },
  commentVoteBtnText: { fontSize: 12, color: '#555' },
  replyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4f8', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#ddd' },
  replyBtnText: { fontSize: 12, color: '#555', fontWeight: '600' },
  showRepliesBtn: { backgroundColor: '#e8f4fd', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  showRepliesBtnText: { fontSize: 12, color: '#2e86de', fontWeight: '600' },
  replyFormContainer: { marginTop: 8 },
  replyInputRow: { flexDirection: 'row', gap: 8 },
  replyInput: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10, fontSize: 13, borderWidth: 1, borderColor: '#ddd', color: '#333', minHeight: 38, textAlignVertical: 'top' },
  replySubmitBtn: { backgroundColor: '#2e86de', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' },
  replySubmitText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  replyPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, padding: 8, backgroundColor: '#f8f4ff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  replyPhotoBtnText: { fontSize: 12, color: '#9b59b6', fontWeight: '600' },
  replyPhotoPreview: { width: 80, height: 80, borderRadius: 8, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  editModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  donorsModal: { flex: 1, backgroundColor: '#f0f4f8' },
  donorsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27ae60', padding: 20, paddingTop: 15 },
  donorsTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1 },
  donorsCloseBtn: { padding: 5 },
  donorsSubtitle: { fontSize: 13, color: '#888', paddingHorizontal: 15, paddingTop: 10 },
  noDonorsText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 },
  donorCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  donorCardTop: { borderLeftWidth: 4, borderLeftColor: '#f39c12' },
  donorRank: { width: 36, alignItems: 'center' },
  donorRankText: { fontSize: 22 },
  donorName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  donorMessage: { fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 2 },
  donorDate: { fontSize: 11, color: '#aaa', marginTop: 3 },
  donorAmount: { fontSize: 16, fontWeight: 'bold', color: '#27ae60' },
  // Contribution stats (accepted volunteer view)
  contribHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  contribStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  contribStatBox: { flex: 1, backgroundColor: '#f0fff4', borderRadius: 10, padding: 10, alignItems: 'center' },
  contribStatValue: { fontSize: 22, fontWeight: 'bold', color: '#27ae60' },
  contribStatLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  logContribBtn: { backgroundColor: '#27ae60', borderRadius: 10, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logContribBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  contribInputLabel: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 6 },
  contribInputHint: { fontSize: 11, color: '#999', marginTop: -10, marginBottom: 14, lineHeight: 16 },
  contribInput: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#ddd', color: '#333', marginBottom: 14 },
  contribPointsPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f4ff', borderRadius: 10, padding: 12, marginBottom: 16 },
  contribPointsText: { fontSize: 13, color: '#555' }
});

export default OpportunityDetailScreen;
