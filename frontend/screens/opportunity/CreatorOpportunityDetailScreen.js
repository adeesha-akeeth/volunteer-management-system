import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image, TextInput, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';

const CreatorOpportunityDetailScreen = ({ route, navigation }) => {
  const { opportunityId } = route.params;
  const toast = useToast();
  const confirm = useConfirm();
  const [opportunity, setOpportunity] = useState(null);
  const [applications, setApplications] = useState([]);
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit form
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOrganization, setEditOrganization] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStartDate, setEditStartDate] = useState(null);
  const [editEndDate, setEditEndDate] = useState(null);
  const [editSpots, setEditSpots] = useState('');
  const [editResponsibleName, setEditResponsibleName] = useState('');
  const [editResponsibleEmail, setEditResponsibleEmail] = useState('');
  const [editResponsiblePhone, setEditResponsiblePhone] = useState('');
  const [editBannerImage, setEditBannerImage] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState(null);

  const fetchData = async () => {
    try {
      const [oppRes, appRes, frRes] = await Promise.all([
        api.get(`/api/opportunities/${opportunityId}`),
        api.get(`/api/applications/opportunity/${opportunityId}`),
        api.get(`/api/fundraisers/opportunity/${opportunityId}`)
      ]);
      setOpportunity(oppRes.data);
      setApplications(appRes.data);
      setFundraisers(frRes.data);
    } catch {
      toast.error('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openEdit = () => {
    if (!opportunity) return;
    setEditTitle(opportunity.title || '');
    setEditDescription(opportunity.description || '');
    setEditOrganization(opportunity.organization || '');
    setEditLocation(opportunity.location || '');
    setEditStartDate(opportunity.startDate ? opportunity.startDate.substring(0, 10) : null);
    setEditEndDate(opportunity.endDate ? opportunity.endDate.substring(0, 10) : null);
    setEditSpots(String(opportunity.spotsAvailable || ''));
    setEditResponsibleName(opportunity.responsibleName || '');
    setEditResponsibleEmail(opportunity.responsibleEmail || '');
    setEditResponsiblePhone(opportunity.responsiblePhone || '');
    setEditBannerImage(null);
    setShowEdit(true);
  };

  const onDateChange = (event, selected) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'dismissed') return;
    if (selected) {
      const iso = selected.toISOString().substring(0, 10);
      if (datePickerTarget === 'start') setEditStartDate(iso);
      else setEditEndDate(iso);
    }
  };

  const pickEditBanner = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.7 });
    if (!result.canceled) setEditBannerImage(result.assets[0]);
  };

  const fmt = (d) => d ? new Date(d).toDateString() : 'Not set';

  const handleSaveEdit = async () => {
    if (!editTitle || !editDescription || !editLocation || !editStartDate || !editEndDate || !editSpots) {
      toast.warning('Missing Fields', 'Please fill in all required fields'); return;
    }
    if (new Date(editStartDate) >= new Date(editEndDate)) {
      toast.warning('Invalid Dates', 'End date must be after start date'); return;
    }
    setEditLoading(true);
    try {
      const payload = {
        title: editTitle, description: editDescription, organization: editOrganization,
        location: editLocation, startDate: editStartDate, endDate: editEndDate,
        spotsAvailable: editSpots, responsibleName: editResponsibleName,
        responsibleEmail: editResponsibleEmail, responsiblePhone: editResponsiblePhone
      };
      if (editBannerImage) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => formData.append(k, v));
        const filename = editBannerImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        formData.append('bannerImage', { uri: editBannerImage.uri, name: filename, type: match ? `image/${match[1]}` : 'image/jpeg' });
        await api.put(`/api/opportunities/${opportunityId}`, formData);
      } else {
        await api.put(`/api/opportunities/${opportunityId}`, payload);
      }
      toast.success('Success', 'Opportunity updated!');
      setShowEdit(false);
      fetchData();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = () => {
    const current = opportunity?.status || 'open';
    const next = current === 'open' ? 'closed' : 'open';
    confirm.show({
      title: next === 'closed' ? 'Close Applications' : 'Re-open Applications',
      message: next === 'closed' ? 'Prevent new applications from being submitted?' : 'Allow new applications again?',
      confirmText: 'Confirm',
      destructive: next === 'closed',
      onConfirm: async () => {
        try {
          await api.patch(`/api/opportunities/${opportunityId}/status`, { status: next });
          fetchData();
        } catch { toast.error('Error', 'Failed to update status'); }
      }
    });
  };

  const handleDelete = () => {
    confirm.show({
      title: 'Delete Opportunity',
      message: 'This will permanently delete the opportunity and all its data. This cannot be undone.',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/opportunities/${opportunityId}`);
          navigation.goBack();
        } catch { toast.error('Error', 'Failed to delete'); }
      }
    });
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const acceptedCount = applications.filter(a => a.status === 'approved').length;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>{opportunity?.title}</Text>
        {opportunity?.organization ? (
          <View style={styles.headerDetailRow}>
            <Ionicons name="business-outline" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerDetail}> {opportunity.organization}</Text>
          </View>
        ) : null}
        <View style={styles.headerDetailRow}>
          <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.headerDetail}> {opportunity?.location}</Text>
        </View>
        <View style={styles.headerDetailRow}>
          <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.headerDetail}> {fmt(opportunity?.startDate)} — {fmt(opportunity?.endDate)}</Text>
        </View>
        <View style={styles.headerDetailRow}>
          <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.headerDetail}> {opportunity?.spotsAvailable} spots</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
            <Ionicons name="pencil-outline" size={14} color="#fff" />
            <Text style={styles.headerBtnText}> Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, opportunity?.status === 'closed' ? styles.openBtn : styles.closeBtn]}
            onPress={handleToggleStatus}
          >
            <Ionicons name={opportunity?.status === 'closed' ? 'lock-open-outline' : 'lock-closed-outline'} size={14} color="#fff" />
            <Text style={styles.headerBtnText}> {opportunity?.status === 'closed' ? 'Re-open' : 'Close Apps'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit form */}
      {showEdit && (
        <View style={styles.editForm}>
          <Text style={styles.editFormTitle}>Edit Opportunity</Text>

          <Text style={styles.fieldLabel}>Title *</Text>
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Opportunity title" value={editTitle} onChangeText={setEditTitle} />

          <Text style={styles.fieldLabel}>Description *</Text>
          <TextInput style={styles.textArea} placeholderTextColor="#999" placeholder="Describe the opportunity..." value={editDescription} onChangeText={setEditDescription} multiline numberOfLines={4} />

          <Text style={styles.fieldLabel}>Organization <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Organization name" value={editOrganization} onChangeText={setEditOrganization} />

          <Text style={styles.fieldLabel}>Location *</Text>
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Location" value={editLocation} onChangeText={setEditLocation} />

          <Text style={styles.fieldLabel}>Start Date *</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => { setDatePickerTarget('start'); setShowDatePicker(true); }}>
            <Text style={[styles.dateButtonText, !editStartDate && styles.datePlaceholder]}>
              {editStartDate ? fmt(editStartDate) : 'Select start date'}
            </Text>
            <Ionicons name="calendar-outline" size={16} color="#888" />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>End Date *</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => { setDatePickerTarget('end'); setShowDatePicker(true); }}>
            <Text style={[styles.dateButtonText, !editEndDate && styles.datePlaceholder]}>
              {editEndDate ? fmt(editEndDate) : 'Select end date'}
            </Text>
            <Ionicons name="calendar-outline" size={16} color="#888" />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={datePickerTarget === 'start' ? (editStartDate ? new Date(editStartDate) : new Date()) : (editEndDate ? new Date(editEndDate) : new Date())}
              mode="date" display="default" onChange={onDateChange}
            />
          )}

          <Text style={styles.fieldLabel}>Spots Available *</Text>
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Number of spots" value={editSpots} onChangeText={setEditSpots} keyboardType="numeric" />

          <Text style={styles.fieldLabel}>Responsible Person's Name <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Full name" value={editResponsibleName} onChangeText={setEditResponsibleName} />

          <Text style={styles.fieldLabel}>Responsible Person's Email <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Email address" value={editResponsibleEmail} onChangeText={setEditResponsibleEmail} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.fieldLabel}>Responsible Person's Phone <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Phone number" value={editResponsiblePhone} onChangeText={setEditResponsiblePhone} keyboardType="phone-pad" />

          <Text style={styles.fieldLabel}>Banner Image <Text style={styles.optional}>(optional)</Text></Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickEditBanner}>
            <Ionicons name={editBannerImage ? 'checkmark-circle' : 'camera-outline'} size={18} color="#2e86de" style={{ marginRight: 6 }} />
            <Text style={styles.imagePickerText}>{editBannerImage ? 'New Banner Selected' : 'Change Banner Image'}</Text>
          </TouchableOpacity>
          {editBannerImage && <Image source={{ uri: editBannerImage.uri }} style={styles.previewImage} />}

          <View style={styles.editFormButtons}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit} disabled={editLoading}>
              {editLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelEditButton} onPress={() => setShowEdit(false)}>
              <Text style={styles.cancelEditText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { n: applications.length, l: 'Total', color: '#2e86de' },
          { n: pendingCount, l: 'Pending', color: '#f39c12' },
          { n: acceptedCount, l: 'Accepted', color: '#27ae60' },
          { n: fundraisers.length, l: 'Fundraisers', color: '#9b59b6' },
        ].map(s => (
          <View key={s.l} style={styles.statBox}>
            <Text style={[styles.statNumber, { color: s.color }]}>{s.n}</Text>
            <Text style={styles.statLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Navigation buttons */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('ManageApplications', { opportunityId, opportunityTitle: opportunity?.title })}
      >
        <View style={styles.navButtonLeft}>
          <View style={[styles.navButtonIcon, { backgroundColor: '#2e86de' }]}>
            <Ionicons name="people" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.navButtonTitle}>Applications</Text>
            <Text style={styles.navButtonSub}>
              {applications.length} total · {pendingCount} pending
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#aaa" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={() => navigation.navigate('ManageFundraisers', { opportunityId, opportunityTitle: opportunity?.title })}
      >
        <View style={styles.navButtonLeft}>
          <View style={[styles.navButtonIcon, { backgroundColor: '#27ae60' }]}>
            <Ionicons name="cash" size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.navButtonTitle}>Fundraisers</Text>
            <Text style={styles.navButtonSub}>{fundraisers.length} fundraiser{fundraisers.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#aaa" />
      </TouchableOpacity>

      {/* Delete */}
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash-outline" size={16} color="#e74c3c" style={{ marginRight: 6 }} />
        <Text style={styles.deleteButtonText}>Delete Opportunity</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { backgroundColor: '#2e86de', borderRadius: 12, padding: 16, marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  headerDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  headerDetail: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, padding: 10 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, padding: 10 },
  closeBtn: { backgroundColor: 'rgba(231,76,60,0.6)' },
  openBtn: { backgroundColor: 'rgba(39,174,96,0.6)' },
  headerBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  // Edit form
  editForm: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 15, elevation: 3 },
  editFormTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 5, marginTop: 6 },
  optional: { fontWeight: 'normal', color: '#aaa', fontSize: 11 },
  input: { backgroundColor: '#f8f8f8', borderRadius: 8, padding: 12, marginBottom: 4, fontSize: 14, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  textArea: { backgroundColor: '#f8f8f8', borderRadius: 8, padding: 12, marginBottom: 4, fontSize: 14, borderWidth: 1, borderColor: '#ddd', minHeight: 90, textAlignVertical: 'top', color: '#333' },
  dateButton: { backgroundColor: '#f8f8f8', borderRadius: 8, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateButtonText: { fontSize: 14, color: '#333', flex: 1 },
  datePlaceholder: { color: '#999' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#2e86de', borderStyle: 'dashed', borderRadius: 8, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  imagePickerText: { color: '#2e86de', fontWeight: 'bold', fontSize: 13 },
  previewImage: { width: '100%', height: 160, borderRadius: 8, marginBottom: 10, marginTop: 6 },
  editFormButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  saveButton: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, padding: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  cancelEditButton: { flex: 1, borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelEditText: { color: '#555', fontWeight: 'bold', fontSize: 14 },
  // Stats
  statsRow: { flexDirection: 'row', marginBottom: 15, gap: 8 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', elevation: 2 },
  statNumber: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  // Nav buttons
  navButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 3 },
  navButtonLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navButtonIcon: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  navButtonTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  navButtonSub: { fontSize: 12, color: '#888', marginTop: 2 },
  // Delete
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#e74c3c', borderRadius: 10, padding: 14, marginBottom: 30 },
  deleteButtonText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 15 }
});

export default CreatorOpportunityDetailScreen;
