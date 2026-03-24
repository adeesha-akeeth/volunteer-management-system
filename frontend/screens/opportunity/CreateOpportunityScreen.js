import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api';

const CreateOpportunityScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [spotsAvailable, setSpotsAvailable] = useState('');
  const [category, setCategory] = useState('other');
  const [bannerImage, setBannerImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const categories = ['education', 'environment', 'health', 'community', 'animals', 'other'];

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7
    });
    if (!result.canceled) {
      setBannerImage(result.assets[0]);
    }
  };

  const handleCreate = async () => {
    if (!title || !description || !organization || !location || !date || !spotsAvailable) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('organization', organization);
      formData.append('location', location);
      formData.append('date', date);
      formData.append('spotsAvailable', spotsAvailable);
      formData.append('category', category);

      if (bannerImage) {
        formData.append('bannerImage', {
          uri: bannerImage.uri,
          type: 'image/jpeg',
          name: 'banner.jpg'
        });
      }

      await api.post('/api/opportunities', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Alert.alert('Success', 'Opportunity created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create opportunity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Post New Opportunity</Text>

      <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Title" value={title} onChangeText={setTitle} />
      <TextInput style={styles.textArea} placeholderTextColor="#999" placeholder="Description" value={description} onChangeText={setDescription} multiline numberOfLines={4} />
      <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Organization Name" value={organization} onChangeText={setOrganization} />
      <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Location" value={location} onChangeText={setLocation} />
      <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Spots Available" value={spotsAvailable} onChangeText={setSpotsAvailable} keyboardType="numeric" />

      <Text style={styles.label}>Select Category:</Text>
      <View style={styles.categoryContainer}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryButton, category === cat && styles.categoryButtonActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Banner Image (optional):</Text>
      <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
        <Text style={styles.imagePickerText}>
          {bannerImage ? '✅ Image Selected' : '📷 Pick Banner Image'}
        </Text>
      </TouchableOpacity>
      {bannerImage && (
        <Image source={{ uri: bannerImage.uri }} style={styles.previewImage} />
      )}

      <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Opportunity</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  textArea: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', minHeight: 100, textAlignVertical: 'top' },
  label: { fontSize: 16, color: '#333', marginBottom: 10, fontWeight: 'bold' },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryButton: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2e86de' },
  categoryButtonActive: { backgroundColor: '#2e86de' },
  categoryText: { color: '#2e86de', fontWeight: 'bold' },
  categoryTextActive: { color: '#fff' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#2e86de', borderStyle: 'dashed', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 15 },
  imagePickerText: { color: '#2e86de', fontWeight: 'bold', fontSize: 16 },
  previewImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 15 },
  button: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { borderWidth: 1, borderColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 30 },
  cancelButtonText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});

export default CreateOpportunityScreen;