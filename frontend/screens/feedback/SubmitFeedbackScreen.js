import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api';

const SubmitFeedbackScreen = ({ route, navigation }) => {
  const { opportunity } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

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
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!rating) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    setLoading(true);
    try {
      if (photo) {
        const formData = new FormData();
        formData.append('opportunityId', opportunity._id);
        formData.append('rating', rating.toString());
        formData.append('comment', comment);
        const filename = photo.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('photo', { uri: photo.uri, name: filename, type });
        await api.post('/api/feedback', formData);
      } else {
        await api.post('/api/feedback', {
          opportunityId: opportunity._id,
          rating: rating.toString(),
          comment
        });
      }
      Alert.alert('Success', 'Feedback submitted!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.opportunityCard}>
        <Text style={styles.opportunityTitle}>{opportunity.title}</Text>
        <Text style={styles.opportunityOrg}>🏢 {opportunity.organization}</Text>
      </View>

      <Text style={styles.sectionTitle}>Share Your Experience</Text>

      <Text style={styles.label}>How would you rate this opportunity?</Text>
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text style={styles.star}>{rating >= star ? '⭐' : '☆'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text style={styles.ratingText}>
          {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : 'Excellent!'}
        </Text>
      )}

      <Text style={styles.label}>Tell others about your experience</Text>
      <TextInput
        style={styles.textArea}
        placeholder="What did you enjoy? What could be improved? Would you recommend this opportunity to others?"
        placeholderTextColor="#aaa"
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={5}
      />

      <Text style={styles.label}>Add a Photo (optional)</Text>
      <TouchableOpacity style={styles.imagePickerButton} onPress={pickPhoto}>
        <Text style={styles.imagePickerText}>
          {photo ? '✅ Photo Selected — Tap to change' : '📷 Add a Photo'}
        </Text>
      </TouchableOpacity>
      {photo && (
        <Image source={{ uri: photo.uri }} style={styles.photoPreview} resizeMode="cover" />
      )}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Feedback</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  opportunityCard: { backgroundColor: '#9b59b6', borderRadius: 10, padding: 15, marginBottom: 20 },
  opportunityTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  opportunityOrg: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  starContainer: { flexDirection: 'row', marginBottom: 10, gap: 5 },
  star: { fontSize: 40 },
  ratingText: { fontSize: 16, color: '#9b59b6', fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  textArea: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', minHeight: 120, textAlignVertical: 'top', color: '#333' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#9b59b6', borderStyle: 'dashed', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 15 },
  imagePickerText: { color: '#9b59b6', fontWeight: 'bold', fontSize: 16 },
  photoPreview: { width: '100%', height: 200, borderRadius: 10, marginBottom: 15 },
  submitButton: { backgroundColor: '#9b59b6', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { borderWidth: 1, borderColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 30 },
  cancelButtonText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});

export default SubmitFeedbackScreen;