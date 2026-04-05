import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
  TextInput, RefreshControl
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api';

const MyDonationsScreen = ({ route }) => {
  const prefilledCampaign = route?.params?.campaign || '';
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(!!prefilledCampaign);
  const [campaign, setCampaign] = useState(prefilledCampaign);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [receiptImage, setReceiptImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [totalDonated, setTotalDonated] = useState(0);

  const fetchDonations = async () => {
    try {
      const response = await api.get('/api/donations/my');
      setDonations(response.data.donations);
      setTotalDonated(response.data.totalDonated);
    } catch (error) {
      Alert.alert('Error', 'Failed to load donations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDonations();
  };

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7
    });
    if (!result.canceled) {
      setReceiptImage(result.assets[0]);
    }
  };

  const handleDonate = async () => {
  if (!campaign || !amount) {
    Alert.alert('Error', 'Please fill in campaign and amount');
    return;
  }
  if (isNaN(amount) || Number(amount) < 1) {
    Alert.alert('Error', 'Please enter a valid amount');
    return;
  }
  setSubmitting(true);
  try {
    if (receiptImage) {
      const formData = new FormData();
      formData.append('campaign', campaign);
      formData.append('amount', amount);
      formData.append('message', message);
      const filename = receiptImage.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('receiptImage', {
        uri: receiptImage.uri,
        name: filename,
        type: type
      });
      await api.post('/api/donations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } else {
      await api.post('/api/donations', {
        campaign,
        amount,
        message
      });
    }
    Alert.alert('Success', 'Donation submitted successfully!');
    setShowForm(false);
    setCampaign('');
    setAmount('');
    setMessage('');
    setReceiptImage(null);
    fetchDonations();
  } catch (error) {
    Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to submit donation');
  } finally {
    setSubmitting(false);
  }
};

  const handleDelete = async (donationId) => {
    Alert.alert('Delete Donation', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/donations/${donationId}`);
            Alert.alert('Success', 'Donation deleted successfully');
            fetchDonations();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete donation');
          }
        }
      }
    ]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#27ae60';
      case 'rejected': return '#e74c3c';
      default: return '#f39c12';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.campaign}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.amount}>💰 LKR {item.amount}</Text>
      {item.message ? <Text style={styles.cardDetail}>💬 {item.message}</Text> : null}
      <Text style={styles.cardDate}>📅 {new Date(item.createdAt).toDateString()}</Text>
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
        <Text style={styles.summaryTitle}>Total Donated</Text>
        <Text style={styles.summaryAmount}>LKR {totalDonated}</Text>
        <Text style={styles.summaryCount}>{donations.length} donations made</Text>
      </View>
      <Text style={styles.heading}>My Donations</Text>
      <TouchableOpacity style={styles.donateButton} onPress={() => setShowForm(!showForm)}>
        <Text style={styles.donateButtonText}>{showForm ? 'Cancel' : '+ Make a Donation'}</Text>
      </TouchableOpacity>
      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Campaign Name" value={campaign} onChangeText={setCampaign} />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Amount (LKR)" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <TextInput style={styles.textArea} placeholderTextColor="#999" placeholder="Message (optional)" value={message} onChangeText={setMessage} multiline numberOfLines={3} />
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickReceipt}>
            <Text style={styles.imagePickerText}>
              {receiptImage ? '✅ Receipt Selected' : '📷 Upload Receipt (optional)'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleDonate} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Donation</Text>}
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={donations}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No donations made yet</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { backgroundColor: '#27ae60', borderRadius: 10, padding: 20, marginBottom: 15, alignItems: 'center' },
  summaryTitle: { color: '#fff', fontSize: 16, marginBottom: 5 },
  summaryAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  summaryCount: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 5 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  donateButton: { backgroundColor: '#27ae60', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 15 },
  donateButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  form: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16 },
  textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#27ae60', borderStyle: 'dashed', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  imagePickerText: { color: '#27ae60', fontWeight: 'bold' },
  submitButton: { backgroundColor: '#27ae60', borderRadius: 8, padding: 12, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1 },
  amount: { fontSize: 20, fontWeight: 'bold', color: '#27ae60', marginBottom: 8 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  cardDetail: { color: '#555', marginBottom: 4, fontSize: 14 },
  cardDate: { color: '#999', fontSize: 12, marginTop: 5 },
  deleteButton: { backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 10 },
  deleteButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 }
});

export default MyDonationsScreen;