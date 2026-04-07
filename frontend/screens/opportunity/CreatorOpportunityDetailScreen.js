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
  const [groups, setGroups] = useState([]);
  const [contributions, setContributions] = useState([]);
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

  // Groups
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [groupCreateLoading, setGroupCreateLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  // Assign-to-group modal
  const [assignModal, setAssignModal] = useState(null); // application object
  const [assignLoading, setAssignLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [oppRes, appRes, frRes, grpRes, contribRes] = await Promise.all([
        api.get(`/api/opportunities/${opportunityId}`),
        api.get(`/api/applications/opportunity/${opportunityId}`),
        api.get(`/api/fundraisers/opportunity/${opportunityId}`),
        api.get(`/api/application-groups/opportunity/${opportunityId}`),
        api.get(`/api/contributions/opportunity/${opportunityId}`)
      ]);
      setOpportunity(oppRes.data);
      setApplications(appRes.data);
      setFundraisers(frRes.data);
      setGroups(grpRes.data);
      setContributions(contribRes.data || []);
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
    } catch { setDonors([]); }
    finally { setDonorsLoading(false); }
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
              if (selectedFundraiser) loadFundraiserDonations(selectedFundraiser._id);
              fetchData();
            } catch { Alert.alert('Error', 'Failed'); }
          }
        }
      ]
    );
  };

  // Groups
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { Alert.alert('Missing', 'Enter a group name'); return; }
    setGroupCreateLoading(true);
    try {
      await api.post('/api/application-groups', { opportunityId, name: newGroupName, description: newGroupDesc });
      setShowCreateGroup(false);
      setNewGroupName(''); setNewGroupDesc('');
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed');
    } finally {
      setGroupCreateLoading(false);
    }
  };

  const handleDeleteGroup = (groupId, groupName) => {
    Alert.alert('Delete Group', `Delete group "${groupName}"? Applications stay unaffected.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/api/application-groups/${groupId}`);
          fetchData();
        } catch { Alert.alert('Error', 'Failed'); }
      }}
    ]);
  };

  const handleAcceptAllInGroup = (groupId, groupName, pendingCount) => {
    if (pendingCount === 0) { Alert.alert('No pending', 'No pending applications in this group'); return; }
    Alert.alert('Accept All', `Accept all ${pendingCount} pending application(s) in "${groupName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept All', onPress: async () => {
        try {
          const res = await api.post(`/api/application-groups/${groupId}/accept-all`);
          Alert.alert('Done', res.data.message);
          fetchData();
        } catch { Alert.alert('Error', 'Failed'); }
      }}
    ]);
  };

  const handleAssignToGroup = async (groupId) => {
    if (!assignModal) return;
    setAssignLoading(true);
    try {
      await api.post(`/api/application-groups/${groupId}/assign`, { applicationId: assignModal._id });
      setAssignModal(null);
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveFromGroup = async (groupId, appId) => {
    try {
      await api.delete(`/api/application-groups/${groupId}/remove/${appId}`);
      fetchData();
    } catch { Alert.alert('Error', 'Failed'); }
  };

  const handleVerifyContribution = async (contribId, status) => {
    try {
      await api.put(`/api/contributions/${contribId}/status`, { status });
      fetchData();
    } catch { Alert.alert('Error', 'Failed to update contribution'); }
  };

  // Compute grouped app IDs
  const groupedAppIds = new Set(groups.flatMap(g => g.applications.map(a => a._id || a)));
  const ungroupedApps = applications.filter(a => !groupedAppIds.has(a._id));

  const appStatusColor = (s) => ({ approved: '#27ae60', completed: '#2e86de', rejected: '#e74c3c' }[s] || '#f39c12');
  const donStatusColor = (s) => ({ confirmed: '#27ae60', rejected: '#e74c3c' }[s] || '#f39c12');

  const filteredApps = appFilter === 'all' ? applications : applications.filter(a => a.status === appFilter);
  const filteredDonations = donationFilter === 'all' ? fundraiserDonations : fundraiserDonations.filter(d => d.status === donationFilter);

  const fmt = (d) => d ? new Date(d).toDateString() : 'Not set';

  const AppCard = ({ app, groupId }) => (
    <View style={styles.appCard}>
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
      {app.phone ? <Text style={styles.appDetail}>📞 {app.phone}</Text> : null}
      {app.email ? <Text style={styles.appDetail}>✉️ {app.email}</Text> : null}
      {app.coverLetter ? <Text style={styles.appDetail}>💬 {app.coverLetter}</Text> : null}
      <Text style={styles.appDate}>{new Date(app.appliedAt).toDateString()}</Text>

      <View style={styles.actionButtons}>
        {app.status === 'pending' && <>
          <TouchableOpacity style={styles.acceptButton} onPress={() => handleUpdateAppStatus(app._id, 'approved')}><Text style={styles.actionBtnText}>✅ Accept</Text></TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={() => handleUpdateAppStatus(app._id, 'rejected')}><Text style={styles.actionBtnText}>❌ Reject</Text></TouchableOpacity>
        </>}
        {app.status === 'approved' && (
          <TouchableOpacity style={styles.completeButton} onPress={() => handleUpdateAppStatus(app._id, 'completed')}><Text style={styles.actionBtnText}>🏆 Complete</Text></TouchableOpacity>
        )}
        {app.status === 'completed' && (
          <TouchableOpacity style={styles.certButton} onPress={() => navigation.navigate('GenerateCertificate', { application: app, opportunity })}><Text style={styles.actionBtnText}>🎓 Certificate</Text></TouchableOpacity>
        )}
      </View>

      {/* Group actions */}
      <View style={styles.groupAppActions}>
        {app.status === 'pending' && (
          <TouchableOpacity style={styles.assignGroupBtn} onPress={() => setAssignModal(app)}>
            <Text style={styles.assignGroupBtnText}>📂 Move to Group</Text>
          </TouchableOpacity>
        )}
        {groupId && (
          <TouchableOpacity style={styles.removeFromGroupBtn} onPress={() => handleRemoveFromGroup(groupId, app._id)}>
            <Text style={styles.removeFromGroupText}>✕ Remove from group</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Contribution requests for approved apps */}
      {app.status === 'approved' && (() => {
        const appContribs = contributions.filter(c =>
          c.volunteer?._id === app.volunteer?._id || c.volunteer === app.volunteer?._id
        );
        if (appContribs.length === 0) return (
          <Text style={styles.noContribText}>No contribution submissions yet</Text>
        );
        return (
          <View style={styles.contribSection}>
            <Text style={styles.contribSectionTitle}>📋 Contribution Requests</Text>
            {appContribs.map(c => (
              <View key={c._id} style={[styles.contribCard, { borderLeftColor: c.status === 'verified' ? '#27ae60' : c.status === 'rejected' ? '#e74c3c' : '#f39c12' }]}>
                <View style={styles.contribRow}>
                  <Text style={styles.contribHours}>⏱ {c.hours} hr{c.hours !== 1 ? 's' : ''}</Text>
                  <View style={[styles.contribBadge, { backgroundColor: c.status === 'verified' ? '#27ae60' : c.status === 'rejected' ? '#e74c3c' : '#f39c12' }]}>
                    <Text style={styles.contribBadgeText}>{c.status}</Text>
                  </View>
                </View>
                {c.description ? <Text style={styles.contribDesc}>{c.description}</Text> : null}
                <Text style={styles.contribDate}>{new Date(c.createdAt).toDateString()}</Text>
                {c.status === 'pending' && (
                  <View style={styles.contribActions}>
                    <TouchableOpacity style={styles.verifyBtn} onPress={() => handleVerifyContribution(c._id, 'verified')}>
                      <Text style={styles.verifyBtnText}>✅ Verify</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectContribBtn} onPress={() => handleVerifyContribution(c._id, 'rejected')}>
                      <Text style={styles.rejectContribBtnText}>❌ Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        );
      })()}
    </View>
  );

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
          { n: applications.filter(a => a.status === 'rejected').length, l: 'Rejected' },
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
          {/* Filter tabs */}
          <View style={styles.filterContainer}>
            {['all', 'pending', 'approved', 'rejected', 'completed'].map(f => (
              <TouchableOpacity key={f} style={[styles.filterTab, appFilter === f && styles.filterTabActive]} onPress={() => setAppFilter(f)}>
                <Text style={[styles.filterTabText, appFilter === f && styles.filterTabTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Groups section — only when filter is 'all' or 'pending' */}
          {(appFilter === 'all' || appFilter === 'pending') && (
            <View>
              <View style={styles.groupsHeader}>
                <Text style={styles.sectionTitle}>Groups ({groups.length})</Text>
                <TouchableOpacity style={styles.createGroupBtn} onPress={() => setShowCreateGroup(!showCreateGroup)}>
                  <Text style={styles.createGroupBtnText}>{showCreateGroup ? '✕' : '+ New Group'}</Text>
                </TouchableOpacity>
              </View>

              {showCreateGroup && (
                <View style={styles.createGroupForm}>
                  <TextInput
                    style={styles.input} placeholderTextColor="#999"
                    placeholder="Group name (e.g. Potential, Not Qualified) *"
                    value={newGroupName} onChangeText={setNewGroupName}
                  />
                  <TextInput
                    style={styles.input} placeholderTextColor="#999"
                    placeholder="Description (optional)"
                    value={newGroupDesc} onChangeText={setNewGroupDesc}
                  />
                  <TouchableOpacity style={styles.saveButton} onPress={handleCreateGroup} disabled={groupCreateLoading}>
                    {groupCreateLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Create Group</Text>}
                  </TouchableOpacity>
                </View>
              )}

              {groups.length === 0 ? (
                <View style={styles.noGroupsHint}>
                  <Text style={styles.noGroupsText}>💡 Create groups to organise pending applications (e.g. "Potential", "Not Qualified")</Text>
                </View>
              ) : (
                groups.map(group => {
                  const groupApps = group.applications || [];
                  const pendingInGroup = groupApps.filter(a => a.status === 'pending');
                  const isExpanded = expandedGroups[group._id];
                  return (
                    <View key={group._id} style={styles.groupCard}>
                      <TouchableOpacity
                        style={styles.groupCardHeader}
                        onPress={() => setExpandedGroups(prev => ({ ...prev, [group._id]: !prev[group._id] }))}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.groupName}>{group.name}</Text>
                          {group.description ? <Text style={styles.groupDesc}>{group.description}</Text> : null}
                          <Text style={styles.groupCount}>{groupApps.length} application{groupApps.length !== 1 ? 's' : ''} · {pendingInGroup.length} pending</Text>
                        </View>
                        <View style={styles.groupHeaderRight}>
                          <Text style={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.groupBody}>
                          <View style={styles.groupActions}>
                            <TouchableOpacity
                              style={[styles.acceptAllBtn, pendingInGroup.length === 0 && styles.acceptAllBtnDisabled]}
                              onPress={() => handleAcceptAllInGroup(group._id, group.name, pendingInGroup.length)}
                            >
                              <Text style={styles.acceptAllBtnText}>✅ Accept All Pending ({pendingInGroup.length})</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteGroupBtn} onPress={() => handleDeleteGroup(group._id, group.name)}>
                              <Text style={styles.deleteGroupBtnText}>🗑️</Text>
                            </TouchableOpacity>
                          </View>

                          {groupApps.length === 0 ? (
                            <Text style={styles.emptyGroupText}>No applications in this group yet. Use "Move to Group" on an application.</Text>
                          ) : (
                            groupApps.map(app => <AppCard key={app._id} app={app} groupId={group._id} />)
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}

              {/* Ungrouped pending */}
              {ungroupedApps.filter(a => appFilter === 'pending' ? a.status === 'pending' : a.status === 'pending').length > 0 && (
                <Text style={styles.ungroupedLabel}>📋 Ungrouped Pending ({ungroupedApps.filter(a => a.status === 'pending').length})</Text>
              )}
              {ungroupedApps.filter(a => a.status === 'pending').map(app => <AppCard key={app._id} app={app} />)}
            </View>
          )}

          {/* All applications list (for non-pending filters) */}
          {appFilter !== 'all' && appFilter !== 'pending' && (
            <View>
              <Text style={styles.sectionTitle}>Applications ({filteredApps.length})</Text>
              {filteredApps.length === 0 ? (
                <View style={styles.emptyContainer}><Text style={styles.emptyText}>No applications</Text></View>
              ) : filteredApps.map(app => <AppCard key={app._id} app={app} />)}
            </View>
          )}

          {/* Show non-pending ungrouped in 'all' view */}
          {appFilter === 'all' && (
            <View>
              {ungroupedApps.filter(a => a.status !== 'pending').length > 0 && (
                <Text style={styles.ungroupedLabel}>📋 Other Applications</Text>
              )}
              {ungroupedApps.filter(a => a.status !== 'pending').map(app => <AppCard key={app._id} app={app} />)}
            </View>
          )}
        </View>
      )}

      {/* Fundraisers tab */}
      {activeTab === 'donations' && (
        <View>
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
                  <Text style={styles.pctText}>{pct}% · {fr.donorCount || 0} donor{(fr.donorCount || 0) !== 1 ? 's' : ''}</Text>
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
                        {don.receiptImage
                          ? <Image source={{ uri: `${BASE_URL}/${don.receiptImage}` }} style={styles.receiptImg} resizeMode="cover" />
                          : <Text style={styles.noReceiptText}>No receipt</Text>
                        }
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

      {/* Assign-to-group modal */}
      <Modal visible={!!assignModal} transparent animationType="slide" onRequestClose={() => setAssignModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAssignModal(null)}>
          <View style={styles.assignModal} onStartShouldSetResponder={() => true}>
            <View style={styles.assignModalHandle} />
            <Text style={styles.assignModalTitle}>Move to Group</Text>
            <Text style={styles.assignModalSubtitle}>{assignModal?.volunteer?.name}</Text>
            {groups.length === 0 ? (
              <Text style={styles.noGroupsText}>No groups yet. Create one first.</Text>
            ) : groups.map(g => (
              <TouchableOpacity key={g._id} style={styles.assignGroupItem} onPress={() => handleAssignToGroup(g._id)} disabled={assignLoading}>
                <Text style={styles.assignGroupItemIcon}>📂</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.assignGroupItemName}>{g.name}</Text>
                  {g.description ? <Text style={styles.assignGroupItemDesc}>{g.description}</Text> : null}
                </View>
                {assignLoading ? <ActivityIndicator size="small" color="#2e86de" /> : <Text style={styles.assignGroupItemArrow}>→</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.assignCancelBtn} onPress={() => setAssignModal(null)}>
              <Text style={styles.assignCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  statsRow: { flexDirection: 'row', marginBottom: 15, gap: 5 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', elevation: 2 },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#2e86de' },
  statLabel: { fontSize: 10, color: '#888' },
  mainTabsRow: { flexDirection: 'row', marginBottom: 15, backgroundColor: '#fff', borderRadius: 10, padding: 4, elevation: 2 },
  mainTab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  mainTabActive: { backgroundColor: '#2e86de' },
  mainTabText: { color: '#2e86de', fontWeight: 'bold', fontSize: 13 },
  mainTabTextActive: { color: '#fff' },
  filterContainer: { flexDirection: 'row', marginBottom: 12, gap: 4, flexWrap: 'wrap' },
  filterTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#2e86de', alignItems: 'center' },
  filterTabActive: { backgroundColor: '#2e86de' },
  filterTabText: { color: '#2e86de', fontSize: 11, fontWeight: 'bold' },
  filterTabTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  // Groups
  groupsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  createGroupBtn: { backgroundColor: '#9b59b6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  createGroupBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  createGroupForm: { backgroundColor: '#f8f4ff', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#9b59b6' },
  noGroupsHint: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 12 },
  noGroupsText: { color: '#888', fontSize: 13, textAlign: 'center' },
  groupCard: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 12, elevation: 2, overflow: 'hidden', borderLeftWidth: 4, borderLeftColor: '#9b59b6' },
  groupCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#faf7ff' },
  groupName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  groupDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  groupCount: { fontSize: 12, color: '#9b59b6', marginTop: 3, fontWeight: '600' },
  groupHeaderRight: { paddingLeft: 10 },
  expandIcon: { fontSize: 14, color: '#9b59b6', fontWeight: 'bold' },
  groupBody: { padding: 12, paddingTop: 0 },
  groupActions: { flexDirection: 'row', gap: 8, marginBottom: 10, marginTop: 10 },
  acceptAllBtn: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, padding: 10, alignItems: 'center' },
  acceptAllBtnDisabled: { backgroundColor: '#aaa' },
  acceptAllBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  deleteGroupBtn: { backgroundColor: '#ffe0e0', borderRadius: 8, padding: 10, alignItems: 'center', paddingHorizontal: 14 },
  deleteGroupBtnText: { fontSize: 16 },
  emptyGroupText: { color: '#aaa', fontSize: 13, textAlign: 'center', padding: 10 },
  ungroupedLabel: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8, marginTop: 4 },
  // App card
  emptyContainer: { alignItems: 'center', padding: 30 },
  emptyText: { color: '#999', fontSize: 15 },
  appCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 2, borderLeftWidth: 3, borderLeftColor: '#2e86de' },
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
  appDate: { color: '#999', fontSize: 12, marginTop: 4, marginBottom: 6 },
  actionButtons: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  acceptButton: { flex: 1, backgroundColor: '#27ae60', borderRadius: 8, padding: 10, alignItems: 'center' },
  rejectButton: { flex: 1, backgroundColor: '#e74c3c', borderRadius: 8, padding: 10, alignItems: 'center' },
  completeButton: { flex: 1, backgroundColor: '#2e86de', borderRadius: 8, padding: 10, alignItems: 'center' },
  certButton: { flex: 1, backgroundColor: '#f39c12', borderRadius: 8, padding: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  groupAppActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  assignGroupBtn: { backgroundColor: '#f0f4f8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#9b59b6' },
  assignGroupBtnText: { color: '#9b59b6', fontSize: 12, fontWeight: 'bold' },
  removeFromGroupBtn: { backgroundColor: '#ffe8e8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  removeFromGroupText: { color: '#e74c3c', fontSize: 12, fontWeight: 'bold' },
  // Fundraisers
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
  donorAmount: { fontSize: 16, fontWeight: 'bold', color: '#27ae60' },
  // Contributions
  noContribText: { color: '#bbb', fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  contribSection: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  contribSectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  contribCard: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#f39c12' },
  contribRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  contribHours: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  contribBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  contribBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  contribDesc: { fontSize: 13, color: '#555', marginBottom: 4 },
  contribDate: { fontSize: 11, color: '#aaa', marginBottom: 6 },
  contribActions: { flexDirection: 'row', gap: 8 },
  verifyBtn: { flex: 1, backgroundColor: '#27ae60', borderRadius: 7, padding: 8, alignItems: 'center' },
  verifyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  rejectContribBtn: { flex: 1, backgroundColor: '#e74c3c', borderRadius: 7, padding: 8, alignItems: 'center' },
  rejectContribBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  // Assign modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  assignModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  assignModalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  assignModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  assignModalSubtitle: { fontSize: 14, color: '#888', marginBottom: 16 },
  assignGroupItem: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#f8f9fa', borderRadius: 10, marginBottom: 8 },
  assignGroupItemIcon: { fontSize: 20, marginRight: 12 },
  assignGroupItemName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  assignGroupItemDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  assignGroupItemArrow: { fontSize: 18, color: '#9b59b6', fontWeight: 'bold' },
  assignCancelBtn: { marginTop: 8, padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  assignCancelText: { color: '#888', fontSize: 15 }
});

export default CreatorOpportunityDetailScreen;
