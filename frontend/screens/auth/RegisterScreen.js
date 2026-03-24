import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('volunteer');
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const result = await register(name, email, password, role);
    setLoading(false);
    if (!result.success) {
      Alert.alert('Registration Failed', result.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join us as a volunteer today</Text>
        <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Full Name" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Password (min 6 characters)" value={password} onChangeText={setPassword} secureTextEntry />
        <Text style={styles.label}>Select Role:</Text>
        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'volunteer' && styles.roleButtonActive]}
            onPress={() => setRole('volunteer')}
          >
            <Text style={[styles.roleText, role === 'volunteer' && styles.roleTextActive]}>Volunteer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'organization' && styles.roleButtonActive]}
            onPress={() => setRole('organization')}
          >
            <Text style={[styles.roleText, role === 'organization' && styles.roleTextActive]}>Organization</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingVertical: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#2e86de', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  label: { fontSize: 16, color: '#333', marginBottom: 10 },
  roleContainer: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  roleButton: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#2e86de', alignItems: 'center' },
  roleButtonActive: { backgroundColor: '#2e86de' },
  roleText: { color: '#2e86de', fontWeight: 'bold' },
  roleTextActive: { color: '#fff' },
  button: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 15 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#2e86de', textAlign: 'center', fontSize: 14 }
});

export default RegisterScreen;