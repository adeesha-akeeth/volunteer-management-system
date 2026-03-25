import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';

const ApplyScreen = ({ route, navigation }) => {
  const { opportunity } = route.params;
  const { user } = useContext(AuthContext);

  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [coverLetter, setCoverLetter] = useState('');
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
      aspect: [1, 1],
      quality: 0.7
    });
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const handleApply = async () => {
    if (!phone || !email || !coverLetter) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      if (photo) {
        const formData = new FormData();
        formData.append('opportunityId', opportunity._id);
        formData.append('phone', phone);
        formData.append('email', email);
        formData.append('coverLetter', coverLetter);
        const filename = photo.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('photo', { uri: photo.uri, name: filename, type });
        await api.post('/api/applications', formData);
      } else {
        await api.post('/api/applications', {
          opportunityId: opportunity._id,
          phone,
          email,
          coverLetter
        });
      }
      Alert.alert('Success', 'Application submitted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to apply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Opportunity Info */}
      <View style={styles.opportunityCard}>
        <Text style={styles.opportunityTitle}>{opportunity.title}</Text>
        <Text style={styles.opportunityOrg}>🏢 {opportunity.organization}</Text>
        <Text style={styles.opportunityLocation}>📍 {opportunity.location}</Text>
        <Text style={styles.opportunityDate}>📅 {new Date(opportunity.date).toDateString()}</Text>
      </View>

      <Text style={styles.sectionTitle}>Your Application</Text>
      <Text style={styles.sectionSubtitle}>Your details are pre-filled. You can change them if needed.</Text>

      <Text style={styles.label}>Phone Number *</Text>
      <TextInput
        style={styles.input}
        placeholder="Your phone number"
        placeholderTextColor="#aaa"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Email Address *</Text>
      <TextInput
        style={styles.input}
        placeholder="Your email address"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Why do you want to volunteer? *</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Tell the organizer why you're interested in this opportunity and what skills you bring..."
        placeholderTextColor="#aaa"
        value={coverLetter}
        onChangeText={setCoverLetter}
        multiline
        numberOfLines={5}
      />

      <Text style={styles.label}>Your Photo (optional)</Text>
      <TouchableOpacity style={styles.imagePickerButton} onPress={pickPhoto}>
        <Text style={styles.imagePickerText}>
          {photo ? '✅ Photo Selected — Tap to change' : '📷 Upload Your Photo'}
        </Text>
      </TouchableOpacity>
      {photo && (
        <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
      )}

      <TouchableOpacity style={styles.submitButton} onPress={handleApply} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Application</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  opportunityCard: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, marginBottom: 20 },
  opportunityTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  opportunityOrg: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 4 },
  opportunityLocation: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 4 },
  opportunityDate: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  sectionSubtitle: { fontSize: 13, color: '#888', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  textArea: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', minHeight: 120, textAlignVertical: 'top', color: '#333' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#2e86de', borderStyle: 'dashed', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 15 },
  imagePickerText: { color: '#2e86de', fontWeight: 'bold', fontSize: 16 },
  photoPreview: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 15 },
  submitButton: { backgroundColor: '#27ae60', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { borderWidth: 1, borderColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 30 },
  cancelButtonText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});

export default ApplyScreen;