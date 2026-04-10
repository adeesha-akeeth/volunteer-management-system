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

const EditProfileScreen = ({ navigation }) => {
  const { user, updateUser } = useContext(AuthContext);
  const toast = useToast();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentPhotoUri = profilePhoto?.uri || (user?.profileImage ? `${BASE_URL}/${user.profileImage}` : null);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.error('Permission Required', 'Please allow access to your photo library'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) setProfilePhoto(result.assets[0]);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Validation Error', 'Name cannot be empty'); return; }
    if (!phone.trim()) { toast.error('Validation Error', 'Phone cannot be empty'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('phone', phone.trim());
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
        <TextInput
          style={styles.input}
          placeholder="Your phone number"
          placeholderTextColor="#aaa"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

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
  disabledInput: { backgroundColor: '#f0f0f0', color: '#999' },
  hint: { fontSize: 11, color: '#aaa', marginTop: -10, marginBottom: 14 },
  textArea: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#ddd', minHeight: 100, textAlignVertical: 'top', color: '#333' },
  charCount: { textAlign: 'right', fontSize: 11, color: '#aaa', marginBottom: 20 },
  saveBtn: { backgroundColor: '#2e86de', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10, elevation: 2 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 15 },
});

export default EditProfileScreen;
