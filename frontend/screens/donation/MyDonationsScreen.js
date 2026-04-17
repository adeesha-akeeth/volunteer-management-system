import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity,
  TextInput, RefreshControl, Modal, ScrollView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const MyDonationsScreen = ({ navigation }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmedTotal, setConfirmedTotal] = useState(0);

  // Edit modal state
  const [editingDonation, setEditingDonation] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editDonorName, setEditDonorName] = useState('');
  const [editDonorPhone, setEditDonorPhone] = useState('');
  const [editReceiptImage, setEditReceiptImage] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchDonations = async () => {
    try {
      const response = await api.get('/api/donations/my');
      setDonations(response.data.donations);
      setConfirmedTotal(response.data.confirmedTotal || 0);
    } catch (error) {
      toast.error('Error', 'Failed to load donations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDonations(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchDonations(); };

  const openEdit = (donation) => {
    setEditingDonation(donation);
    setEditAmount(String(donation.amount));
    setEditMessage(donation.message || '');
    setEditDonorName(donation.donorName || '');
    setEditDonorPhone(donation.donorPhone || '');
    setEditReceiptImage(null);
  };

  const closeEdit = () => {
    setEditingDonation(null);
    setEditReceiptImage(null);
  };

  const pickEditReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.warning('Permission required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7
    });
    if (!result.canceled) setEditReceiptImage(result.assets[0]);
  };

  const handleSaveEdit = async () => {
    if (!editAmount || isNaN(editAmount) || Number(editAmount) < 1) {
      toast.error('Error', 'Please enter a valid amount');
      return;
    }
    setEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('amount', editAmount);
      formData.append('message', editMessage);
      formData.append('donorName', editDonorName);
      formData.append('donorPhone', editDonorPhone);
      if (editReceiptImage) {
        const filename = editReceiptImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('receiptImage', { uri: editReceiptImage.uri, name: filename, type });
      }
      await api.put(`/api/donations/${editingDonation._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Success', 'Donation updated successfully');
      closeEdit();
      fetchDonations();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to update donation');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = (donationId) => {
    confirm.show({
      title: 'Delete Donation',
      message: 'Are you sure you want to delete this donation?',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/donations/${donationId}`);
          toast.success('Deleted', 'Donation deleted successfully');
          fetchDonations();
        } catch (error) {
          toast.error('Error', error.response?.data?.message || 'Failed to delete donation');
        }
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#27ae60';
      case 'rejected': return '#e74c3c';
      default: return '#f39c12';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed': return 'Confirmed';
      case 'rejected': return 'Rejected';
      default: return 'Pending';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.fundraiser?.name || 'Donation'}</Text>
          <Text style={styles.cardOpp} numberOfLines={1}>{item.opportunity?.title}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.amount}>LKR {Number(item.amount).toLocaleString()}</Text>
      {item.donorName ? <Text style={styles.cardDetail}>Name: {item.donorName}</Text> : null}
      {item.donorPhone ? <Text style={styles.cardDetail}>Phone: {item.donorPhone}</Text> : null}
      {item.message ? <Text style={styles.cardDetail}>"{item.message}"</Text> : null}
      {item.receiptImage ? (
        <Image
          source={{ uri: `${BASE_URL}/${item.receiptImage}` }}
          style={styles.receiptThumb}
          resizeMode="cover"
        />
      ) : null}
      <Text style={styles.cardDate}>{new Date(item.createdAt).toDateString()}</Text>

      {item.status === 'pending' && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.editButton} onPress={() => openEdit(item)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item._id)}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#27ae60" /></View>;

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Confirmed Donations</Text>
        <Text style={styles.summaryAmount}>LKR {confirmedTotal.toLocaleString()}</Text>
        <Text style={styles.summaryCount}>{donations.length} submission{donations.length !== 1 ? 's' : ''} made</Text>
      </View>

      {/* Find Opportunity Button */}
      <TouchableOpacity
        style={styles.findButton}
        onPress={() => navigation.navigate('FundraiserList')}
      >
        <Text style={styles.findButtonText}>Find an Opportunity to Support</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>My Donations</Text>

      <FlatList
        data={donations}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No donations yet</Text>
            <Text style={styles.emptySubText}>Find an opportunity and make your first donation!</Text>
          </View>
        }
      />

      {/* Edit Modal */}
      <Modal visible={!!editingDonation} animationType="slide" onRequestClose={closeEdit}>
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Edit Donation</Text>
          <Text style={styles.modalSubtitle}>{editingDonation?.opportunity?.title}</Text>

          <Text style={styles.label}>Amount (LKR) *</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor="#999"
            placeholder="Amount"
            value={editAmount}
            onChangeText={setEditAmount}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor="#999"
            placeholder="Full name"
            value={editDonorName}
            onChangeText={setEditDonorName}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor="#999"
            placeholder="Contact number"
            value={editDonorPhone}
            onChangeText={setEditDonorPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={styles.textArea}
            placeholderTextColor="#999"
            placeholder="Leave a message..."
            value={editMessage}
            onChangeText={setEditMessage}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Replace Receipt Photo</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickEditReceipt}>
            <Text style={styles.imagePickerText}>
              {editReceiptImage ? '✅ New Receipt Selected' : '📷 Upload New Receipt (optional)'}
            </Text>
          </TouchableOpacity>
          {editReceiptImage && (
            <Image source={{ uri: editReceiptImage.uri }} style={styles.previewImage} resizeMode="cover" />
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit} disabled={editSubmitting}>
              {editSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelEditButton} onPress={closeEdit}>
              <Text style={styles.cancelEditText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { backgroundColor: '#27ae60', padding: 20, alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 4 },
  summaryAmount: { color: '#fff', fontSize: 34, fontWeight: 'bold' },
  summaryCount: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },
  findButton: { margin: 15, backgroundColor: '#2e86de', borderRadius: 10, padding: 14, alignItems: 'center' },
  findButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginHorizontal: 15, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginHorizontal: 15, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardOpp: { fontSize: 12, color: '#888', marginTop: 2 },
  amount: { fontSize: 22, fontWeight: 'bold', color: '#27ae60', marginBottom: 6 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  cardDetail: { color: '#666', fontSize: 14, marginBottom: 3 },
  receiptThumb: { width: '100%', height: 140, borderRadius: 8, marginVertical: 8 },
  cardDate: { color: '#aaa', fontSize: 12, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  editButton: { flex: 1, backgroundColor: '#2e86de', borderRadius: 8, padding: 10, alignItems: 'center' },
  editButtonText: { color: '#fff', fontWeight: 'bold' },
  deleteButton: { flex: 1, backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  emptySubText: { fontSize: 14, color: '#999', marginTop: 6, textAlign: 'center' },
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: '#f0f4f8', padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: '#888', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  textArea: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', minHeight: 80, textAlignVertical: 'top', color: '#333' },
  imagePickerButton: { backgroundColor: '#f0fff4', borderWidth: 2, borderColor: '#27ae60', borderStyle: 'dashed', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  imagePickerText: { color: '#27ae60', fontWeight: 'bold' },
  previewImage: { width: '100%', height: 180, borderRadius: 10, marginBottom: 14 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 40 },
  saveButton: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, padding: 14, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelEditButton: { flex: 1, borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 14, alignItems: 'center' },
  cancelEditText: { color: '#555', fontWeight: 'bold', fontSize: 16 }
});

export default MyDonationsScreen;
