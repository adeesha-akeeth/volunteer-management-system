import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
  RefreshControl, TextInput
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api';

const MyApplicationsScreen = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [opportunityId, setOpportunityId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchApplications = async () => {
    try {
      const response = await api.get('/api/applications/my');
      setApplications(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplications();
  };

  const pickResume = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7
    });
    if (!result.canceled) {
      setResumeFile(result.assets[0]);
    }
  };

  const handleApply = async () => {
    if (!opportunityId || !coverLetter) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('opportunityId', opportunityId);
      formData.append('coverLetter', coverLetter);
      if (resumeFile) {
        formData.append('resumeFile', {
          uri: resumeFile.uri,
          type: 'image/jpeg',
          name: 'resume.jpg'
        });
      }
      await api.post('/api/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Alert.alert('Success', 'Application submitted successfully!');
      setShowForm(false);
      setOpportunityId('');
      setCoverLetter('');
      setResumeFile(null);
      fetchApplications();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to apply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (applicationId) => {
    Alert.alert('Withdraw Application', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/applications/${applicationId}`);
            Alert.alert('Success', 'Application withdrawn successfully');
            fetchApplications();
          } catch (error) {
            Alert.alert('Error', 'Failed to withdraw application');
          }
        }
      }
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#27ae60';
      case 'rejected': return '#e74c3c';
      default: return '#f39c12';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.opportunity?.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.cardDetail}>🏢 {item.opportunity?.organization}</Text>
      <Text style={styles.cardDetail}>📍 {item.opportunity?.location}</Text>
      <Text style={styles.cardDetail}>📅 {new Date(item.opportunity?.date).toDateString()}</Text>
      <Text style={styles.cardDetail}>📝 {item.coverLetter}</Text>
      <Text style={styles.cardDate}>Applied: {new Date(item.appliedAt).toDateString()}</Text>
      {item.status === 'pending' && (
        <TouchableOpacity style={styles.withdrawButton} onPress={() => handleWithdraw(item._id)}>
          <Text style={styles.withdrawButtonText}>Withdraw</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>My Applications</Text>

      <TouchableOpacity style={styles.applyButton} onPress={() => setShowForm(!showForm)}>
        <Text style={styles.applyButtonText}>{showForm ? 'Cancel' : '+ Apply to Opportunity'}</Text>
      </TouchableOpacity>

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Opportunity ID" value={opportunityId} onChangeText={setOpportunityId} />
          <TextInput style={styles.textArea} placeholder="Cover Letter" value={coverLetter} onChangeText={setCoverLetter} multiline numberOfLines={4} />
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickResume}>
            <Text style={styles.imagePickerText}>
              {resumeFile ? '✅ Resume Selected' : '📎 Upload Resume (optional)'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleApply} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Application</Text>}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={applications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>You haven't applied to any opportunities yet</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  applyButton: { backgroundColor: '#2e86de', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 15 },
  applyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  form: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16 },
  textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#2e86de', borderStyle: 'dashed', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  imagePickerText: { color: '#2e86de', fontWeight: 'bold' },
  submitButton: { backgroundColor: '#27ae60', borderRadius: 8, padding: 12, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cardDetail: { color: '#555', marginBottom: 4, fontSize: 14 },
  cardDate: { color: '#999', fontSize: 12, marginTop: 5 },
  withdrawButton: { backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  withdrawButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 }
});

export default MyApplicationsScreen;