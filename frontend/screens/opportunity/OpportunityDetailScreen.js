import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, Switch
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
  const [isSlotsFilled, setIsSlotsFilled] = useState(false);
  const [collectedAmount, setCollectedAmount] = useState(0);

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
      const [oppResponse, feedbackResponse] = await Promise.all([
        api.get(`/api/opportunities/${opportunityId}`),
        api.get(`/api/feedback/opportunity/${opportunityId}`)
      ]);
      const opp = oppResponse.data;
      setOpportunity(opp);
      setFeedback(feedbackResponse.data.feedback || []);
      setIsCreator(opp.createdBy?._id === user?.id);

      const now = new Date();
      if (opp.endDate && now > new Date(opp.endDate)) {
        setIsPast(true);
      }

      if (opp.fundraiser?.enabled) {
        try {
          const donRes = await api.get(`/api/donations/opportunity/${opportunityId}`);
          setCollectedAmount(donRes.data.confirmedTotal || 0);
        } catch (_) {
          // non-creators get 403; compute from fundraiser list instead
          try {
            const listRes = await api.get('/api/opportunities/fundraisers/list');
            const match = listRes.data.find(o => o._id === opportunityId);
            if (match) setCollectedAmount(match.fundraiser?.collectedAmount || 0);
          } catch (__) {}
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load opportunity details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Determine if current user already has feedback
  const myFeedback = feedback.find(f => f.volunteer?._id === user?.id);

  const handleDelete = async () => {
    Alert.alert('Confirm Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/opportunities/${opportunityId}`);
            Alert.alert('Success', 'Opportunity deleted');
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete');
          }
        }
      }
    ]);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7
    });
    if (!result.canceled) setFormPhoto(result.assets[0]);
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormRating(0);
    setFormComment('');
    setFormPhoto(null);
    setFormAnonymous(false);
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingId(item._id);
    setFormRating(item.rating);
    setFormComment(item.comment || '');
    setFormPhoto(null);
    setFormAnonymous(item.anonymous || false);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormRating(0);
    setFormComment('');
    setFormPhoto(null);
    setFormAnonymous(false);
  };

  const handleSubmitComment = async () => {
    if (!formRating) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    setFormLoading(true);
    try {
      const buildForm = (fd) => {
        fd.append('opportunityId', opportunityId);
        fd.append('rating', formRating.toString());
        fd.append('comment', formComment);
        fd.append('anonymous', formAnonymous.toString());
        if (formPhoto) {
          const filename = formPhoto.uri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          fd.append('photo', { uri: formPhoto.uri, name: filename, type });
        }
        return fd;
      };

      if (editingId) {
        const formData = new FormData();
        formData.append('rating', formRating.toString());
        formData.append('comment', formComment);
        formData.append('anonymous', formAnonymous.toString());
        if (formPhoto) {
          const filename = formPhoto.uri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          formData.append('photo', { uri: formPhoto.uri, name: filename, type });
        }
        await api.put(`/api/feedback/${editingId}`, formData);
      } else {
        const formData = buildForm(new FormData());
        await api.post('/api/feedback', formData);
      }

      closeForm();
      await fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteComment = (feedbackId) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete your comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/feedback/${feedbackId}`);
            fetchData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete comment');
          }
        }
      }
    ]);
  };

  const renderStars = (rating) => {
    let stars = '';
    for (let i = 1; i <= 5; i++) stars += i <= rating ? '⭐' : '☆';
    return stars;
  };

  const formatDateRange = (opp) => {
    if (opp.startDate && opp.endDate) {
      return `${new Date(opp.startDate).toDateString()} — ${new Date(opp.endDate).toDateString()}`;
    }
    if (opp.startDate) return new Date(opp.startDate).toDateString();
    if (opp.date) return new Date(opp.date).toDateString();
    return 'Date not set';
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;
  if (!opportunity) return <View style={styles.centered}><Text>Opportunity not found</Text></View>;

  const canApply = !isCreator && !isPast && !isSlotsFilled;

  return (
    <ScrollView style={styles.container}>
      {/* Banner Image */}
      {opportunity.bannerImage ? (
        <Image
          source={{ uri: `${BASE_URL}/${opportunity.bannerImage}` }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
      ) : null}

      {/* Past Event Banner */}
      {isPast && (
        <View style={styles.pastBanner}>
          <Text style={styles.pastBannerText}>⏰ This opportunity has ended</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>{opportunity.title}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{opportunity.category}</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Details</Text>
        {opportunity.organization ? <Text style={styles.detail}>🏢 {opportunity.organization}</Text> : null}
        <Text style={styles.detail}>📍 {opportunity.location}</Text>
        <Text style={styles.detail}>📅 {formatDateRange(opportunity)}</Text>
        <Text style={[styles.detail, isSlotsFilled ? styles.filledText : null]}>
          👥 {isSlotsFilled ? 'All spots filled' : `${opportunity.spotsAvailable} spots available`}
        </Text>
        <Text style={styles.detail}>👤 Posted by: {opportunity.createdBy?.name}</Text>
        {opportunity.responsibleName ? <Text style={styles.detail}>🙋 Contact: {opportunity.responsibleName}</Text> : null}
        {opportunity.responsibleEmail ? <Text style={styles.detail}>✉️ {opportunity.responsibleEmail}</Text> : null}
        {opportunity.responsiblePhone ? <Text style={styles.detail}>📞 {opportunity.responsiblePhone}</Text> : null}
      </View>

      {/* Description */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About This Opportunity</Text>
        <Text style={styles.description}>{opportunity.description}</Text>
      </View>

      {/* Fundraiser Bar */}
      {opportunity.fundraiser?.enabled && (
        <View style={styles.fundraiserCard}>
          <Text style={styles.fundraiserTitle}>Fundraiser</Text>
          <View style={styles.fundraiserAmounts}>
            <Text style={styles.fundraiserCollected}>LKR {collectedAmount.toLocaleString()}</Text>
            <Text style={styles.fundraiserTarget}> of LKR {opportunity.fundraiser.targetAmount?.toLocaleString()} goal</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, opportunity.fundraiser.targetAmount > 0
                  ? (collectedAmount / opportunity.fundraiser.targetAmount) * 100
                  : 0)}%`
              }
            ]} />
          </View>
          <Text style={styles.fundraiserPct}>
            {opportunity.fundraiser.targetAmount > 0
              ? `${Math.round((collectedAmount / opportunity.fundraiser.targetAmount) * 100)}% funded`
              : '0% funded'}
          </Text>
          {!isCreator && (
            <TouchableOpacity
              style={styles.donateNowButton}
              onPress={() => navigation.navigate('Donate', { opportunityId, opportunityTitle: opportunity.title })}
            >
              <Text style={styles.donateNowButtonText}>Donate Now</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {isCreator ? (
          <>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => navigation.navigate('CreatorOpportunityDetail', { opportunityId })}
            >
              <Text style={styles.manageButtonText}>👥 Manage Applications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete Opportunity</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.applyButton, !canApply && styles.disabledButton]}
            onPress={() => {
              if (isPast) {
                Alert.alert('Ended', 'This opportunity has already ended.');
              } else if (isSlotsFilled) {
                Alert.alert('Full', 'All spots for this opportunity are filled.');
              } else {
                navigation.navigate('Apply', { opportunity });
              }
            }}
            disabled={!canApply}
          >
            <Text style={styles.applyButtonText}>
              {isPast ? 'Opportunity Ended' : isSlotsFilled ? 'Slots Filled' : 'Apply Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Comments / Reviews Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Reviews & Comments {feedback.length > 0 ? `(${feedback.length})` : ''}
        </Text>

        {feedback.length === 0 ? (
          <Text style={styles.noFeedbackText}>No reviews yet. Be the first to share your experience!</Text>
        ) : (
          feedback.map((item) => (
            <View key={item._id} style={styles.feedbackItem}>
              <View style={styles.feedbackHeader}>
                <View style={styles.feedbackAvatar}>
                  <Text style={styles.feedbackAvatarText}>
                    {item.anonymous ? 'A' : item.volunteer?.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedbackName}>
                    {item.volunteer?.name}
                    {item.anonymous && <Text style={styles.anonTag}> (anonymous)</Text>}
                  </Text>
                  <Text style={styles.feedbackStars}>{renderStars(item.rating)}</Text>
                </View>
                {/* Edit/Delete if own comment */}
                {item.volunteer?._id === user?.id && (
                  <View style={styles.commentActions}>
                    <TouchableOpacity onPress={() => openEditForm(item)} style={styles.editBtn}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteComment(item._id)} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {item.comment ? <Text style={styles.feedbackComment}>{item.comment}</Text> : null}
              {item.photo ? (
                <Image
                  source={{ uri: `${BASE_URL}/${item.photo}` }}
                  style={styles.feedbackPhoto}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={styles.feedbackDate}>{new Date(item.createdAt).toDateString()}</Text>
            </View>
          ))
        )}

        {/* Add Comment Button — only if logged in and no existing comment */}
        {user && !myFeedback && !showForm && (
          <TouchableOpacity style={styles.addCommentButton} onPress={openAddForm}>
            <Text style={styles.addCommentButtonText}>✍️ Write a Review</Text>
          </TouchableOpacity>
        )}

        {/* Inline Comment Form */}
        {showForm && (
          <View style={styles.commentForm}>
            <Text style={styles.formTitle}>{editingId ? 'Edit Your Review' : 'Write a Review'}</Text>

            <Text style={styles.formLabel}>Rating *</Text>
            <View style={styles.starContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setFormRating(star)}>
                  <Text style={styles.star}>{formRating >= star ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Comment</Text>
            <TextInput
              style={styles.formTextArea}
              placeholder="Share your experience..."
              placeholderTextColor="#aaa"
              value={formComment}
              onChangeText={setFormComment}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={styles.photoPickerButton} onPress={pickPhoto}>
              <Text style={styles.photoPickerText}>
                {formPhoto ? '✅ Photo selected — tap to change' : '📷 Add a Photo (optional)'}
              </Text>
            </TouchableOpacity>
            {formPhoto && (
              <Image source={{ uri: formPhoto.uri }} style={styles.formPhotoPreview} resizeMode="cover" />
            )}

            <View style={styles.anonymousRow}>
              <Text style={styles.formLabel}>Post anonymously</Text>
              <Switch
                value={formAnonymous}
                onValueChange={setFormAnonymous}
                trackColor={{ false: '#ccc', true: '#2e86de' }}
                thumbColor={formAnonymous ? '#fff' : '#fff'}
              />
            </View>
            {formAnonymous && (
              <Text style={styles.anonNote}>Your name will show as "Anonymous User"</Text>
            )}

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={styles.submitCommentButton}
                onPress={handleSubmitComment}
                disabled={formLoading}
              >
                {formLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitCommentText}>{editingId ? 'Update' : 'Submit'}</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelCommentButton} onPress={closeForm}>
                <Text style={styles.cancelCommentText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10 },
  pastBanner: { backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, marginBottom: 12, alignItems: 'center' },
  pastBannerText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  headerCard: { backgroundColor: '#2e86de', borderRadius: 10, padding: 20, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', flex: 1 },
  categoryBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  detail: { fontSize: 15, color: '#555', marginBottom: 7 },
  filledText: { color: '#e74c3c', fontWeight: 'bold' },
  description: { fontSize: 16, color: '#555', lineHeight: 24 },
  buttonContainer: { marginBottom: 15 },
  applyButton: { backgroundColor: '#27ae60', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  disabledButton: { backgroundColor: '#aaa' },
  applyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  manageButton: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  manageButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  deleteButton: { backgroundColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  deleteButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  fundraiserCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#27ae60' },
  fundraiserTitle: { fontSize: 16, fontWeight: 'bold', color: '#27ae60', marginBottom: 8 },
  fundraiserAmounts: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  fundraiserCollected: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  fundraiserTarget: { fontSize: 14, color: '#888' },
  progressBarBg: { height: 12, backgroundColor: '#e0e0e0', borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', backgroundColor: '#27ae60', borderRadius: 6 },
  fundraiserPct: { fontSize: 12, color: '#888', marginBottom: 12 },
  donateNowButton: { backgroundColor: '#27ae60', borderRadius: 8, padding: 12, alignItems: 'center' },
  donateNowButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
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
  editBtn: { backgroundColor: '#2e86de', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  editBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  deleteBtn: { backgroundColor: '#e74c3c', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  deleteBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  addCommentButton: { marginTop: 15, backgroundColor: '#9b59b6', borderRadius: 10, padding: 12, alignItems: 'center' },
  addCommentButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  commentForm: { marginTop: 15, backgroundColor: '#f8f4ff', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#d7bfee' },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  formLabel: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 6 },
  starContainer: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  star: { fontSize: 32 },
  formTextArea: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#ddd', minHeight: 90, textAlignVertical: 'top', color: '#333', marginBottom: 12 },
  photoPickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#9b59b6', borderStyle: 'dashed', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 },
  photoPickerText: { color: '#9b59b6', fontWeight: 'bold', fontSize: 14 },
  formPhotoPreview: { width: '100%', height: 180, borderRadius: 8, marginBottom: 12 },
  anonymousRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  anonNote: { color: '#888', fontSize: 12, marginBottom: 12 },
  formButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  submitCommentButton: { flex: 1, backgroundColor: '#9b59b6', borderRadius: 8, padding: 12, alignItems: 'center' },
  submitCommentText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelCommentButton: { flex: 1, borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelCommentText: { color: '#555', fontWeight: 'bold', fontSize: 15 }
});

export default OpportunityDetailScreen;
