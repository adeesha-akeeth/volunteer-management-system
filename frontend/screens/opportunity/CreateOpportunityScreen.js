import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Image, Platform,
  KeyboardAvoidingView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '../../components/Toast';
import api from '../../api';

const fmt = (d) => d ? new Date(d).toDateString() : null;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

const CreateOpportunityScreen = ({ navigation }) => {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [spotsAvailable, setSpotsAvailable] = useState('');
  const [category, setCategory] = useState('other');
  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleEmail, setResponsibleEmail] = useState('');
  const [contactCountryCode, setContactCountryCode] = useState('+94');
  const [contactPhone, setContactPhone] = useState('');
  const [bannerImage, setBannerImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);

  const categories = ['education', 'environment', 'health', 'community', 'animals', 'other'];

  const handleContactCodeChange = (text) => {
    let cleaned = text.replace(/[^0-9+]/g, '');
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned.replace(/\+/g, '');
    else cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
    setContactCountryCode(cleaned || '+');
  };

  const handleContactPhoneChange = (text) => {
    setContactPhone(text.replace(/[^0-9]/g, ''));
  };

  const openDatePicker = (target) => {
    setPickerTarget(target);
    setShowPicker(true);
  };

  const onDateChange = (event, selected) => {
    setShowPicker(Platform.OS === 'ios');
    if (event.type === 'dismissed') return;
    if (selected) {
      const iso = selected.toISOString().substring(0, 10);
      if (pickerTarget === 'start') setStartDate(iso);
      else setEndDate(iso);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { toast.error('Permission Required', 'Please allow photo access'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.7
    });
    if (!result.canceled) setBannerImage(result.assets[0]);
  };

  const handleCreate = async () => {
    if (!title || !description || !location || !startDate || !endDate || !spotsAvailable) {
      toast.error('Missing Fields', 'Please fill in all required fields (title, description, location, dates, spots)');
      return;
    }

    const startDateObj = new Date(startDate);
    const todayObj = today();
    if (startDateObj < todayObj) {
      toast.error('Invalid Start Date', 'Start date cannot be in the past. Please select today or a future date.');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('Invalid Dates', 'End date must be after start date');
      return;
    }

    if (responsibleEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(responsibleEmail)) {
      toast.error('Invalid Email', 'Please enter a valid contact email address');
      return;
    }

    setLoading(true);
    try {
      const responsiblePhone = contactPhone ? `${contactCountryCode}${contactPhone}` : '';
      const payload = {
        title, description, organization, location,
        startDate, endDate, spotsAvailable, category,
        responsibleName, responsibleEmail, responsiblePhone
      };

      if (bannerImage) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => formData.append(k, v));
        const filename = bannerImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        formData.append('bannerImage', { uri: bannerImage.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
        await api.post('/api/opportunities', formData);
      } else {
        await api.post('/api/opportunities', payload);
      }

      toast.success('Opportunity Created!', 'Your opportunity has been posted successfully.');
      setTimeout(() => navigation.goBack(), 1000);
    } catch (error) {
      toast.error('Error', error.response?.data?.message || error.message || 'Failed to create opportunity');
    } finally {
      setLoading(false);
    }
  };

  const minDate = today();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>Post New Opportunity</Text>

        <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Title *" value={title} onChangeText={setTitle} />
        <TextInput style={styles.textArea} placeholderTextColor="#999" placeholder="Description *" value={description} onChangeText={setDescription} multiline numberOfLines={4} />
        <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Organization / Company Name (optional)" value={organization} onChangeText={setOrganization} />
        <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Location *" value={location} onChangeText={setLocation} />

        <Text style={styles.label}>Event Dates *</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => openDatePicker('start')}>
          <Text style={[styles.dateButtonText, !startDate && styles.datePlaceholder]}>
            {startDate ? `Start: ${fmt(startDate)}` : 'Select Start Date * (today or future)'}
          </Text>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateButton} onPress={() => openDatePicker('end')}>
          <Text style={[styles.dateButtonText, !endDate && styles.datePlaceholder]}>
            {endDate ? `End: ${fmt(endDate)}` : 'Select End Date *'}
          </Text>
          <Text style={styles.dateIcon}>📅</Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={pickerTarget === 'start' ? (startDate ? new Date(startDate) : minDate) : (endDate ? new Date(endDate) : (startDate ? new Date(startDate) : minDate))}
            mode="date"
            display="default"
            minimumDate={pickerTarget === 'start' ? minDate : (startDate ? new Date(startDate) : minDate)}
            onChange={onDateChange}
          />
        )}

        <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Spots Available *" value={spotsAvailable} onChangeText={setSpotsAvailable} keyboardType="numeric" />

        <Text style={styles.label}>Contact Info (optional)</Text>
        <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Contact Name" value={responsibleName} onChangeText={setResponsibleName} />
        <TextInput
          style={[styles.input, responsibleEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(responsibleEmail) && styles.inputError]}
          placeholderTextColor="#999"
          placeholder="Contact Email"
          value={responsibleEmail}
          onChangeText={setResponsibleEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {responsibleEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(responsibleEmail) && (
          <Text style={styles.fieldError}>✗ Enter a valid email address</Text>
        )}
        <View style={styles.phoneRow}>
          <TextInput
            style={styles.codeInput}
            value={contactCountryCode}
            onChangeText={handleContactCodeChange}
            keyboardType="phone-pad"
            maxLength={5}
            placeholder="+94"
            placeholderTextColor="#aaa"
          />
          <TextInput
            style={styles.phoneInput}
            placeholder="Contact Phone"
            placeholderTextColor="#999"
            value={contactPhone}
            onChangeText={handleContactPhoneChange}
            keyboardType="number-pad"
          />
        </View>
        <Text style={styles.phoneHint}>Type your country code (e.g. +94, +1)</Text>

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryContainer}>
          {categories.map((cat) => (
            <TouchableOpacity key={cat} style={[styles.categoryButton, category === cat && styles.categoryButtonActive]} onPress={() => setCategory(cat)}>
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Banner Image (optional)</Text>
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          <Text style={styles.imagePickerText}>{bannerImage ? '✅ Image Selected' : '📷 Pick Banner Image'}</Text>
        </TouchableOpacity>
        {bannerImage && <Image source={{ uri: bannerImage.uri }} style={styles.previewImage} />}

        <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Opportunity</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  inputError: { borderColor: '#e74c3c' },
  fieldError: { color: '#e74c3c', fontSize: 12, marginTop: -8, marginBottom: 10 },
  textArea: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd', minHeight: 100, textAlignVertical: 'top', color: '#333' },
  label: { fontSize: 15, color: '#333', marginBottom: 8, fontWeight: 'bold', marginTop: 4 },
  dateButton: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateButtonText: { fontSize: 15, color: '#333', flex: 1 },
  datePlaceholder: { color: '#999' },
  dateIcon: { fontSize: 18 },
  phoneRow: { flexDirection: 'row', marginBottom: 2, gap: 8 },
  codeInput: { backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#ddd', color: '#333', fontWeight: 'bold', fontSize: 15, minWidth: 80, textAlign: 'center' },
  phoneInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  phoneHint: { fontSize: 11, color: '#aaa', marginBottom: 14 },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  categoryButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2e86de' },
  categoryButtonActive: { backgroundColor: '#2e86de' },
  categoryText: { color: '#2e86de', fontWeight: 'bold', fontSize: 13 },
  categoryTextActive: { color: '#fff' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#2e86de', borderStyle: 'dashed', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 15 },
  imagePickerText: { color: '#2e86de', fontWeight: 'bold', fontSize: 15 },
  previewImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 15 },
  button: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10, marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { borderWidth: 1, borderColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 30 },
  cancelButtonText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});

export default CreateOpportunityScreen;
