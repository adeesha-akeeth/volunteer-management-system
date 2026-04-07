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
  const [donorsModal, setDonorsModal] = useState(null); // fundraiser obj
  const [donors, setDonors] = useState([]);
  const [donorsLoading, setDonorsLoading] = useState(false);

  // Comment form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [formPhoto, setFormPhoto] = useState(null);
  const [formAnonymous, setFormAnonymous] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [oppRes, feedbackRes] = await Promise.all([
        api.get(`/api/opportunities/${opportunityId}`),
        api.get(`/api/feedback/opportunity/${opportunityId}`)
      ]);
      const opp = oppRes.data;
      setOpportunity(opp);
      setFeedback(feedbackRes.data.feedback || []);
      setIsCreator(opp.createdBy?._id === user?.id);
      if (opp.endDate && new Date() > new Date(opp.endDate)) setIsPast(true);
    } catch {
      Alert.alert('Error', 'Failed to load opportunity details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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

  const handleSubmitComment = async () => {
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

  const handleDeleteComment = (feedbackId) => {
    Alert.alert('Delete Comment', 'Remove your review?', [
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

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;
  if (!opportunity) return <View style={styles.centered}><Text>Opportunity not found</Text></View>;

  return (
    <ScrollView style={styles.container}>
      {/* Banner */}
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
            <Text style={styles.pctText}>{pct}% funded · {fr.donorCount} donor{fr.donorCount !== 1 ? 's' : ''}</Text>

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
                    <TouchableOpacity onPress={() => handleDeleteComment(item._id)} style={styles.deleteBtn}><Text style={styles.deleteBtnText}>Del</Text></TouchableOpacity>
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
              <TouchableOpacity style={styles.submitCommentButton} onPress={handleSubmitComment} disabled={formLoading}>
                {formLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitCommentText}>{editingId ? 'Update' : 'Submit'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelCommentButton} onPress={closeForm}>
                <Text style={styles.cancelCommentText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  headerRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  categoryBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  ratingBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
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
