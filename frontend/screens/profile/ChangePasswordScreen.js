import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useToast } from '../../components/Toast';
import api from '../../api';

const validatePassword = (pw) => {
  if (pw.length < 8) return 'At least 8 characters required';
  if (!/[A-Z]/.test(pw)) return 'At least 1 uppercase letter required';
  if (!/[a-z]/.test(pw)) return 'At least 1 lowercase letter required';
  if (!/[0-9]/.test(pw)) return 'At least 1 number required';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'At least 1 symbol required (e.g. @#$)';
  return null;
};

const ChangePasswordScreen = ({ navigation }) => {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const pwError = newPassword.length > 0 ? validatePassword(newPassword) : null;

  const handleChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Missing Fields', 'Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords Mismatch', 'New password and confirmation do not match');
      return;
    }
    const err = validatePassword(newPassword);
    if (err) { toast.error('Weak Password', err); return; }

    setLoading(true);
    try {
      await api.put('/api/auth/change-password', { currentPassword, newPassword });
      toast.success('Password Changed', 'Your password has been updated successfully.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      navigation.goBack();
    } catch (error) {
      toast.error('Failed', error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
        <Text style={styles.heading}>Change Password</Text>
        <Text style={styles.subtitle}>Keep your account secure with a strong password</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.pwRow}>
            <TextInput
              style={styles.pwInput}
              placeholder="Enter your current password"
              placeholderTextColor="#aaa"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eye}>
              <Text style={styles.eyeText}>{showCurrent ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>New Password</Text>
          <View style={[styles.pwRow, pwError && newPassword.length > 0 && styles.pwRowError]}>
            <TextInput
              style={styles.pwInput}
              placeholder="Min 8 chars, upper, lower, number, symbol"
              placeholderTextColor="#aaa"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eye}>
              <Text style={styles.eyeText}>{showNew ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {newPassword.length > 0 && (
            <Text style={[styles.pwHint, pwError ? styles.pwHintError : styles.pwHintOk]}>
              {pwError ? `✗ ${pwError}` : '✓ Password strength OK'}
            </Text>
          )}

          <Text style={styles.label}>Confirm New Password</Text>
          <View style={[styles.pwRow, confirmPassword.length > 0 && newPassword !== confirmPassword && styles.pwRowError]}>
            <TextInput
              style={styles.pwInput}
              placeholder="Re-enter your new password"
              placeholderTextColor="#aaa"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eye}>
              <Text style={styles.eyeText}>{showConfirm ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <Text style={styles.pwHintError}>✗ Passwords do not match</Text>
          )}
          {confirmPassword.length > 0 && newPassword === confirmPassword && !pwError && (
            <Text style={styles.pwHintOk}>✓ Passwords match</Text>
          )}
        </View>

        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>Password Requirements</Text>
          {['At least 8 characters', 'At least 1 uppercase letter', 'At least 1 lowercase letter', 'At least 1 number', 'At least 1 symbol (e.g. @#$)'].map(r => (
            <Text key={r} style={styles.ruleItem}>• {r}</Text>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleChange} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
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
  heading: { fontSize: 26, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, elevation: 2 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 6, marginTop: 8 },
  pwRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 4 },
  pwRowError: { borderColor: '#e74c3c' },
  pwInput: { flex: 1, padding: 14, fontSize: 15, color: '#333' },
  eye: { padding: 14 },
  eyeText: { fontSize: 18 },
  pwHint: { fontSize: 12, marginBottom: 10, marginTop: 2, fontWeight: '600' },
  pwHintOk: { color: '#27ae60' },
  pwHintError: { color: '#e74c3c', fontSize: 12, marginBottom: 10 },
  rulesCard: { backgroundColor: '#e8f4fd', borderRadius: 12, padding: 16, marginBottom: 20 },
  rulesTitle: { fontSize: 13, fontWeight: 'bold', color: '#2e86de', marginBottom: 8 },
  ruleItem: { fontSize: 12, color: '#555', marginBottom: 4 },
  saveBtn: { backgroundColor: '#2e86de', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10, elevation: 2 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 15 },
});

export default ChangePasswordScreen;
