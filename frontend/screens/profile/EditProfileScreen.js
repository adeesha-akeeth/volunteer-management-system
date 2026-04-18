import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image, KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

// Split a stored full phone like "+94771234567" into code + digits
const splitPhone = (full) => {
  if (!full) return { code: '+94', digits: '' };
  const match = full.match(/^(\+\d{1,4})(\d+)$/);
  if (match) return { code: match[1], digits: match[2] };
  return { code: '+94', digits: full.replace(/[^0-9]/g, '') };
};

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useContext(AuthContext);
  const toast = useToast();

  const { code: initCode, digits: initDigits } = splitPhone(user?.phone);

  const [name, setName] = useState(user?.name || '');
  const [countryCode, setCountryCode] = useState(initCode);
  const [phoneDigits, setPhoneDigits] = useState(initDigits);
  const [bio, setBio] = useState(user?.bio || '');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentPhotoUri = profilePhoto?.uri || (user?.profileImage ? `${BASE_URL}/${user.profileImage}` : null);

  const handleCodeChange = (text) => {
    let cleaned = text.replace(/[^0-9+]/g, '');
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned.replace(/\+/g, '');
    else cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
    setCountryCode(cleaned || '+');
  };

  const handleDigitsChange = (text) => setPhoneDigits(text.replace(/[^0-9]/g, ''));

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.error('Permission Required', 'Please allow access to your photo library'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) setProfilePhoto(result.assets[0]);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Validation Error', 'Name cannot be empty'); return; }
    if (!phoneDigits.trim()) { toast.error('Validation Error', 'Phone number cannot be empty'); return; }
    if (countryCode.length < 2) { toast.error('Invalid Country Code', 'Please enter a valid country code (e.g. +94)'); return; }
    if (countryCode === '+94' && phoneDigits.length !== 9) {
      toast.error('Invalid Phone', 'Sri Lanka (+94) numbers must have exactly 9 digits after the country code');
      return;
    } else if (countryCode !== '+94' && phoneDigits.length < 7) {
      toast.error('Invalid Phone', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('phone', `${countryCode}${phoneDigits}`);
      fd.append('bio', bio.trim());
      if (profilePhoto) {
        const filename = profilePhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        fd.append('photo', { uri: profilePhoto.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
      }
      const response = await api.put('/api/auth/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await updateUser({ ...user, ...response.data.user });
      toast.success('Profile Updated', 'Your changes have been saved.');
      setProfilePhoto(null);
      navigation.goBack();
    } catch (error) {
      toast.error('Update Failed', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const showDigitError = countryCode === '+94' && phoneDigits.length > 0 && phoneDigits.length !== 9;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
        <Text style={styles.heading}>Edit Profile</Text>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarContainer} onPress={pickPhoto}>
          {currentPhotoUri ? (
            <Image source={{ uri: currentPhotoUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.editPhotoOverlay}>
            <Text style={styles.editPhotoText}>📷</Text>
          </View>
        </TouchableOpacity>
        {profilePhoto && <Text style={styles.photoHint}>New photo selected — tap Save to apply</Text>}

        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Phone Number *</Text>
        <View style={styles.phoneRow}>
          <TextInput
            style={styles.codeInput}
            value={countryCode}
            onChangeText={handleCodeChange}
            keyboardType="phone-pad"
            maxLength={5}
            placeholder="+94"
            placeholderTextColor="#aaa"
          />
          <TextInput
            style={[styles.phoneInput, showDigitError && styles.inputError]}
            placeholder={countryCode === '+94' ? '9 digits e.g. 771234567' : 'Phone number'}
            placeholderTextColor="#aaa"
            value={phoneDigits}
            onChangeText={handleDigitsChange}
            keyboardType="number-pad"
            maxLength={countryCode === '+94' ? 9 : 15}
          />
        </View>
        {showDigitError && (
          <Text style={styles.fieldError}>+94 numbers need exactly 9 digits ({phoneDigits.length}/9)</Text>
        )}
        {!showDigitError && (
          <Text style={styles.phoneHint}>
            {countryCode === '+94'
              ? 'Enter exactly 9 digits after +94 (e.g. 771234567)'
              : 'Enter your number without leading zero'}
          </Text>
        )}

        <Text style={styles.label}>Email Address</Text>
        <TextInput style={[styles.input, styles.disabledInput]} value={user?.email} editable={false} />
        <Text style={styles.hint}>Email cannot be changed</Text>

        <Text style={styles.label}>Bio (optional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Tell others a bit about yourself..."
          placeholderTextColor="#aaa"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          maxLength={300}
        />
        <Text style={styles.charCount}>{bio.length}/300</Text>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  inner: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 20 },
  avatarContainer: { alignSelf: 'center', position: 'relative', marginBottom: 8 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#2e86de' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
  editPhotoOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 14, padding: 5, elevation: 3 },
  editPhotoText: { fontSize: 18 },
  photoHint: { textAlign: 'center', color: '#27ae60', fontSize: 12, marginBottom: 16, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5, marginTop: 4 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  inputError: { borderColor: '#e74c3c' },
  disabledInput: { backgroundColor: '#f0f0f0', color: '#999' },
  hint: { fontSize: 11, color: '#aaa', marginTop: -10, marginBottom: 14 },
  phoneRow: { flexDirection: 'row', marginBottom: 2, gap: 8 },
  codeInput: { width: 70, backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333', textAlign: 'center' },
  phoneInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  phoneHint: { fontSize: 11, color: '#aaa', marginBottom: 14 },
  fieldError: { color: '#e74c3c', fontSize: 12, marginBottom: 10 },
  textArea: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#ddd', minHeight: 100, textAlignVertical: 'top', color: '#333' },
  charCount: { textAlign: 'right', fontSize: 11, color: '#aaa', marginBottom: 20 },
  saveBtn: { backgroundColor: '#2e86de', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10, elevation: 2 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 15 },
});

export default EditProfileScreen;
