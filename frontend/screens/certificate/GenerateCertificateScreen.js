import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api';

const GenerateCertificateScreen = ({ route, navigation }) => {
  const { application, opportunity } = route.params;
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickLogo = async () => {
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
    if (!result.canceled) setLogo(result.assets[0]);
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      if (logo) {
        const formData = new FormData();
        formData.append('volunteerId', application.volunteer._id);
        formData.append('opportunityId', opportunity._id);
        formData.append('issuedBy', opportunity.organization);
        formData.append('hoursCompleted', '0');
        formData.append('description', description);
        const filename = logo.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('orgLogo', { uri: logo.uri, name: filename, type });
        await api.post('/api/certificates', formData);
      } else {
        await api.post('/api/certificates', {
          volunteerId: application.volunteer._id,
          opportunityId: opportunity._id,
          issuedBy: opportunity.organization,
          hoursCompleted: 0,
          description
        });
      }
      Alert.alert('Success', 'Certificate generated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to generate certificate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Generate Certificate</Text>

      {/* Read-only Opportunity Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Certificate Details</Text>

        <Text style={styles.label}>Opportunity Name</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyText}>{opportunity.title}</Text>
        </View>

        <Text style={styles.label}>Published By</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyText}>{opportunity.organization}</Text>
        </View>

        <Text style={styles.label}>Category</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyText}>{opportunity.category}</Text>
        </View>

        <Text style={styles.label}>Volunteer Name</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyText}>{application.volunteer?.name}</Text>
        </View>
      </View>

      {/* Editable Fields */}
      <View style={styles.card}>
        <Text style={styles.label}>Certificate Description (optional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g. This certificate is awarded for outstanding contribution to the beach cleanup drive..."
          placeholderTextColor="#aaa"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Opportunity Logo / Company Logo / Organization Badge (optional)</Text>
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickLogo}>
          <Text style={styles.imagePickerText}>
            {logo ? '✅ Logo Selected — Tap to change' : '📷 Upload Logo'}
          </Text>
        </TouchableOpacity>
        {logo && (
          <Image source={{ uri: logo.uri }} style={styles.logoPreview} resizeMode="contain" />
        )}
      </View>

      <TouchableOpacity style={styles.generateButton} onPress={handleGenerate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.generateButtonText}>🎓 Generate Certificate</Text>}
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
  infoCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  infoTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  readOnlyField: { backgroundColor: '#f0f4f8', borderRadius: 8, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  readOnlyText: { fontSize: 16, color: '#333' },
  textArea: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', minHeight: 100, textAlignVertical: 'top', color: '#333' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#f39c12', borderStyle: 'dashed', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 15 },
  imagePickerText: { color: '#f39c12', fontWeight: 'bold', fontSize: 16 },
  logoPreview: { width: '100%', height: 150, borderRadius: 10, marginBottom: 15 },
  generateButton: { backgroundColor: '#f39c12', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  generateButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { borderWidth: 1, borderColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 30 },
  cancelButtonText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});

export default GenerateCertificateScreen;