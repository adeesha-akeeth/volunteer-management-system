import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useContext(AuthContext);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission required', 'Please allow access to your photo library'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) setProfilePhoto(result.assets[0]);
  };

  const handleUpdateProfile = async () => {
    if (!name || !phone) { Alert.alert('Error', 'Name and phone cannot be empty'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('phone', phone.trim());
      if (profilePhoto) {
        const filename = profilePhoto.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        fd.append('photo', { uri: profilePhoto.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
      }
      const response = await api.put('/api/auth/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await updateUser({ ...user, ...response.data.user });
      setProfilePhoto(null);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (pw) => {
    if (pw.length < 8) return 'At least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'At least 1 uppercase letter';
    if (!/[a-z]/.test(pw)) return 'At least 1 lowercase letter';
    if (!/[0-9]/.test(pw)) return 'At least 1 number';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'At least 1 symbol';
    return null;
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { Alert.alert('Error', 'Please fill in both password fields'); return; }
    const pwErr = validatePassword(newPassword);
    if (pwErr) { Alert.alert('Weak Password', pwErr); return; }
    setPasswordLoading(true);
    try {
      await api.put('/api/auth/change-password', { currentPassword, newPassword });
      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPassword(''); setNewPassword('');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const currentPhotoUri = profilePhoto?.uri || (user?.profileImage ? `${BASE_URL}/${user.profileImage}` : null);

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={pickPhoto} style={styles.avatarContainer}>
          {currentPhotoUri ? (
            <Image source={{ uri: currentPhotoUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.editPhotoOverlay}>
            <Text style={styles.editPhotoText}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.profileName}>{user?.name}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <TouchableOpacity
          style={styles.publicProfileBtn}
          onPress={() => navigation.navigate('PublisherProfile', { publisherId: user?.id })}
        >
          <Text style={styles.publicProfileBtnText}>👁 View My Public Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Profile */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Edit Profile</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} placeholder="Your full name" placeholderTextColor="#aaa" value={name} onChangeText={setName} />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput style={styles.input} placeholder="Your phone number" placeholderTextColor="#aaa" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>Email Address</Text>
        <TextInput style={[styles.input, styles.disabledInput]} value={user?.email} editable={false} />
        <Text style={styles.hint}>Email cannot be changed</Text>

        {profilePhoto && <Text style={styles.photoHint}>📷 New photo selected — save to apply</Text>}

        <TouchableOpacity style={styles.button} onPress={handleUpdateProfile} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update Profile</Text>}
        </TouchableOpacity>
      </View>

      {/* Change Password */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Change Password</Text>

        <Text style={styles.label}>Current Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput style={styles.passwordInput} placeholder="Enter current password" placeholderTextColor="#aaa" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry={!showCurrentPw} />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowCurrentPw(!showCurrentPw)}>
            <Text style={styles.eyeText}>{showCurrentPw ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>New Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput style={styles.passwordInput} placeholder="Min 8 chars, 1 upper, 1 lower, 1 num, 1 symbol" placeholderTextColor="#aaa" value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showNewPw} />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPw(!showNewPw)}>
            <Text style={styles.eyeText}>{showNewPw ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleChangePassword} disabled={passwordLoading}>
          {passwordLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Change Password</Text>}
        </TouchableOpacity>
      </View>

      {/* Navigation Buttons */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Activity</Text>

        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('MyApplications')}>
          <Text style={styles.navButtonText}>📋 My Applications</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('MyCreatedOpportunities')}>
          <Text style={styles.navButtonText}>📌 My Created Opportunities</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('AllContributions')}>
          <Text style={styles.navButtonText}>⏱ Manage Contributions</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('FavouritesList')}>
          <Text style={styles.navButtonText}>❤️ My Favourites</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('MyLikesComments')}>
          <Text style={styles.navButtonText}>👍 My Likes & Comments</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  profileHeader: { alignItems: 'center', marginBottom: 20, paddingVertical: 20 },
  avatarContainer: { position: 'relative', marginBottom: 10 },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  editPhotoOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, padding: 4, elevation: 3 },
  editPhotoText: { fontSize: 16 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  profileEmail: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 10 },
  publicProfileBtn: { backgroundColor: '#f0f4f8', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#dee2e6' },
  publicProfileBtnText: { color: '#2e86de', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  disabledInput: { backgroundColor: '#eee', color: '#999' },
  hint: { fontSize: 12, color: '#999', marginTop: -10, marginBottom: 15 },
  photoHint: { fontSize: 12, color: '#27ae60', marginBottom: 10 },
  passwordContainer: { backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  passwordInput: { flex: 1, padding: 15, fontSize: 16, color: '#333' },
  eyeButton: { padding: 15 },
  eyeText: { fontSize: 18 },
  button: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  navButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 10, backgroundColor: '#f8f9fa', marginBottom: 10 },
  navButtonText: { fontSize: 16, color: '#333' },
  navButtonArrow: { fontSize: 18, color: '#2e86de', fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 30 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default ProfileScreen;
