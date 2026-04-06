import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const CreatorOpportunityDetailScreen = ({ route, navigation }) => {
  const { opportunityId } = route.params;
  const [opportunity, setOpportunity] = useState(null);
  const [applications, setApplications] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' | 'donations'
  const [appFilter, setAppFilter] = useState('all');
  const [donationFilter, setDonationFilter] = useState('all'); // 'all' | 'pending' | 'confirmed' | 'rejected'
  const [confirmedTotal, setConfirmedTotal] = useState(0);

  // Edit form state
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOrganization, setEditOrganization] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editSpots, setEditSpots] = useState('');
  const [editResponsibleName, setEditResponsibleName] = useState('');
  const [editResponsibleEmail, setEditResponsibleEmail] = useState('');
  const [editResponsiblePhone, setEditResponsiblePhone] = useState('');
  const [editBannerImage, setEditBannerImage] = useState(null);
  const [editFundraiserEnabled, setEditFundraiserEnabled] = useState(false);
  const [editFundraiserTarget, setEditFundraiserTarget] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [oppResponse, appResponse] = await Promise.all([
        api.get(`/api/opportunities/${opportunityId}`),
        api.get(`/api/applications/opportunity/${opportunityId}`)
      ]);
      setOpportunity(oppResponse.data);
      setApplications(appResponse.data);

      // Fetch donations for this opportunity (creator only)
      const donRes = await api.get(`/api/donations/opportunity/${opportunityId}`);
      setDonations(donRes.data.donations);
      setConfirmedTotal(donRes.data.confirmedTotal || 0);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
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
    setEditStartDate(opportunity.startDate ? opportunity.startDate.substring(0, 10) : '');
    setEditEndDate(opportunity.endDate ? opportunity.endDate.substring(0, 10) : '');
    setEditSpots(String(opportunity.spotsAvailable || ''));
    setEditResponsibleName(opportunity.responsibleName || '');
    setEditResponsibleEmail(opportunity.responsibleEmail || '');
    setEditResponsiblePhone(opportunity.responsiblePhone || '');
    setEditFundraiserEnabled(opportunity.fundraiser?.enabled || false);
    setEditFundraiserTarget(String(opportunity.fundraiser?.targetAmount || ''));
    setEditBannerImage(null);
    setShowEdit(true);
  };

  const pickEditBanner = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7
    });
    if (!result.canceled) setEditBannerImage(result.assets[0]);
  };

  const handleSaveEdit = async () => {
    if (!editTitle || !editDescription || !editLocation || !editStartDate || !editEndDate || !editSpots) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    if (new Date(editStartDate) >= new Date(editEndDate)) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }
    if (editFundraiserEnabled && (!editFundraiserTarget || isNaN(editFundraiserTarget) || Number(editFundraiserTarget) < 1)) {
      Alert.alert('Error', 'Please enter a valid fundraising target amount');
      return;
    }
    setEditLoading(true);
    try {
      const payload = {
        title: editTitle,
        description: editDescription,
        organization: editOrganization,
        location: editLocation,
        startDate: editStartDate,
        endDate: editEndDate,
        spotsAvailable: editSpots,
        responsibleName: editResponsibleName,
        responsibleEmail: editResponsibleEmail,
        responsiblePhone: editResponsiblePhone,
        fundraiserEnabled: String(editFundraiserEnabled),
        fundraiserTarget: editFundraiserEnabled ? editFundraiserTarget : '0'
      };

      if (editBannerImage) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, val]) => formData.append(key, val));
        const filename = editBannerImage.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('bannerImage', { uri: editBannerImage.uri, name: filename, type });
        await api.put(`/api/opportunities/${opportunityId}`, formData);
      } else {
        await api.put(`/api/opportunities/${opportunityId}`, payload);
      }

      Alert.alert('Success', 'Opportunity updated!');
      setShowEdit(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdateAppStatus = async (applicationId, status) => {
    try {
      await api.put(`/api/applications/${applicationId}/status`, { status });
      Alert.alert('Success', `Application ${status} successfully!`);
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleUpdateDonationStatus = async (donationId, status) => {
    Alert.alert(
      status === 'confirmed' ? 'Accept Donation' : 'Reject Donation',
      `Are you sure you want to ${status === 'confirmed' ? 'accept' : 'reject'} this donation?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: status === 'confirmed' ? 'Accept' : 'Reject',
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.put(`/api/donations/${donationId}/status`, { status });
              Alert.alert('Success', `Donation ${status}!`);
              fetchData();
            } catch (error) {
              Alert.alert('Error', error.response?.data?.message || 'Failed');
            }
          }
        }
      ]
    );
  };

  const handleGenerateCertificate = (application) => {
    navigation.navigate('GenerateCertificate', { application, opportunity });
  };

  const getAppStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#27ae60';
      case 'completed': return '#2e86de';
      default: return '#f39c12';
    }
  };

  const getDonationStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#27ae60';
      case 'rejected': return '#e74c3c';
      default: return '#f39c12';
    }
  };

  const filteredApplications = appFilter === 'all'
    ? applications
    : applications.filter(a => a.status === appFilter);

  const filteredDonations = donationFilter === 'all'
    ? donations
    : donations.filter(d => d.status === donationFilter);

  const formatDateRange = (opp) => {
    if (opp.startDate && opp.endDate) {
      return `${new Date(opp.startDate).toDateString()} — ${new Date(opp.endDate).toDateString()}`;
    }
    if (opp.date) return new Date(opp.date).toDateString();
    return 'Date not set';
  };

  const fundraiserTargetAmount = opportunity?.fundraiser?.targetAmount || 0;
  const fundraiserPct = fundraiserTargetAmount > 0
    ? Math.min(100, Math.round((confirmedTotal / fundraiserTargetAmount) * 100))
    : 0;

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <ScrollView style={styles.container}>
      {/* Opportunity Header */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>{opportunity?.title}</Text>
        {opportunity?.organization ? <Text style={styles.headerDetail}>🏢 {opportunity.organization}</Text> : null}
        <Text style={styles.headerDetail}>📍 {opportunity?.location}</Text>
        <Text style={styles.headerDetail}>📅 {opportunity ? formatDateRange(opportunity) : ''}</Text>
        <Text style={styles.headerDetail}>👥 {opportunity?.spotsAvailable} spots</Text>
        {opportunity?.responsibleName ? <Text style={styles.headerDetail}>🙋 {opportunity.responsibleName}</Text> : null}
        {opportunity?.responsibleEmail ? <Text style={styles.headerDetail}>✉️ {opportunity.responsibleEmail}</Text> : null}
        {opportunity?.responsiblePhone ? <Text style={styles.headerDetail}>📞 {opportunity.responsiblePhone}</Text> : null}

        <TouchableOpacity style={styles.editButton} onPress={openEdit}>
          <Text style={styles.editButtonText}>✏️ Edit Opportunity</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Form */}
      {showEdit && (
        <View style={styles.editForm}>
          <Text style={styles.editFormTitle}>Edit Opportunity</Text>

          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Title *" value={editTitle} onChangeText={setEditTitle} />
          <TextInput style={styles.textArea} placeholderTextColor="#999" placeholder="Description *" value={editDescription} onChangeText={setEditDescription} multiline numberOfLines={4} />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Organization (optional)" value={editOrganization} onChangeText={setEditOrganization} />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Location *" value={editLocation} onChangeText={setEditLocation} />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Start Date (YYYY-MM-DD) *" value={editStartDate} onChangeText={setEditStartDate} />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="End Date (YYYY-MM-DD) *" value={editEndDate} onChangeText={setEditEndDate} />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Spots Available *" value={editSpots} onChangeText={setEditSpots} keyboardType="numeric" />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Responsible Person Name" value={editResponsibleName} onChangeText={setEditResponsibleName} />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Responsible Person Email" value={editResponsibleEmail} onChangeText={setEditResponsibleEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Responsible Person Phone" value={editResponsiblePhone} onChangeText={setEditResponsiblePhone} keyboardType="phone-pad" />

          {/* Fundraiser edit section */}
          <View style={styles.fundraiserEditSection}>
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Fundraiser</Text>
                <Text style={styles.switchSubtitle}>Enable donation collection</Text>
              </View>
              <Switch
                value={editFundraiserEnabled}
                onValueChange={setEditFundraiserEnabled}
                trackColor={{ false: '#ccc', true: '#27ae60' }}
                thumbColor="#fff"
              />
            </View>
            {editFundraiserEnabled && (
              <TextInput
                style={styles.input}
                placeholderTextColor="#999"
                placeholder="Fundraising Target (LKR) *"
                value={editFundraiserTarget}
                onChangeText={setEditFundraiserTarget}
                keyboardType="numeric"
              />
            )}
          </View>

          <TouchableOpacity style={styles.imagePickerButton} onPress={pickEditBanner}>
            <Text style={styles.imagePickerText}>
              {editBannerImage ? '✅ New Banner Selected' : '📷 Change Banner Image (optional)'}
            </Text>
          </TouchableOpacity>
          {editBannerImage && (
            <Image source={{ uri: editBannerImage.uri }} style={styles.previewImage} />
          )}

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

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{applications.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{applications.filter(a => a.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{applications.filter(a => a.status === 'approved').length}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{applications.filter(a => a.status === 'completed').length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Fundraiser Summary (if enabled) */}
      {opportunity?.fundraiser?.enabled && (
        <View style={styles.fundraiserCard}>
          <Text style={styles.fundraiserLabel}>Fundraiser Progress</Text>
          <View style={styles.fundraiserAmounts}>
            <Text style={styles.fundraiserCollected}>LKR {confirmedTotal.toLocaleString()}</Text>
            <Text style={styles.fundraiserTarget}> of LKR {fundraiserTargetAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${fundraiserPct}%` }]} />
          </View>
          <Text style={styles.fundraiserPct}>{fundraiserPct}% funded · {donations.filter(d => d.status === 'pending').length} pending review</Text>
        </View>
      )}

      {/* Main Tabs */}
      <View style={styles.mainTabsRow}>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'applications' && styles.mainTabActive]}
          onPress={() => setActiveTab('applications')}
        >
          <Text style={[styles.mainTabText, activeTab === 'applications' && styles.mainTabTextActive]}>
            Applications ({applications.length})
          </Text>
        </TouchableOpacity>
        {opportunity?.fundraiser?.enabled && (
          <TouchableOpacity
            style={[styles.mainTab, activeTab === 'donations' && styles.mainTabActive]}
            onPress={() => setActiveTab('donations')}
          >
            <Text style={[styles.mainTabText, activeTab === 'donations' && styles.mainTabTextActive]}>
              Donations ({donations.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <View>
          <View style={styles.filterContainer}>
            {['all', 'pending', 'approved', 'completed'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, appFilter === f && styles.filterTabActive]}
                onPress={() => setAppFilter(f)}
              >
                <Text style={[styles.filterTabText, appFilter === f && styles.filterTabTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Applications ({filteredApplications.length})</Text>

          {filteredApplications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No applications</Text>
            </View>
          ) : (
            filteredApplications.map((app) => (
              <View key={app._id} style={styles.appCard}>
                <View style={styles.appHeader}>
                  <View style={styles.appVolunteerInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {app.volunteer?.name?.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.volunteerName}>{app.volunteer?.name}</Text>
                      <Text style={styles.volunteerEmail}>{app.volunteer?.email}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getAppStatusColor(app.status) }]}>
                    <Text style={styles.statusText}>{app.status}</Text>
                  </View>
                </View>

                {app.photo ? (
                  <Image source={{ uri: `${BASE_URL}/${app.photo}` }} style={styles.applicantPhoto} />
                ) : null}

                <Text style={styles.appDetail}>📞 {app.phone}</Text>
                <Text style={styles.appDetail}>✉️ {app.email}</Text>
                <Text style={styles.appDetail}>💬 {app.coverLetter}</Text>
                <Text style={styles.appDate}>Applied: {new Date(app.appliedAt).toDateString()}</Text>

                <View style={styles.actionButtons}>
                  {app.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleUpdateAppStatus(app._id, 'approved')}
                    >
                      <Text style={styles.actionButtonText}>✅ Accept</Text>
                    </TouchableOpacity>
                  )}
                  {app.status === 'approved' && (
                    <TouchableOpacity
                      style={styles.completeButton}
                      onPress={() => handleUpdateAppStatus(app._id, 'completed')}
                    >
                      <Text style={styles.actionButtonText}>🏆 Mark Completed</Text>
                    </TouchableOpacity>
                  )}
                  {app.status === 'completed' && (
                    <TouchableOpacity
                      style={styles.certificateButton}
                      onPress={() => handleGenerateCertificate(app)}
                    >
                      <Text style={styles.actionButtonText}>🎓 Generate Certificate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Donations Tab */}
      {activeTab === 'donations' && (
        <View>
          <View style={styles.filterContainer}>
            {['all', 'pending', 'confirmed', 'rejected'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, donationFilter === f && styles.filterTabActive]}
                onPress={() => setDonationFilter(f)}
              >
                <Text style={[styles.filterTabText, donationFilter === f && styles.filterTabTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Donations ({filteredDonations.length})</Text>

          {filteredDonations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No donations yet</Text>
            </View>
          ) : (
            filteredDonations.map((don) => (
              <View key={don._id} style={styles.donationCard}>
                <View style={styles.donationHeader}>
                  <View style={styles.donorInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {don.donor?.name?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.volunteerName}>{don.donor?.name || don.donorName || 'Anonymous'}</Text>
                      <Text style={styles.volunteerEmail}>{don.donor?.email}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getDonationStatusColor(don.status) }]}>
                    <Text style={styles.statusText}>{don.status}</Text>
                  </View>
                </View>

                <Text style={styles.donationAmount}>LKR {Number(don.amount).toLocaleString()}</Text>
                {don.donorPhone ? <Text style={styles.appDetail}>📞 {don.donorPhone}</Text> : null}
                {don.message ? <Text style={styles.appDetail}>💬 {don.message}</Text> : null}
                {don.receiptImage ? (
                  <Image
                    source={{ uri: `${BASE_URL}/${don.receiptImage}` }}
                    style={styles.receiptImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.noReceiptText}>No receipt uploaded</Text>
                )}
                <Text style={styles.appDate}>{new Date(don.createdAt).toDateString()}</Text>

                {don.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => handleUpdateDonationStatus(don._id, 'confirmed')}
                    >
                      <Text style={styles.actionButtonText}>✅ Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleUpdateDonationStatus(don._id, 'rejected')}
                    >
                      <Text style={styles.actionButtonText}>❌ Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  headerDetail: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 4 },
  editButton: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, padding: 10, alignItems: 'center' },
  editButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  editForm: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  editFormTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  input: { backgroundColor: '#f8f8f8', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 15, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  textArea: { backgroundColor: '#f8f8f8', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 15, borderWidth: 1, borderColor: '#ddd', minHeight: 90, textAlignVertical: 'top', color: '#333' },
  fundraiserEditSection: { backgroundColor: '#f0fff4', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#27ae60' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  switchLabel: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  switchSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#2e86de', borderStyle: 'dashed', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 10 },
  imagePickerText: { color: '#2e86de', fontWeight: 'bold', fontSize: 14 },
  previewImage: { width: '100%', height: 180, borderRadius: 8, marginBottom: 10 },
  editFormButtons: { flexDirection: 'row', gap: 10, marginTop: 5 },
  saveButton: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, padding: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelEditButton: { flex: 1, borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelEditText: { color: '#555', fontWeight: 'bold', fontSize: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', marginHorizontal: 3, elevation: 2 },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#2e86de' },
  statLabel: { fontSize: 12, color: '#888' },
  fundraiserCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#27ae60' },
  fundraiserLabel: { fontSize: 14, color: '#27ae60', fontWeight: 'bold', marginBottom: 8 },
  fundraiserAmounts: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  fundraiserCollected: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  fundraiserTarget: { fontSize: 14, color: '#888' },
  progressBarBg: { height: 12, backgroundColor: '#e0e0e0', borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', backgroundColor: '#27ae60', borderRadius: 6 },
  fundraiserPct: { fontSize: 13, color: '#888' },
  mainTabsRow: { flexDirection: 'row', marginBottom: 15, backgroundColor: '#fff', borderRadius: 10, padding: 4, elevation: 2 },
  mainTab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  mainTabActive: { backgroundColor: '#2e86de' },
  mainTabText: { color: '#2e86de', fontWeight: 'bold', fontSize: 14 },
  mainTabTextActive: { color: '#fff' },
  filterContainer: { flexDirection: 'row', marginBottom: 15, gap: 6 },
  filterTab: { flex: 1, padding: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2e86de', alignItems: 'center' },
  filterTabActive: { backgroundColor: '#2e86de' },
  filterTabText: { color: '#2e86de', fontSize: 11, fontWeight: 'bold' },
  filterTabTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  emptyContainer: { alignItems: 'center', padding: 30 },
  emptyText: { color: '#999', fontSize: 16 },
  appCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 3 },
  donationCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#27ae60' },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  donationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  appVolunteerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  donorInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  volunteerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  volunteerEmail: { fontSize: 12, color: '#888' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  applicantPhoto: { width: 80, height: 80, borderRadius: 40, marginBottom: 10, alignSelf: 'center' },
  receiptImage: { width: '100%', height: 160, borderRadius: 8, marginVertical: 8 },
  noReceiptText: { color: '#aaa', fontSize: 13, marginVertical: 6 },
  donationAmount: { fontSize: 22, fontWeight: 'bold', color: '#27ae60', marginBottom: 6 },
  appDetail: { color: '#555', marginBottom: 4, fontSize: 14 },
  appDate: { color: '#999', fontSize: 12, marginTop: 5, marginBottom: 10 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  acceptButton: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectButton: { flex: 1, backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, alignItems: 'center' },
  completeButton: { flex: 1, backgroundColor: '#2e86de', borderRadius: 8, padding: 10, alignItems: 'center' },
  certificateButton: { flex: 1, backgroundColor: '#f39c12', borderRadius: 8, padding: 10, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});

export default CreatorOpportunityDetailScreen;
