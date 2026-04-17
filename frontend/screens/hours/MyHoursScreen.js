import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity,
  TextInput, RefreshControl, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';

const MyHoursScreen = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [hours, setHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [applications, setApplications] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [hoursLogged, setHoursLogged] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchHours = async () => {
    try {
      const response = await api.get('/api/hours/my');
      setHours(response.data);
    } catch (error) {
      toast.error('Error', 'Failed to load hours');
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
    fetchHours();
    fetchApplications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHours();
  };

  const totalVerifiedHours = hours
    .filter(h => h.status === 'verified')
    .reduce((sum, h) => sum + h.hoursLogged, 0);

  const pickProofImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.warning('Permission required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7
    });
    if (!result.canceled) {
      setProofImage(result.assets[0]);
    }
  };

  const handleLogHours = async () => {
    if (!selectedOpportunity || !hoursLogged || !date) {
      toast.error('Error', 'Please select an opportunity, hours and date');
      return;
    }
    setSubmitting(true);
    try {
      if (proofImage) {
        const formData = new FormData();
        formData.append('opportunityId', selectedOpportunity._id);
        formData.append('hoursLogged', hoursLogged);
        formData.append('date', date);
        formData.append('description', description);
        const filename = proofImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('proofImage', { uri: proofImage.uri, name: filename, type });
        await api.post('/api/hours', formData);
      } else {
        await api.post('/api/hours', {
          opportunityId: selectedOpportunity._id,
          hoursLogged,
          date,
          description
        });
      }
      toast.success('Success', 'Hours logged successfully!');
      setShowForm(false);
      setSelectedOpportunity(null);
      setHoursLogged('');
      setDate('');
      setDescription('');
      setProofImage(null);
      fetchHours();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || error.message || 'Failed to log hours');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (hoursId) => {
    confirm.show({
      title: 'Delete Record',
      message: 'Are you sure you want to delete this hours record?',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/hours/${hoursId}`);
          toast.success('Deleted', 'Hours record deleted');
          fetchHours();
        } catch (error) {
          toast.error('Error', 'Failed to delete record');
        }
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return '#27ae60';
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
      <Text style={styles.cardDetail}>⏱ {item.hoursLogged} hours</Text>
      <Text style={styles.cardDetail}>📅 {new Date(item.date).toDateString()}</Text>
      <Text style={styles.cardDetail}>📝 {item.description}</Text>
      <Text style={styles.cardDetail}>🏢 {item.opportunity?.organization}</Text>
      {item.status === 'pending' && (
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item._id)}>
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Total Verified Hours</Text>
        <Text style={styles.summaryHours}>{totalVerifiedHours} hrs</Text>
      </View>

      <Text style={styles.heading}>My Hours</Text>

      <TouchableOpacity style={styles.logButton} onPress={() => setShowForm(!showForm)}>
        <Text style={styles.logButtonText}>{showForm ? 'Cancel' : '+ Log New Hours'}</Text>
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

          <TextInput
            style={styles.input}
            placeholder="Hours Logged (e.g. 5)"
            placeholderTextColor="#999"
            value={hoursLogged}
            onChangeText={setHoursLogged}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor="#999"
            value={date}
            onChangeText={setDate}
          />
          <TextInput
            style={styles.textArea}
            placeholder="Description (optional)"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickProofImage}>
            <Text style={styles.imagePickerText}>
              {proofImage ? '✅ Proof Image Selected' : '📷 Upload Proof Image (optional)'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleLogHours} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Hours</Text>}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={hours}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No hours logged yet</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { backgroundColor: '#2e86de', borderRadius: 10, padding: 20, marginBottom: 15, alignItems: 'center' },
  summaryTitle: { color: '#fff', fontSize: 16, marginBottom: 5 },
  summaryHours: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  logButton: { backgroundColor: '#2e86de', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 15 },
  logButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  form: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  formLabel: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  opportunityOption: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  opportunityOptionActive: { backgroundColor: '#2e86de', borderColor: '#2e86de' },
  opportunityOptionText: { color: '#333', fontSize: 14 },
  opportunityOptionTextActive: { color: '#fff', fontWeight: 'bold' },
  noAppsText: { color: '#999', fontSize: 14, marginBottom: 10, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16 },
  textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
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
  deleteButton: { backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  deleteButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 }
});

export default MyHoursScreen;