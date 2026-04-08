import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';

const COUNTRY_CODES = [
  { code: '+94', label: 'LK +94' },
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+91', label: 'IN +91' },
  { code: '+61', label: 'AU +61' },
];

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
  const [showCodePicker, setShowCodePicker] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);

  const pwError = password.length > 0 ? validatePassword(password) : null;

  const handlePhoneChange = (text) => {
    // Only allow digits
    setPhone(text.replace(/[^0-9]/g, ''));
  };

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }
    const err = validatePassword(password);
    if (err) {
      Alert.alert('Weak Password', err);
      return;
    }
    setLoading(true);
    const fullPhone = `${countryCode}${phone}`;
    const result = await register(name, email, password, fullPhone);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Registration Failed', result.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join us as a volunteer today</Text>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Silva"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. john@email.com"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Phone Number</Text>
        <View style={styles.phoneRow}>
          <TouchableOpacity style={styles.codeBtn} onPress={() => setShowCodePicker(!showCodePicker)}>
            <Text style={styles.codeBtnText}>{countryCode} ▾</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.phoneInput}
            placeholder="7X XXX XXXX"
            placeholderTextColor="#aaa"
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="number-pad"
          />
        </View>
        {showCodePicker && (
          <View style={styles.codePicker}>
            {COUNTRY_CODES.map(c => (
              <TouchableOpacity key={c.code} style={styles.codePickerItem} onPress={() => { setCountryCode(c.code); setShowCodePicker(false); }}>
                <Text style={[styles.codePickerText, countryCode === c.code && styles.codePickerTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Password</Text>
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
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  phoneRow: { flexDirection: 'row', marginBottom: 15, gap: 8 },
  codeBtn: { backgroundColor: '#fff', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', minWidth: 80 },
  codeBtnText: { color: '#333', fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
  phoneInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  codePicker: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 15, overflow: 'hidden' },
  codePickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  codePickerText: { fontSize: 15, color: '#333' },
  codePickerTextActive: { color: '#2e86de', fontWeight: 'bold' },
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
