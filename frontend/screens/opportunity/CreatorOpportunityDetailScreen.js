import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, Platform, Modal, FlatList
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const CreatorOpportunityDetailScreen = ({ route, navigation }) => {
  const { opportunityId } = route.params;
  const [opportunity, setOpportunity] = useState(null);
  const [applications, setApplications] = useState([]);
  const [fundraisers, setFundraisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications');
  const [appFilter, setAppFilter] = useState('all');
  const [donationFilter, setDonationFilter] = useState('all');

  // Per-fundraiser donations
  const [selectedFundraiser, setSelectedFundraiser] = useState(null);
  const [fundraiserDonations, setFundraiserDonations] = useState([]);
  const [donationsLoading, setDonationsLoading] = useState(false);

  // Donors modal
  const [donorsModal, setDonorsModal] = useState(null);
  const [donors, setDonors] = useState([]);
  const [donorsLoading, setDonorsLoading] = useState(false);

  // Edit opportunity form
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

  // Add fundraiser form
  const [showAddFundraiser, setShowAddFundraiser] = useState(false);
  const [newFrName, setNewFrName] = useState('');
  const [newFrTarget, setNewFrTarget] = useState('');
  const [addFrLoading, setAddFrLoading] = useState(false);

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
      if (frRes.data.length > 0 && !selectedFundraiser) {
        loadFundraiserDonations(frRes.data[0]._id);
        setSelectedFundraiser(frRes.data[0]);
      }
    } catch {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadFundraiserDonations = async (fundraiserId) => {
    setDonationsLoading(true);
    try {
      const res = await api.get(`/api/donations/fundraiser/${fundraiserId}`);
      setFundraiserDonations(res.data.donations);
    } catch {
      setFundraiserDonations([]);
    } finally {
      setDonationsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openDonors = async (fr) => {
    setDonorsModal(fr);
    setDonorsLoading(true);
    try {
      const res = await api.get(`/api/fundraisers/${fr._id}/donors`);
      setDonors(res.data.donors);
    } catch {
      setDonors([]);
    } finally {
      setDonorsLoading(false);
    }
  };

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

  const handleSaveEdit = async () => {
    if (!editTitle || !editDescription || !editLocation || !editStartDate || !editEndDate || !editSpots) {
      Alert.alert('Missing Fields', 'Please fill in all required fields'); return;
    }
    if (new Date(editStartDate) >= new Date(editEndDate)) {
      Alert.alert('Invalid Dates', 'End date must be after start date'); return;
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
      Alert.alert('Success', 'Opportunity updated!');
      setShowEdit(false);
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddFundraiser = async () => {
    if (!newFrName) { Alert.alert('Missing', 'Enter a fundraiser name'); return; }
    if (!newFrTarget || isNaN(newFrTarget) || Number(newFrTarget) < 1) { Alert.alert('Invalid', 'Enter a valid target amount'); return; }
    setAddFrLoading(true);
    try {
      await api.post('/api/fundraisers', { opportunityId, name: newFrName, targetAmount: newFrTarget });
      Alert.alert('Created!', 'Fundraiser added successfully');
      setShowAddFundraiser(false);
      setNewFrName(''); setNewFrTarget('');
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed');
    } finally {
      setAddFrLoading(false);
    }
  };

  const handleCompleteFundraiser = (fr) => {
    Alert.alert('Complete Fundraiser', `Mark "${fr.name}" as completed?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: async () => {
        try {
          await api.put(`/api/fundraisers/${fr._id}/complete`);
          Alert.alert('Done', 'Fundraiser marked as completed');
          fetchData();
        } catch { Alert.alert('Error', 'Failed'); }
      }}
    ]);
  };

  const handleUpdateAppStatus = async (applicationId, status) => {
    try {
      await api.put(`/api/applications/${applicationId}/status`, { status });
      Alert.alert('Updated', `Application ${status}!`);
      fetchData();
    } catch { Alert.alert('Error', 'Failed to update status'); }
  };

  const handleUpdateDonationStatus = (donationId, status) => {
    Alert.alert(
      status === 'confirmed' ? 'Accept Donation' : 'Reject Donation',
      `Are you sure you want to ${status === 'confirmed' ? 'accept' : 'reject'} this?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: status === 'confirmed' ? 'Accept' : 'Reject', style: status === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.put(`/api/donations/${donationId}/status`, { status });
              Alert.alert('Done', `Donation ${status}!`);
              if (selectedFundraiser) loadFundraiserDonations(selectedFundraiser._id);
              fetchData();
            } catch { Alert.alert('Error', 'Failed'); }
          }
        }
      ]
    );
  };

  const appStatusColor = (s) => ({ approved: '#27ae60', completed: '#2e86de' }[s] || '#f39c12');
  const donStatusColor = (s) => ({ confirmed: '#27ae60', rejected: '#e74c3c' }[s] || '#f39c12');

  const filteredApps = appFilter === 'all' ? applications : applications.filter(a => a.status === appFilter);
  const filteredDonations = donationFilter === 'all' ? fundraiserDonations : fundraiserDonations.filter(d => d.status === donationFilter);

  const fmt = (d) => d ? new Date(d).toDateString() : 'Not set';

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>{opportunity?.title}</Text>
        {opportunity?.organization ? <Text style={styles.headerDetail}>🏢 {opportunity.organization}</Text> : null}
        <Text style={styles.headerDetail}>📍 {opportunity?.location}</Text>
        <Text style={styles.headerDetail}>📅 {fmt(opportunity?.startDate)} — {fmt(opportunity?.endDate)}</Text>
        <Text style={styles.headerDetail}>👥 {opportunity?.spotsAvailable} spots</Text>
        {opportunity?.responsibleName ? <Text style={styles.headerDetail}>🙋 {opportunity.responsibleName}</Text> : null}
        <TouchableOpacity style={styles.editButton} onPress={openEdit}>
          <Text style={styles.editButtonText}>✏️ Edit Details</Text>
        </TouchableOpacity>
      </View>

      {/* Edit form */}
      {showEdit && (
        <View style={styles.editForm}>
          <Text style={styles.editFormTitle}>Edit Opportunity</Text>
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Title *" value={editTitle} onChangeText={setEditTitle} />
          <TextInput style={styles.textArea} placeholderTextColor="#999" placeholder="Description *" value={editDescription} onChangeText={setEditDescription} multiline numberOfLines={4} />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Organization" value={editOrganization} onChangeText={setEditOrganization} />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Location *" value={editLocation} onChangeText={setEditLocation} />

          <TouchableOpacity style={styles.dateButton} onPress={() => { setDatePickerTarget('start'); setShowDatePicker(true); }}>
            <Text style={[styles.dateButtonText, !editStartDate && styles.datePlaceholder]}>{editStartDate ? `Start: ${fmt(editStartDate)}` : 'Select Start Date *'}</Text>
            <Text>📅</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateButton} onPress={() => { setDatePickerTarget('end'); setShowDatePicker(true); }}>
            <Text style={[styles.dateButtonText, !editEndDate && styles.datePlaceholder]}>{editEndDate ? `End: ${fmt(editEndDate)}` : 'Select End Date *'}</Text>
            <Text>📅</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={datePickerTarget === 'start' ? (editStartDate ? new Date(editStartDate) : new Date()) : (editEndDate ? new Date(editEndDate) : new Date())}
              mode="date" display="default" onChange={onDateChange}
            />
          )}

          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Spots *" value={editSpots} onChangeText={setEditSpots} keyboardType="numeric" />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Responsible Name" value={editResponsibleName} onChangeText={setEditResponsibleName} />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Responsible Email" value={editResponsibleEmail} onChangeText={setEditResponsibleEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Responsible Phone" value={editResponsiblePhone} onChangeText={setEditResponsiblePhone} keyboardType="phone-pad" />

          <TouchableOpacity style={styles.imagePickerButton} onPress={pickEditBanner}>
            <Text style={styles.imagePickerText}>{editBannerImage ? '✅ New Banner Selected' : '📷 Change Banner (optional)'}</Text>
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
          { n: applications.length, l: 'Total' },
          { n: applications.filter(a => a.status === 'pending').length, l: 'Pending' },
          { n: applications.filter(a => a.status === 'approved').length, l: 'Accepted' },
          { n: applications.filter(a => a.status === 'completed').length, l: 'Done' }
        ].map(s => (
          <View key={s.l} style={styles.statBox}>
            <Text style={styles.statNumber}>{s.n}</Text>
            <Text style={styles.statLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Main tabs */}
      <View style={styles.mainTabsRow}>
        <TouchableOpacity style={[styles.mainTab, activeTab === 'applications' && styles.mainTabActive]} onPress={() => setActiveTab('applications')}>
          <Text style={[styles.mainTabText, activeTab === 'applications' && styles.mainTabTextActive]}>Applications ({applications.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mainTab, activeTab === 'donations' && styles.mainTabActive]} onPress={() => setActiveTab('donations')}>
          <Text style={[styles.mainTabText, activeTab === 'donations' && styles.mainTabTextActive]}>Fundraisers ({fundraisers.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Applications tab */}
      {activeTab === 'applications' && (
        <View>
          <View style={styles.filterContainer}>
            {['all', 'pending', 'approved', 'completed'].map(f => (
              <TouchableOpacity key={f} style={[styles.filterTab, appFilter === f && styles.filterTabActive]} onPress={() => setAppFilter(f)}>
                <Text style={[styles.filterTabText, appFilter === f && styles.filterTabTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sectionTitle}>Applications ({filteredApps.length})</Text>
          {filteredApps.length === 0 ? (
            <View style={styles.emptyContainer}><Text style={styles.emptyText}>No applications</Text></View>
          ) : filteredApps.map(app => (
            <View key={app._id} style={styles.appCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.avatarRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{app.volunteer?.name?.charAt(0).toUpperCase()}</Text></View>
                  <View>
                    <Text style={styles.personName}>{app.volunteer?.name}</Text>
                    <Text style={styles.personEmail}>{app.volunteer?.email}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: appStatusColor(app.status) }]}>
                  <Text style={styles.statusText}>{app.status}</Text>
                </View>
              </View>
              {app.photo ? <Image source={{ uri: `${BASE_URL}/${app.photo}` }} style={styles.applicantPhoto} /> : null}
              <Text style={styles.appDetail}>📞 {app.phone}</Text>
              <Text style={styles.appDetail}>✉️ {app.email}</Text>
              <Text style={styles.appDetail}>💬 {app.coverLetter}</Text>
              <Text style={styles.appDate}>{new Date(app.appliedAt).toDateString()}</Text>
              <View style={styles.actionButtons}>
                {app.status === 'pending' && <TouchableOpacity style={styles.acceptButton} onPress={() => handleUpdateAppStatus(app._id, 'approved')}><Text style={styles.actionBtnText}>✅ Accept</Text></TouchableOpacity>}
                {app.status === 'approved' && <TouchableOpacity style={styles.completeButton} onPress={() => handleUpdateAppStatus(app._id, 'completed')}><Text style={styles.actionBtnText}>🏆 Complete</Text></TouchableOpacity>}
                {app.status === 'completed' && <TouchableOpacity style={styles.certButton} onPress={() => navigation.navigate('GenerateCertificate', { application: app, opportunity })}><Text style={styles.actionBtnText}>🎓 Certificate</Text></TouchableOpacity>}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Fundraisers tab */}
      {activeTab === 'donations' && (
        <View>
          {/* Add fundraiser button */}
          <TouchableOpacity style={styles.addFundraiserBtn} onPress={() => setShowAddFundraiser(!showAddFundraiser)}>
            <Text style={styles.addFundraiserBtnText}>{showAddFundraiser ? '✕ Cancel' : '+ Add New Fundraiser'}</Text>
          </TouchableOpacity>

          {showAddFundraiser && (
            <View style={styles.addFundraiserForm}>
              <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Fundraiser Name *" value={newFrName} onChangeText={setNewFrName} />
              <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Target Amount (LKR) *" value={newFrTarget} onChangeText={setNewFrTarget} keyboardType="numeric" />
              <TouchableOpacity style={styles.saveButton} onPress={handleAddFundraiser} disabled={addFrLoading}>
                {addFrLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Create Fundraiser</Text>}
              </TouchableOpacity>
            </View>
          )}

          {fundraisers.length === 0 ? (
            <View style={styles.emptyContainer}><Text style={styles.emptyText}>No fundraisers yet</Text></View>
          ) : fundraisers.map(fr => {
            const pct = fr.targetAmount > 0 ? Math.min(100, Math.round((fr.collectedAmount / fr.targetAmount) * 100)) : 0;
            const isSelected = selectedFundraiser?._id === fr._id;
            return (
              <View key={fr._id}>
                <TouchableOpacity
                  style={[styles.fundraiserCard, isSelected && styles.fundraiserCardSelected]}
                  onPress={() => { setSelectedFundraiser(fr); loadFundraiserDonations(fr._id); }}
                >
                  <View style={styles.fundraiserCardHeader}>
                    <Text style={styles.fundraiserCardName}>{fr.name}</Text>
                    {fr.status === 'completed'
                      ? <View style={styles.completedBadge}><Text style={styles.completedText}>Completed</Text></View>
                      : <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>
                    }
                  </View>
                  <View style={styles.amountRow}>
                    <Text style={styles.collectedAmt}>LKR {fr.collectedAmount.toLocaleString()}</Text>
                    <Text style={styles.targetAmt}> / {fr.targetAmount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.progressBg}><View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: fr.status === 'completed' ? '#888' : '#27ae60' }]} /></View>
                  <Text style={styles.pctText}>{pct}% · {fr.donorCount} donor{fr.donorCount !== 1 ? 's' : ''}</Text>
                  <View style={styles.frButtons}>
                    <TouchableOpacity style={styles.viewDonorsBtn} onPress={() => openDonors(fr)}>
                      <Text style={styles.viewDonorsBtnText}>View Donors</Text>
                    </TouchableOpacity>
                    {fr.status === 'active' && (
                      <TouchableOpacity style={styles.completeBtn} onPress={() => handleCompleteFundraiser(fr)}>
                        <Text style={styles.completeBtnText}>Mark Complete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Donations for this fundraiser (expanded when selected) */}
                {isSelected && (
                  <View style={styles.donationsSection}>
                    <View style={styles.filterContainer}>
                      {['all', 'pending', 'confirmed', 'rejected'].map(f => (
                        <TouchableOpacity key={f} style={[styles.filterTab, donationFilter === f && styles.filterTabActive]} onPress={() => setDonationFilter(f)}>
                          <Text style={[styles.filterTabText, donationFilter === f && styles.filterTabTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {donationsLoading ? <ActivityIndicator color="#27ae60" style={{ margin: 20 }} /> : filteredDonations.length === 0 ? (
                      <Text style={styles.noDonationsText}>No donations yet</Text>
                    ) : filteredDonations.map(don => (
                      <View key={don._id} style={styles.donationCard}>
                        <View style={styles.cardTopRow}>
                          <View style={styles.avatarRow}>
                            <View style={styles.avatar}><Text style={styles.avatarText}>{(don.donor?.name || don.donorName || '?').charAt(0).toUpperCase()}</Text></View>
                            <View>
                              <Text style={styles.personName}>{don.donor?.name || don.donorName || 'Anonymous'}</Text>
                              {don.donor?.email ? <Text style={styles.personEmail}>{don.donor.email}</Text> : null}
                            </View>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: donStatusColor(don.status) }]}>
                            <Text style={styles.statusText}>{don.status}</Text>
                          </View>
                        </View>
                        <Text style={styles.donationAmount}>LKR {Number(don.amount).toLocaleString()}</Text>
                        {don.donorPhone ? <Text style={styles.appDetail}>📞 {don.donorPhone}</Text> : null}
                        {don.message ? <Text style={styles.appDetail}>💬 {don.message}</Text> : null}
                        {don.receiptImage ? <Image source={{ uri: `${BASE_URL}/${don.receiptImage}` }} style={styles.receiptImg} resizeMode="cover" /> : <Text style={styles.noReceiptText}>No receipt</Text>}
                        <Text style={styles.appDate}>{new Date(don.createdAt).toDateString()}</Text>
                        {don.status === 'pending' && (
                          <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.acceptButton} onPress={() => handleUpdateDonationStatus(don._id, 'confirmed')}><Text style={styles.actionBtnText}>✅ Accept</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.rejectButton} onPress={() => handleUpdateDonationStatus(don._id, 'rejected')}><Text style={styles.actionBtnText}>❌ Reject</Text></TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Donors Modal */}
      <Modal visible={!!donorsModal} animationType="slide" onRequestClose={() => setDonorsModal(null)}>
        <View style={styles.donorsModal}>
          <View style={styles.donorsHeader}>
            <Text style={styles.donorsTitle}>{donorsModal?.name}</Text>
            <TouchableOpacity onPress={() => setDonorsModal(null)} style={{ padding: 5 }}><Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>✕</Text></TouchableOpacity>
          </View>
          <Text style={styles.donorsSubtitle}>Donors ranked by contribution</Text>
          {donorsLoading ? <ActivityIndicator size="large" color="#27ae60" style={{ marginTop: 40 }} /> : donors.length === 0 ? (
            <Text style={styles.noDonorsText}>No confirmed donors yet</Text>
          ) : (
            <FlatList
              data={donors}
              keyExtractor={(_, i) => i.toString()}
              contentContainerStyle={{ padding: 15 }}
              renderItem={({ item }) => (
                <View style={[styles.donorCard, item.rank <= 3 && styles.donorCardTop]}>
                  <Text style={styles.donorRankText}>{item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.donorName}>{item.name}</Text>
                    {item.message ? <Text style={styles.donorMessage}>"{item.message}"</Text> : null}
                  </View>
                  <Text style={styles.donorAmount}>LKR {item.amount.toLocaleString()}</Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
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
  dateButton: { backgroundColor: '#f8f8f8', borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#ddd', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateButtonText: { fontSize: 15, color: '#333' },
  datePlaceholder: { color: '#999' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#2e86de', borderStyle: 'dashed', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 10 },
  imagePickerText: { color: '#2e86de', fontWeight: 'bold', fontSize: 14 },
  previewImage: { width: '100%', height: 180, borderRadius: 8, marginBottom: 10 },
  editFormButtons: { flexDirection: 'row', gap: 10, marginTop: 5 },
  saveButton: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, padding: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  cancelEditButton: { flex: 1, borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 12, alignItems: 'center' },
  cancelEditText: { color: '#555', fontWeight: 'bold', fontSize: 15 },
  statsRow: { flexDirection: 'row', marginBottom: 15, gap: 6 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', elevation: 2 },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#2e86de' },
  statLabel: { fontSize: 11, color: '#888' },
  mainTabsRow: { flexDirection: 'row', marginBottom: 15, backgroundColor: '#fff', borderRadius: 10, padding: 4, elevation: 2 },
  mainTab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  mainTabActive: { backgroundColor: '#2e86de' },
  mainTabText: { color: '#2e86de', fontWeight: 'bold', fontSize: 13 },
  mainTabTextActive: { color: '#fff' },
  filterContainer: { flexDirection: 'row', marginBottom: 12, gap: 5 },
  filterTab: { flex: 1, padding: 7, borderRadius: 20, borderWidth: 1, borderColor: '#2e86de', alignItems: 'center' },
  filterTabActive: { backgroundColor: '#2e86de' },
  filterTabText: { color: '#2e86de', fontSize: 10, fontWeight: 'bold' },
  filterTabTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  emptyContainer: { alignItems: 'center', padding: 30 },
  emptyText: { color: '#999', fontSize: 15 },
  appCard: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 3 },
  donationCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 2, borderLeftWidth: 3, borderLeftColor: '#27ae60' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  personName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  personEmail: { fontSize: 12, color: '#888' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  applicantPhoto: { width: 80, height: 80, borderRadius: 40, marginBottom: 10, alignSelf: 'center' },
  receiptImg: { width: '100%', height: 150, borderRadius: 8, marginVertical: 8 },
  noReceiptText: { color: '#aaa', fontSize: 13, marginVertical: 4 },
  donationAmount: { fontSize: 20, fontWeight: 'bold', color: '#27ae60', marginBottom: 5 },
  appDetail: { color: '#555', marginBottom: 4, fontSize: 14 },
  appDate: { color: '#999', fontSize: 12, marginTop: 4, marginBottom: 8 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  acceptButton: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectButton: { flex: 1, backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, alignItems: 'center' },
  completeButton: { flex: 1, backgroundColor: '#2e86de', borderRadius: 8, padding: 10, alignItems: 'center' },
  certButton: { flex: 1, backgroundColor: '#f39c12', borderRadius: 8, padding: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  addFundraiserBtn: { backgroundColor: '#27ae60', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  addFundraiserBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  addFundraiserForm: { backgroundColor: '#f0fff4', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#27ae60' },
  fundraiserCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 3, borderLeftWidth: 4, borderLeftColor: '#27ae60' },
  fundraiserCardSelected: { borderLeftColor: '#2e86de', backgroundColor: '#f0f8ff' },
  fundraiserCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fundraiserCardName: { fontSize: 15, fontWeight: 'bold', color: '#333', flex: 1 },
  completedBadge: { backgroundColor: '#888', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  completedText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  activeBadge: { backgroundColor: '#27ae60', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  activeBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  collectedAmt: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  targetAmt: { fontSize: 13, color: '#888' },
  progressBg: { height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  pctText: { fontSize: 12, color: '#888', marginBottom: 10 },
  frButtons: { flexDirection: 'row', gap: 8 },
  viewDonorsBtn: { flex: 1, backgroundColor: '#f0f4f8', borderRadius: 8, padding: 9, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  viewDonorsBtnText: { color: '#555', fontWeight: 'bold', fontSize: 12 },
  completeBtn: { flex: 1, backgroundColor: '#2e86de', borderRadius: 8, padding: 9, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  donationsSection: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 10, marginTop: -4 },
  noDonationsText: { color: '#999', textAlign: 'center', padding: 20, fontSize: 14 },
  // Donors modal
  donorsModal: { flex: 1, backgroundColor: '#f0f4f8' },
  donorsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27ae60', padding: 20 },
  donorsTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', flex: 1 },
  donorsSubtitle: { fontSize: 13, color: '#888', paddingHorizontal: 15, paddingTop: 10 },
  noDonorsText: { textAlign: 'center', color: '#999', marginTop: 50, fontSize: 16 },
  donorCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 2, flexDirection: 'row', alignItems: 'center' },
  donorCardTop: { borderLeftWidth: 4, borderLeftColor: '#f39c12' },
  donorRankText: { fontSize: 22 },
  donorName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  donorMessage: { fontSize: 13, color: '#888', fontStyle: 'italic', marginTop: 2 },
  donorAmount: { fontSize: 16, fontWeight: 'bold', color: '#27ae60' }
});

export default CreatorOpportunityDetailScreen;
