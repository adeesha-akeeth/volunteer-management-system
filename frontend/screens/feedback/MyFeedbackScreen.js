import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
  TextInput, RefreshControl
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api';

const MyFeedbackScreen = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [applications, setApplications] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchFeedback = async () => {
    try {
      const response = await api.get('/api/feedback/my');
      setFeedbacks(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load feedback');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const response = await api.get('/api/applications/my');
      setApplications(response.data);
    } catch (error) {
      console.log('Failed to load applications');
    }
  };

  useEffect(() => {
    fetchFeedback();
    fetchApplications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeedback();
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
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedOpportunity || !rating) {
      Alert.alert('Error', 'Please select an opportunity and rating');
      return;
    }
    if (isNaN(rating) || Number(rating) < 1 || Number(rating) > 5) {
      Alert.alert('Error', 'Rating must be between 1 and 5');
      return;
    }
    setSubmitting(true);
    try {
      if (photo) {
        const formData = new FormData();
        formData.append('opportunityId', selectedOpportunity._id);
        formData.append('rating', rating);
        formData.append('comment', comment);
        const filename = photo.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('photo', { uri: photo.uri, name: filename, type });
        await api.post('/api/feedback', formData);
      } else {
        await api.post('/api/feedback', {
          opportunityId: selectedOpportunity._id,
          rating,
          comment
        });
      }
      Alert.alert('Success', 'Feedback submitted successfully!');
      setShowForm(false);
      setSelectedOpportunity(null);
      setRating('');
      setComment('');
      setPhoto(null);
      fetchFeedback();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (feedbackId) => {
    Alert.alert('Delete Feedback', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/feedback/${feedbackId}`);
            Alert.alert('Success', 'Feedback deleted');
            fetchFeedback();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete feedback');
          }
        }
      }
    ]);
  };

  const renderStars = (rating) => {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += i <= rating ? '⭐' : '☆';
    }
    return stars;
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.opportunity?.title}</Text>
        <Text style={styles.stars}>{renderStars(item.rating)}</Text>
      </View>
      <Text style={styles.cardDetail}>🏢 {item.opportunity?.organization}</Text>
      {item.comment ? <Text style={styles.cardDetail}>💬 {item.comment}</Text> : null}
      <Text style={styles.cardDate}>📅 {new Date(item.createdAt).toDateString()}</Text>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item._id)}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>My Reviews</Text>
        <Text style={styles.summaryCount}>{feedbacks.length} feedback submitted</Text>
      </View>

      <Text style={styles.heading}>My Feedback</Text>

      <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
        <Text style={styles.addButtonText}>{showForm ? 'Cancel' : '+ Submit Feedback'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.form}>
          {/* Opportunity Selector */}
          <Text style={styles.formLabel}>Select Opportunity:</Text>
          {applications.length === 0 ? (
            <Text style={styles.noAppsText}>You haven't applied to any opportunities yet!</Text>
          ) : (
            applications.map((app) => (
              <TouchableOpacity
                key={app._id}
                style={[
                  styles.opportunityOption,
                  selectedOpportunity?._id === app.opportunity?._id && styles.opportunityOptionActive
                ]}
                onPress={() => setSelectedOpportunity(app.opportunity)}
              >
                <Text style={[
                  styles.opportunityOptionText,
                  selectedOpportunity?._id === app.opportunity?._id && styles.opportunityOptionTextActive
                ]}>
                  {app.opportunity?.title} — {app.opportunity?.organization}
                </Text>
              </TouchableOpacity>
            ))
          )}

          {/* Star Rating Selector */}
          <Text style={styles.formLabel}>Rating:</Text>
          <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star.toString())}>
                <Text style={styles.starButton}>
                  {Number(rating) >= star ? '⭐' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.textArea}
            placeholder="Comment (optional)"
            placeholderTextColor="#999"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickPhoto}>
            <Text style={styles.imagePickerText}>
              {photo ? '✅ Photo Selected' : '📷 Upload Photo (optional)'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitFeedback} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Feedback</Text>}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={feedbacks}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No feedback submitted yet</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { backgroundColor: '#9b59b6', borderRadius: 10, padding: 20, marginBottom: 15, alignItems: 'center' },
  summaryTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  summaryCount: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  addButton: { backgroundColor: '#9b59b6', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 15 },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  form: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  formLabel: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  opportunityOption: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  opportunityOptionActive: { backgroundColor: '#9b59b6', borderColor: '#9b59b6' },
  opportunityOptionText: { color: '#333', fontSize: 14 },
  opportunityOptionTextActive: { color: '#fff', fontWeight: 'bold' },
  noAppsText: { color: '#999', fontSize: 14, marginBottom: 10, textAlign: 'center' },
  starContainer: { flexDirection: 'row', marginBottom: 15, gap: 5 },
  starButton: { fontSize: 32 },
  textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#9b59b6', borderStyle: 'dashed', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  imagePickerText: { color: '#9b59b6', fontWeight: 'bold' },
  submitButton: { backgroundColor: '#9b59b6', borderRadius: 8, padding: 12, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
  stars: { fontSize: 16 },
  cardDetail: { color: '#555', marginBottom: 4, fontSize: 14 },
  cardDate: { color: '#999', fontSize: 12, marginTop: 5 },
  deleteButton: { backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  deleteButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 }
});

export default MyFeedbackScreen;