import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import api from '../../api';

const CreateFundraiserScreen = ({ navigation }) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.warning('Required', 'Please enter a fundraiser name');
      return;
    }
    if (!targetAmount || isNaN(targetAmount) || Number(targetAmount) < 1) {
      toast.warning('Required', 'Please enter a valid target amount (minimum LKR 1)');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/fundraisers', {
        name: name.trim(),
        description: description.trim(),
        targetAmount: Number(targetAmount)
      });
      toast.success('Created!', 'Your fundraiser is now live.');
      navigation.goBack();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to create fundraiser');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Header Banner */}
        <View style={styles.headerBanner}>
          <View style={styles.headerIconCircle}>
            <Ionicons name="cash-outline" size={36} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Create a Fundraiser</Text>
          <Text style={styles.headerSubtitle}>Raise funds for any cause you care about</Text>
        </View>

        <View style={styles.formCard}>

          <Text style={styles.label}>Fundraiser Name <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="ribbon-outline" size={18} color="#aaa" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. School Supply Drive 2025"
              placeholderTextColor="#bbb"
              value={name}
              onChangeText={setName}
              maxLength={100}
            />
          </View>

          <Text style={styles.label}>Purpose / Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe what this fundraiser is for and how the funds will be used..."
            placeholderTextColor="#bbb"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>

          <Text style={styles.label}>Target Amount (LKR) <Text style={styles.required}>*</Text></Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencyPrefix}>LKR</Text>
            <TextInput
              style={[styles.input, { paddingLeft: 8 }]}
              placeholder="10000"
              placeholderTextColor="#bbb"
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="numeric"
            />
          </View>

          {/* Info note */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#2e86de" style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>
              Donors will be able to find this fundraiser in the Support a Cause section. You can manage donations and track progress from your My Fundraisers screen.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Create Fundraiser</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={submitting}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  content: { paddingBottom: 40 },

  headerBanner: {
    backgroundColor: '#2e86de',
    padding: 30,
    alignItems: 'center',
    paddingBottom: 40
  },
  headerIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 15,
    marginTop: -20,
    padding: 20,
    elevation: 4
  },

  label: { fontSize: 14, fontWeight: '700', color: '#444', marginBottom: 8, marginTop: 16 },
  required: { color: '#e74c3c' },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    marginBottom: 4
  },
  inputIcon: { marginRight: 8 },
  currencyPrefix: { fontSize: 14, fontWeight: 'bold', color: '#555', marginRight: 4 },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: '#333'
  },
  textArea: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    fontSize: 15,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 4
  },
  charCount: { fontSize: 11, color: '#bbb', textAlign: 'right', marginBottom: 4 },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f4fd',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    marginBottom: 8
  },
  infoText: { flex: 1, fontSize: 12, color: '#2e86de', lineHeight: 18 },

  submitBtn: {
    backgroundColor: '#2e86de',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    elevation: 2
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  cancelBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { color: '#888', fontSize: 15 }
});

export default CreateFundraiserScreen;
