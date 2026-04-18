import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const ApplyScreen = ({ route, navigation }) => {
  const { opportunity, applicationId, existingApplication } = route.params;
  const { user } = useContext(AuthContext);
  const toast = useToast();
  const isEditMode = !!applicationId;

  const hasProfilePhoto = !!(user?.profileImage);
  const profilePhotoUri = hasProfilePhoto ? `${BASE_URL}/${user.profileImage}` : null;

  const [applicantName, setApplicantName] = useState(existingApplication?.applicantName || user?.name || '');
  const [phone, setPhone] = useState(existingApplication?.phone || user?.phone || '');
  const [email, setEmail] = useState(existingApplication?.email || user?.email || '');
  const [coverLetter, setCoverLetter] = useState(existingApplication?.coverLetter || '');
  const [motivation, setMotivation] = useState(existingApplication?.motivation || '');
  const [expectedHours, setExpectedHours] = useState(existingApplication?.expectedHours ? String(existingApplication.expectedHours) : '');
  const [hopingToGain, setHopingToGain] = useState(existingApplication?.hopingToGain || '');

  const [shareProfilePhoto, setShareProfilePhoto] = useState(hasProfilePhoto && !existingApplication?.photo);
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

  const photoMissing = !shareProfilePhoto && !uploadedPhoto && !existingApplication?.photo;

  const handleApply = async () => {
    if (!applicantName.trim()) { toast.error('Missing Field', 'Please enter your name'); return; }
    if (!phone.trim()) { toast.error('Missing Field', 'Please enter your phone number'); return; }
    if (phone.trim().startsWith('+94')) {
      const digits = phone.trim().slice(3).replace(/\s/g, '');
      if (digits.length !== 9 || !/^\d+$/.test(digits)) {
        toast.error('Invalid Phone', 'Sri Lanka (+94) numbers must have exactly 9 digits after the country code');
        return;
      }
    }
    if (!email.trim()) { toast.error('Missing Field', 'Please enter your email'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Invalid Email', 'Please enter a valid email address'); return; }
    if (!coverLetter.trim()) { toast.error('Missing Field', 'Please tell us why you want to volunteer'); return; }
    if (!isEditMode && photoMissing) { toast.error('Photo Required', 'Please upload a photo or share your profile photo'); return; }
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

      if (uploadedPhoto) {
        const filename = uploadedPhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        formData.append('photo', { uri: uploadedPhoto.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
      } else if (shareProfilePhoto && hasProfilePhoto) {
        formData.append('useProfilePhoto', 'true');
      }

      if (isEditMode) {
        await api.put(`/api/applications/${applicationId}`, formData);
        toast.success('Application Updated!', 'Your changes have been saved.');
      } else {
        await api.post('/api/applications', formData);
        toast.success('Application Submitted!', 'Your application is under review. Check status under Profile → My Applications.');
      }
      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      toast.error(isEditMode ? 'Update Failed' : 'Submission Failed', error.response?.data?.message || error.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">

        <View style={styles.opportunityCard}>
          <Text style={styles.opportunityTitle}>{opportunity.title}</Text>
          {opportunity.organization ? (
            <View style={styles.cardDetailRow}>
              <Ionicons name="business-outline" size={13} color="rgba(255,255,255,0.8)" />
              <Text style={styles.opportunityMeta}> {opportunity.organization}</Text>
            </View>
          ) : null}
          <View style={styles.cardDetailRow}>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.opportunityMeta}> {opportunity.location}</Text>
          </View>
          <View style={styles.cardDetailRow}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.opportunityMeta}>
              {' '}{opportunity.startDate
                ? `${new Date(opportunity.startDate).toDateString()} — ${new Date(opportunity.endDate).toDateString()}`
                : 'Date not set'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{isEditMode ? 'Edit Your Application' : 'Your Application'}</Text>
        <Text style={styles.sectionSubtitle}>Fields marked with * are required</Text>

        <Text style={styles.label}>Your Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          placeholderTextColor="#aaa"
          value={applicantName}
          onChangeText={setApplicantName}
        />

        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. +94771234567"
          placeholderTextColor="#aaa"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Text style={styles.fieldHint}>For Sri Lanka, enter +94 followed by exactly 9 digits</Text>

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
          <Text style={styles.fieldError}>Enter a valid email address</Text>
        )}

        <Text style={styles.label}>Why do you want to volunteer? *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Tell the organizer why you're interested and what skills you bring..."
          placeholderTextColor="#aaa"
          value={coverLetter}
          onChangeText={setCoverLetter}
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>What motivated you to apply? <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.textArea}
          placeholder="Share what inspired you to apply for this opportunity..."
          placeholderTextColor="#aaa"
          value={motivation}
          onChangeText={setMotivation}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>How many hours do you expect to contribute? <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 10"
          placeholderTextColor="#aaa"
          value={expectedHours}
          onChangeText={(t) => setExpectedHours(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>What are you hoping to gain? <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.textArea}
          placeholder="Skills, experience, or personal growth you're hoping to achieve..."
          placeholderTextColor="#aaa"
          value={hopingToGain}
          onChangeText={setHopingToGain}
          multiline
          numberOfLines={3}
        />

        {/* Photo Section */}
        <View style={styles.photoSection}>
          <Text style={styles.label}>Application Photo {!isEditMode && '*'}</Text>
          {!isEditMode && <Text style={styles.photoNote}>A photo is required for your application</Text>}

          {isEditMode && existingApplication?.photo && !uploadedPhoto && (
            <View style={styles.existingPhotoNote}>
              <Ionicons name="information-circle-outline" size={15} color="#2e86de" />
              <Text style={styles.existingPhotoText}> Existing photo will be kept unless you upload a new one</Text>
            </View>
          )}

          {hasProfilePhoto ? (
            <>
              <TouchableOpacity
                style={[styles.checkboxRow, shareProfilePhoto && styles.checkboxRowActive]}
                onPress={() => setShareProfilePhoto(!shareProfilePhoto)}
              >
                <View style={[styles.checkbox, shareProfilePhoto && styles.checkboxChecked]}>
                  {shareProfilePhoto && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Use my profile photo for this application</Text>
                <Image source={{ uri: profilePhotoUri }} style={styles.profilePhotoThumb} />
              </TouchableOpacity>

              {!shareProfilePhoto && (
                <View style={styles.uploadSection}>
                  <Text style={styles.uploadNote}>Upload a different photo for this application:</Text>
                  <TouchableOpacity style={styles.imagePickerButton} onPress={pickPhoto}>
                    <Ionicons name={uploadedPhoto ? 'checkmark-circle' : 'camera-outline'} size={18} color="#2e86de" style={{ marginRight: 6 }} />
                    <Text style={styles.imagePickerText}>
                      {uploadedPhoto ? 'Photo Selected — Tap to change' : 'Upload Your Photo'}
                    </Text>
                  </TouchableOpacity>
                  {uploadedPhoto && <Image source={{ uri: uploadedPhoto.uri }} style={styles.photoPreview} />}
                </View>
              )}
            </>
          ) : (
            <>
              {!isEditMode && (
                <View style={styles.noProfilePhotoHint}>
                  <Text style={styles.noProfilePhotoText}>You haven't uploaded a profile photo. Please upload one for this application.</Text>
                </View>
              )}
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickPhoto}>
                <Ionicons name={uploadedPhoto ? 'checkmark-circle' : 'camera-outline'} size={18} color="#2e86de" style={{ marginRight: 6 }} />
                <Text style={styles.imagePickerText}>
                  {uploadedPhoto ? 'Photo Selected — Tap to change' : 'Upload Your Photo'}
                </Text>
              </TouchableOpacity>
              {uploadedPhoto && <Image source={{ uri: uploadedPhoto.uri }} style={styles.photoPreview} />}
            </>
          )}
        </View>

        <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleApply} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitButtonText}>{isEditMode ? 'Save Changes' : 'Submit Application'}</Text>
          }
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
  cardDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  opportunityMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: '#888', marginBottom: 18 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 8 },
  optional: { fontWeight: 'normal', color: '#aaa', fontSize: 12 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  inputError: { borderColor: '#e74c3c' },
  fieldError: { color: '#e74c3c', fontSize: 12, marginTop: -10, marginBottom: 12 },
  fieldHint: { fontSize: 11, color: '#aaa', marginTop: -10, marginBottom: 12 },
  textArea: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 15, borderWidth: 1, borderColor: '#ddd', minHeight: 100, textAlignVertical: 'top', color: '#333' },
  photoSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ddd' },
  photoNote: { fontSize: 12, color: '#e67e22', fontWeight: '600', marginBottom: 12 },
  existingPhotoNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f4fd', borderRadius: 8, padding: 10, marginBottom: 12 },
  existingPhotoText: { fontSize: 12, color: '#2e86de', flex: 1 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#ddd', marginBottom: 10, gap: 10 },
  checkboxRowActive: { borderColor: '#27ae60', backgroundColor: '#f0fff4' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#27ae60', borderColor: '#27ae60' },
  checkboxLabel: { fontSize: 14, color: '#333', fontWeight: '600', flex: 1 },
  profilePhotoThumb: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#27ae60' },
  uploadSection: { marginTop: 8 },
  uploadNote: { fontSize: 13, color: '#555', marginBottom: 8 },
  noProfilePhotoHint: { backgroundColor: '#fff8e1', borderRadius: 8, padding: 10, marginBottom: 10 },
  noProfilePhotoText: { fontSize: 13, color: '#b8860b' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#2e86de', borderStyle: 'dashed', borderRadius: 10, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  imagePickerText: { color: '#2e86de', fontWeight: 'bold', fontSize: 15 },
  photoPreview: { width: 90, height: 90, borderRadius: 45, alignSelf: 'center', marginBottom: 10, borderWidth: 2, borderColor: '#2e86de' },
  submitButton: { backgroundColor: '#27ae60', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10, elevation: 2 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: { borderWidth: 1, borderColor: '#e74c3c', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 30 },
  cancelButtonText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 15 }
});

export default ApplyScreen;
