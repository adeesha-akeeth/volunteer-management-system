import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform, SafeAreaView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '../../components/Toast';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';

const DonateScreen = ({ route, navigation }) => {
  const toast = useToast();
  const { fundraiserId, fundraiserName, opportunityTitle } = route.params;
  const { user } = useContext(AuthContext);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [donorName, setDonorName] = useState(user?.name || '');
  const [donorPhone, setDonorPhone] = useState(user?.phone || '');
  const [receiptImage, setReceiptImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const pickReceipt = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.warning('Permission required', 'Please allow photo access'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setReceiptImage(result.assets[0]);
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || Number(amount) < 1) {
      toast.error('Invalid Amount', 'Please enter a valid amount (minimum LKR 1)'); return;
    }
    if (!receiptImage) {
      toast.error('Receipt Required', 'Please upload your bank receipt photo before submitting.'); return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('fundraiserId', fundraiserId);
      formData.append('amount', amount);
      formData.append('message', message);
      formData.append('donorName', donorName);
      formData.append('donorPhone', donorPhone);
      if (receiptImage) {
        const filename = receiptImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        formData.append('receiptImage', { uri: receiptImage.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
      }
      await api.post('/api/donations', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Donation Submitted!', 'Your donation is pending review. Check the Donations tab to manage it.');
      setTimeout(() => navigation.goBack(), 2000);
    } catch (error) {
      toast.error('Error', error.response?.data?.message || error.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#27ae60' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={styles.container}>
          <View style={styles.headerCard}>
            <Text style={styles.headerLabel}>Fundraiser</Text>
            <Text style={styles.headerFundraiser}>{fundraiserName}</Text>
            <Text style={styles.headerOpp}>{opportunityTitle}</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Your Donation</Text>

            <Text style={styles.label}>Amount (LKR) *</Text>
            <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Enter amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />

            <Text style={styles.label}>Your Name</Text>
            <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Full name (optional)" value={donorName} onChangeText={setDonorName} />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Contact number (optional)" value={donorPhone} onChangeText={setDonorPhone} keyboardType="phone-pad" />

            <Text style={styles.label}>Message (optional)</Text>
            <TextInput style={styles.textArea} placeholderTextColor="#999" placeholder="Leave a message of support..." value={message} onChangeText={setMessage} multiline numberOfLines={3} />

            <Text style={styles.label}>Bank Receipt Photo *</Text>
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickReceipt}>
              <Text style={styles.imagePickerText}>{receiptImage ? '✅ Receipt Selected — tap to change' : '📷 Upload Bank Receipt Photo'}</Text>
            </TouchableOpacity>
            {receiptImage && <Image source={{ uri: receiptImage.uri }} style={styles.previewImage} resizeMode="cover" />}

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Your donation will be marked as pending until the organizer reviews your receipt. You can edit or delete it while it's pending.</Text>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Donation</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  headerCard: { backgroundColor: '#27ae60', padding: 20 },
  headerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 4 },
  headerFundraiser: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 3 },
  headerOpp: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  form: { padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  textArea: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', minHeight: 80, textAlignVertical: 'top', color: '#333' },
  imagePickerButton: { backgroundColor: '#f0fff4', borderWidth: 2, borderColor: '#27ae60', borderStyle: 'dashed', borderRadius: 10, padding: 18, alignItems: 'center', marginBottom: 12 },
  imagePickerText: { color: '#27ae60', fontWeight: 'bold', fontSize: 15 },
  previewImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 14 },
  infoBox: { backgroundColor: '#fff3cd', borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#f39c12' },
  infoText: { color: '#856404', fontSize: 13, lineHeight: 20 },
  submitButton: { backgroundColor: '#27ae60', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { borderWidth: 1, borderColor: '#999', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 30 },
  cancelButtonText: { color: '#555', fontWeight: 'bold', fontSize: 16 }
});

export default DonateScreen;
