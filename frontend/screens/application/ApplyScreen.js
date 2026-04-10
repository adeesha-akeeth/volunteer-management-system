import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const ApplyScreen = ({ route, navigation }) => {
  const { opportunity } = route.params;
  const { user } = useContext(AuthContext);
  const toast = useToast();

  const hasProfilePhoto = !!(user?.profileImage);
  const profilePhotoUri = hasProfilePhoto ? `${BASE_URL}/${user.profileImage}` : null;

  const [applicantName, setApplicantName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [coverLetter, setCoverLetter] = useState('');
  const [motivation, setMotivation] = useState('');
  const [expectedHours, setExpectedHours] = useState('');
  const [hopingToGain, setHopingToGain] = useState('');

  // Photo logic
  const [shareProfilePhoto, setShareProfilePhoto] = useState(hasProfilePhoto);
  const [uploadedPhoto, setUploadedPhoto] = useState(null);

  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Permission Required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7
    });
    if (!result.canceled) setUploadedPhoto(result.assets[0]);
  };

  // Determine what photo will be submitted
  const photoToSubmit = shareProfilePhoto ? 'profile' : uploadedPhoto;
  const photoMissing = !shareProfilePhoto && !uploadedPhoto;

  const handleApply = async () => {
    if (!applicantName.trim()) { toast.error('Missing Field', 'Please enter your name'); return; }
    if (!phone.trim()) { toast.error('Missing Field', 'Please enter your phone number'); return; }
    if (!email.trim()) { toast.error('Missing Field', 'Please enter your email'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Invalid Email', 'Please enter a valid email address'); return; }
    if (!coverLetter.trim()) { toast.error('Missing Field', 'Please tell us why you want to volunteer'); return; }
    if (photoMissing) { toast.error('Photo Required', 'Please upload a photo or share your profile photo'); return; }
    if (expectedHours && isNaN(Number(expectedHours))) { toast.error('Invalid Hours', 'Expected hours must be a number'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('opportunityId', opportunity._id);
      formData.append('applicantName', applicantName.trim());
      formData.append('phone', phone.trim());
      formData.append('email', email.trim());
      formData.append('coverLetter', coverLetter.trim());
      if (motivation.trim()) formData.append('motivation', motivation.trim());
      if (expectedHours.trim()) formData.append('expectedHours', expectedHours.trim());
      if (hopingToGain.trim()) formData.append('hopingToGain', hopingToGain.trim());

      if (shareProfilePhoto && hasProfilePhoto) {
        // Signal backend to use profile photo
        formData.append('useProfilePhoto', 'true');
      } else if (uploadedPhoto) {
        const filename = uploadedPhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        formData.append('photo', { uri: uploadedPhoto.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
      }

      await api.post('/api/applications', formData);
      toast.success('Application Submitted!', 'Your application is under review. Check status under Profile → My Applications.');
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      toast.error('Submission Failed', error.response?.data?.message || error.message || 'Failed to apply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

        {/* Opportunity Info */}
        <View style={styles.opportunityCard}>
          <Text style={styles.opportunityTitle}>{opportunity.title}</Text>
          <Text style={styles.opportunityOrg}>🏢 {opportunity.organization || 'Volunteer Opportunity'}</Text>
          <Text style={styles.opportunityLocation}>📍 {opportunity.location}</Text>
          <Text style={styles.opportunityDate}>
            📅 {opportunity.startDate
              ? `${new Date(opportunity.startDate).toDateString()} — ${new Date(opportunity.endDate).toDateString()}`
              : 'Date not set'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Your Application</Text>
        <Text style={styles.sectionSubtitle}>Fields marked with * are required</Text>

        {/* Name */}
        <Text style={styles.label}>Your Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          placeholderTextColor="#aaa"
          value={applicantName}
          onChangeText={setApplicantName}
        />

        {/* Phone */}
        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. +94771234567"
          placeholderTextColor="#aaa"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        {/* Email */}
        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={[styles.input, email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && styles.inputError]}
          placeholder="Your email address"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
          <Text style={styles.fieldError}>✗ Enter a valid email address</Text>
        )}

        {/* Cover Letter */}
        <Text style={styles.label}>Why do you want to volunteer? *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Tell the organizer why you're interested in this opportunity and what skills you bring..."
          placeholderTextColor="#aaa"
          value={coverLetter}
          onChangeText={setCoverLetter}
          multiline
          numberOfLines={4}
        />

        {/* Motivation (optional) */}
        <Text style={styles.label}>What motivated you to apply? <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.textArea}
          placeholder="Share what inspired you to apply for this specific opportunity..."
          placeholderTextColor="#aaa"
          value={motivation}
          onChangeText={setMotivation}
          multiline
          numberOfLines={3}
        />

        {/* Expected Hours (optional) */}
        <Text style={styles.label}>How many hours do you expect to work? <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 10"
          placeholderTextColor="#aaa"
          value={expectedHours}
          onChangeText={(t) => setExpectedHours(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />

        {/* Hoping to Gain (optional) */}
        <Text style={styles.label}>What are you hoping to gain? <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.textArea}
          placeholder="What skills, experience or personal growth are you hoping to achieve from this opportunity?"
          placeholderTextColor="#aaa"
          value={hopingToGain}
          onChangeText={setHopingToGain}
          multiline
          numberOfLines={3}
        />

        {/* Photo Section */}
        <View style={styles.photoSection}>
          <Text style={styles.label}>Application Photo *</Text>
          <Text style={styles.photoNote}>📌 A photo is required for your application</Text>

          {hasProfilePhoto ? (
            <>
              {/* Option 1: Share profile photo */}
              <TouchableOpacity
                style={[styles.checkboxRow, shareProfilePhoto && styles.checkboxRowActive]}
                onPress={() => setShareProfilePhoto(!shareProfilePhoto)}
              >
                <View style={[styles.checkbox, shareProfilePhoto && styles.checkboxChecked]}>
                  {shareProfilePhoto && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkboxLabel}>Use my profile photo for this application</Text>
                </View>
                <Image source={{ uri: profilePhotoUri }} style={styles.profilePhotoThumb} />
              </TouchableOpacity>

              {/* Option 2: Upload different photo if unchecked */}
              {!shareProfilePhoto && (
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadNote}>Please upload a photo for this application:</Text>
                  <TouchableOpacity style={styles.imagePickerButton} onPress={pickPhoto}>
                    <Text style={styles.imagePickerText}>
                      {uploadedPhoto ? '✅ Photo Selected — Tap to change' : '📷 Upload Your Photo'}
                    </Text>
                  </TouchableOpacity>
                  {uploadedPhoto && <Image source={{ uri: uploadedPhoto.uri }} style={styles.photoPreview} />}
                </View>
              )}
            </>
          ) : (
            <>
              {/* No profile photo — must upload */}
              <View style={styles.noProfilePhotoHint}>
                <Text style={styles.noProfilePhotoText}>You haven't uploaded a profile photo yet. Please upload one for this application.</Text>
              </View>
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickPhoto}>
                <Text style={styles.imagePickerText}>
                  {uploadedPhoto ? '✅ Photo Selected — Tap to change' : '📷 Upload Your Photo'}
                </Text>
              </TouchableOpacity>
              {uploadedPhoto && <Image source={{ uri: uploadedPhoto.uri }} style={styles.photoPreview} />}
            </>
          )}
        </View>

        <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleApply} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Application</Text>}
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
  opportunityCard: { backgroundColor: '#2e86de', borderRadius: 14, padding: 16, marginBottom: 20, elevation: 3 },
  opportunityTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  opportunityOrg: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginBottom: 3 },
  opportunityLocation: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginBottom: 3 },
  opportunityDate: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: '#888', marginBottom: 18 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 4 },
  optional: { fontWeight: 'normal', color: '#aaa', fontSize: 12 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  inputError: { borderColor: '#e74c3c' },
  fieldError: { color: '#e74c3c', fontSize: 12, marginTop: -10, marginBottom: 12 },
  textArea: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: '#ddd', minHeight: 100, textAlignVertical: 'top', color: '#333' },
  photoSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ddd' },
  photoNote: { fontSize: 12, color: '#e67e22', fontWeight: '600', marginBottom: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#ddd', marginBottom: 10, gap: 10 },
  checkboxRowActive: { borderColor: '#27ae60', backgroundColor: '#f0fff4' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#27ae60', borderColor: '#27ae60' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 14, color: '#333', fontWeight: '600' },
  profilePhotoThumb: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#27ae60' },
  uploadSection: { marginTop: 8 },
  uploadNote: { fontSize: 13, color: '#555', marginBottom: 8 },
  noProfilePhotoHint: { backgroundColor: '#fff8e1', borderRadius: 8, padding: 10, marginBottom: 10 },
  noProfilePhotoText: { fontSize: 13, color: '#b8860b' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#2e86de', borderStyle: 'dashed', borderRadius: 10, padding: 18, alignItems: 'center', marginBottom: 12 },
  imagePickerText: { color: '#2e86de', fontWeight: 'bold', fontSize: 15 },
  photoPreview: { width: 90, height: 90, borderRadius: 45, alignSelf: 'center', marginBottom: 10, borderWidth: 2, borderColor: '#2e86de' },
  submitButton: { backgroundColor: '#27ae60', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10, elevation: 2 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { borderWidth: 1, borderColor: '#e74c3c', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 30 },
  cancelButtonText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 15 }
});

export default ApplyScreen;
