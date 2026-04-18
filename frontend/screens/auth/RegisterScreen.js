import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

const validatePassword = (password) => {
  if (password.length < 8) return 'At least 8 characters';
  if (!/[A-Z]/.test(password)) return 'At least 1 uppercase letter';
  if (!/[a-z]/.test(password)) return 'At least 1 lowercase letter';
  if (!/[0-9]/.test(password)) return 'At least 1 number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'At least 1 symbol (e.g. @#$)';
  return null;
};

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+94');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);
  const toast = useToast();

  const pwError = password.length > 0 ? validatePassword(password) : null;

  const handleCountryCodeChange = (text) => {
    // Always keep + at the start, only digits after
    let cleaned = text.replace(/[^0-9+]/g, '');
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned.replace(/\+/g, '');
    else cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
    setCountryCode(cleaned || '+');
  };

  const handleCountryCodeKeyPress = ({ nativeEvent }) => {
    // Prevent deleting the '+' sign
    if (nativeEvent.key === 'Backspace' && countryCode === '+') {
      // do nothing
    }
  };

  const handlePhoneChange = (text) => {
    setPhone(text.replace(/[^0-9]/g, ''));
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.error('Permission Required', 'Please allow access to your photo library'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) setProfilePhoto(result.assets[0]);
  };

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      toast.error('Missing Fields', 'Please fill in all required fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Invalid Email', 'Please enter a valid email address');
      return;
    }
    if (countryCode.length < 2) {
      toast.error('Invalid Country Code', 'Please enter a valid country code (e.g. +94)');
      return;
    }
    if (countryCode === '+94') {
      if (phone.length !== 9) {
        toast.error('Invalid Phone', 'Sri Lanka (+94) numbers must have exactly 9 digits after the country code');
        return;
      }
    } else if (phone.length < 7) {
      toast.error('Invalid Phone', 'Please enter a valid phone number');
      return;
    }
    const err = validatePassword(password);
    if (err) {
      toast.error('Weak Password', err);
      return;
    }
    setLoading(true);
    const fullPhone = `${countryCode}${phone}`;

    const fd = new FormData();
    fd.append('name', name.trim());
    fd.append('email', email.trim().toLowerCase());
    fd.append('password', password);
    fd.append('phone', fullPhone);
    fd.append('role', 'volunteer');
    if (profilePhoto) {
      const filename = profilePhoto.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      fd.append('photo', { uri: profilePhoto.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
    }

    const result = await register(fd);
    setLoading(false);
    if (!result.success) {
      toast.error('Registration Failed', result.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Kind Hands today</Text>

        {/* Profile Photo */}
        <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto}>
          {profilePhoto ? (
            <Image source={{ uri: profilePhoto.uri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderIcon}>📷</Text>
              <Text style={styles.photoPlaceholderText}>Add Profile Photo{'\n'}(optional)</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Silva"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Email Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. john@email.com"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
          <Text style={styles.fieldError}>✗ Enter a valid email address</Text>
        )}

        <Text style={styles.label}>Phone Number *</Text>
        <View style={styles.phoneRow}>
          <TextInput
            style={styles.codeInput}
            value={countryCode}
            onChangeText={handleCountryCodeChange}
            onKeyPress={handleCountryCodeKeyPress}
            keyboardType="phone-pad"
            maxLength={5}
            placeholder="+94"
            placeholderTextColor="#aaa"
          />
          <TextInput
            style={styles.phoneInput}
            placeholder="7X XXX XXXX"
            placeholderTextColor="#aaa"
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="number-pad"
          />
        </View>
        <Text style={styles.phoneHint}>
          {countryCode === '+94'
            ? 'Enter exactly 9 digits after +94 (e.g. 771234567)'
            : 'Type your country code (e.g. +94, +1, +44)'}
        </Text>

        <Text style={styles.label}>Password *</Text>
        <View style={[styles.passwordContainer, pwError && password.length > 0 && styles.inputError]}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Min 8 chars, 1 upper, 1 lower, 1 number, 1 symbol"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        {password.length > 0 && (
          <Text style={[styles.pwHint, pwError ? styles.pwHintError : styles.pwHintOk]}>
            {pwError ? `✗ ${pwError}` : '✓ Password strength OK'}
          </Text>
        )}

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#2e86de', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },

  photoPicker: { alignItems: 'center', marginBottom: 20 },
  photoPreview: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#2e86de' },
  photoPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#dee2e6', borderStyle: 'dashed' },
  photoPlaceholderIcon: { fontSize: 24 },
  photoPlaceholderText: { fontSize: 10, color: '#888', textAlign: 'center', marginTop: 2 },

  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 4, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  fieldError: { color: '#e74c3c', fontSize: 12, marginBottom: 12, marginTop: 2 },
  phoneRow: { flexDirection: 'row', marginBottom: 2, gap: 8 },
  codeInput: { backgroundColor: '#fff', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#ddd', color: '#333', fontWeight: 'bold', fontSize: 15, minWidth: 80, textAlign: 'center' },
  phoneInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  phoneHint: { fontSize: 11, color: '#aaa', marginBottom: 14 },
  passwordContainer: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  inputError: { borderColor: '#e74c3c' },
  passwordInput: { flex: 1, padding: 15, fontSize: 16, color: '#333' },
  eyeButton: { padding: 15 },
  eyeText: { fontSize: 18 },
  pwHint: { fontSize: 12, marginBottom: 14, marginTop: 2 },
  pwHintOk: { color: '#27ae60' },
  pwHintError: { color: '#e74c3c' },
  button: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 15, marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#2e86de', textAlign: 'center', fontSize: 14 }
});

export default RegisterScreen;
