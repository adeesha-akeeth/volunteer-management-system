import React, { useState, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

const LoginScreen = ({ navigation }) => {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) { toast.warning('Missing Fields', 'Please fill in all fields'); return; }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) toast.error('Login Failed', result.message);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Kind Hands</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholderTextColor="#999"
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? Register</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#2e86de', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  passwordContainer: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  passwordInput: { flex: 1, padding: 15, fontSize: 16, color: '#333' },
  eyeButton: { padding: 15 },
  eyeText: { fontSize: 18 },
  button: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 15 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#2e86de', textAlign: 'center', fontSize: 14 }
});

export default LoginScreen;
