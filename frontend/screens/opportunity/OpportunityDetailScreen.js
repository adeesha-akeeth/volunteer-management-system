import React, { useState, useEffect, useContext } from 'react';

import api from '../../api';
import { AuthContext } from '../../context/AuthContext';
import { View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, TextInput, Image
} from 'react-native';

const OpportunityDetailScreen = ({ route, navigation }) => {
  const { opportunityId } = route.params;
  const { user } = useContext(AuthContext);
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');

  const fetchOpportunity = async () => {
    try {
      const response = await api.get(`/api/opportunities/${opportunityId}`);
      setOpportunity(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load opportunity details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunity();
  }, []);

  const handleApply = async () => {
    if (!coverLetter) {
      Alert.alert('Error', 'Please write a cover letter');
      return;
    }
    setApplying(true);
    try {
      const formData = new FormData();
      formData.append('opportunityId', opportunityId);
      formData.append('coverLetter', coverLetter);
      await api.post('/api/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Alert.alert('Success', 'Application submitted successfully!');
      setShowApplyForm(false);
      setCoverLetter('');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert('Confirm Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/opportunities/${opportunityId}`);
            Alert.alert('Success', 'Opportunity deleted successfully');
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete opportunity');
          }
        }
      }
    ]);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;
  if (!opportunity) return <View style={styles.centered}><Text>Opportunity not found</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>{opportunity.title}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{opportunity.category}</Text>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Text style={styles.detail}>🏢 {opportunity.organization}</Text>
        <Text style={styles.detail}>📍 {opportunity.location}</Text>
        <Text style={styles.detail}>📅 {new Date(opportunity.date).toDateString()}</Text>
        <Text style={styles.detail}>👥 {opportunity.spotsAvailable} spots available</Text>
        <Text style={styles.detail}>👤 Posted by: {opportunity.createdBy?.name}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{opportunity.description}</Text>
      </View>
      {opportunity.bannerImage ? (
  <Image
    source={{ uri: `https://volunteer-management-system-qux8.onrender.com/${opportunity.bannerImage}` }}
    style={styles.bannerImage}
    resizeMode="cover"
  />
) : null}
      {showApplyForm && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Cover Letter</Text>
          <TextInput
            style={styles.textArea}
            placeholderTextColor="#999" placeholder="Tell us why you want to volunteer..."
            value={coverLetter}
            onChangeText={setCoverLetter}
            multiline
            numberOfLines={4}
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleApply} disabled={applying}>
            {applying ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Application</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowApplyForm(false)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.buttonContainer}>
        {opportunity.createdBy?._id !== user?.id && !showApplyForm && (
          <TouchableOpacity style={styles.applyButton} onPress={() => setShowApplyForm(true)}>
            <Text style={styles.applyButtonText}>Apply Now</Text>
          </TouchableOpacity>
        )}
        {opportunity.createdBy?._id === user?.id && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Opportunity</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  bannerImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 15 },
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { backgroundColor: '#2e86de', borderRadius: 10, padding: 20, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', flex: 1 },
  categoryBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  detail: { fontSize: 16, color: '#555', marginBottom: 8 },
  description: { fontSize: 16, color: '#555', lineHeight: 24 },
  textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 10 },
  buttonContainer: { marginBottom: 30 },
  applyButton: { backgroundColor: '#27ae60', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  applyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  submitButton: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { borderWidth: 1, borderColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center' },
  cancelButtonText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 },
  deleteButton: { backgroundColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default OpportunityDetailScreen;