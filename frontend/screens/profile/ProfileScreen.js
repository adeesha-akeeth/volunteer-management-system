import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useContext(AuthContext);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdateProfile = async () => {
    if (!name || !phone) {
      Alert.alert('Error', 'Name and phone cannot be empty');
      return;
    }
    setLoading(true);
    try {
      const response = await api.put('/api/auth/profile', { name, phone });
      await updateUser(response.data.user);
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
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }
    const pwErr = validatePassword(newPassword);
    if (pwErr) {
      Alert.alert('Weak Password', pwErr);
      return;
    }
    setPasswordLoading(true);
    try {
      await api.put('/api/auth/change-password', { currentPassword, newPassword });
      Alert.alert('Success', 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName}>{user?.name}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>

      {/* Edit Profile */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Edit Profile</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Your phone number"
          placeholderTextColor="#aaa"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={user?.email}
          editable={false}
        />
        <Text style={styles.hint}>Email cannot be changed</Text>

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

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('MyApplications')}
        >
          <Text style={styles.navButtonText}>📋 My Applications</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('MyCreatedOpportunities')}
        >
          <Text style={styles.navButtonText}>📌 My Created Opportunities</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('FavouritesList')}
        >
          <Text style={styles.navButtonText}>❤️ My Favourites</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('MyLikesComments')}
        >
          <Text style={styles.navButtonText}>👍 My Likes & Comments</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  profileHeader: { alignItems: 'center', marginBottom: 20, paddingVertical: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  profileEmail: { fontSize: 14, color: '#888', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  disabledInput: { backgroundColor: '#eee', color: '#999' },
  hint: { fontSize: 12, color: '#999', marginTop: -10, marginBottom: 15 },
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