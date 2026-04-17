import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, ActivityIndicator, Image, TextInput, Modal, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const ManageApplicationsScreen = ({ route }) => {
  const { opportunityId } = route.params;
  const toast = useToast();
  const confirm = useConfirm();
  const [applications, setApplications] = useState([]);
  const [groups, setGroups] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appFilter, setAppFilter] = useState('all');

  // Groups UI
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [groupCreateLoading, setGroupCreateLoading] = useState(false);

  // Rename group
  const [renamingGroup, setRenamingGroup] = useState(null);
  const [renameText, setRenameText] = useState('');

  // Assign-to-group modal
  const [assignModal, setAssignModal] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [inlineGroupName, setInlineGroupName] = useState('');
  const [inlineGroupLoading, setInlineGroupLoading] = useState(false);

  // Applicant detail modal
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [showContribFor, setShowContribFor] = useState({});

  const fetchData = async () => {
    try {
      const [appRes, grpRes, contribRes] = await Promise.all([
        api.get(`/api/applications/opportunity/${opportunityId}`),
        api.get(`/api/application-groups/opportunity/${opportunityId}`),
        api.get(`/api/contributions/opportunity/${opportunityId}`)
      ]);
      setApplications(appRes.data);
      setGroups(grpRes.data);
      setContributions(contribRes.data || []);
    } catch {
      toast.error('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdateAppStatus = async (applicationId, status) => {
    try {
      await api.put(`/api/applications/${applicationId}/status`, { status });
      if (selectedApplicant?._id === applicationId) {
        setSelectedApplicant(prev => ({ ...prev, status }));
      }
      fetchData();
    } catch { toast.error('Error', 'Failed to update status'); }
  };

  const handleRevokeVolunteer = (appId, volunteerName) => {
    confirm.show({
      title: 'Remove Volunteer',
      message: `Remove ${volunteerName} from this opportunity?`,
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.put(`/api/applications/${appId}/revoke`);
          setSelectedApplicant(null);
          fetchData();
        } catch { toast.error('Error', 'Failed to remove volunteer'); }
      }
    });
  };

  const handleVerifyContribution = async (contribId, status) => {
    try {
      await api.put(`/api/contributions/${contribId}/status`, { status });
      fetchData();
    } catch { toast.error('Error', 'Failed to update contribution'); }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { toast.warning('Missing', 'Enter a group name'); return; }
    setGroupCreateLoading(true);
    try {
      await api.post('/api/application-groups', { opportunityId, name: newGroupName, description: newGroupDesc });
      setShowCreateGroup(false);
      setNewGroupName(''); setNewGroupDesc('');
      fetchData();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed');
    } finally {
      setGroupCreateLoading(false);
    }
  };

  const handleDeleteGroup = (groupId, groupName) => {
    confirm.show({
      title: 'Delete Group',
      message: `Delete group "${groupName}"? Applications stay unaffected.`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/application-groups/${groupId}`);
          fetchData();
        } catch { toast.error('Error', 'Failed to delete group'); }
      }
    });
  };

  const handleRenameGroup = async (groupId) => {
    if (!renameText.trim()) return;
    try {
      await api.put(`/api/application-groups/${groupId}`, { name: renameText.trim() });
      setRenamingGroup(null);
      fetchData();
    } catch { toast.error('Error', 'Failed to rename group'); }
  };

  const handleAcceptAllInGroup = (groupId, groupName, pendingApps) => {
    if (pendingApps.length === 0) { toast.info('No pending', 'No pending applications in this group'); return; }
    confirm.show({
      title: 'Accept All',
      message: `Accept all ${pendingApps.length} pending application(s) in "${groupName}"?`,
      confirmText: 'Accept All',
      destructive: false,
      onConfirm: async () => {
        try {
          const res = await api.post(`/api/application-groups/${groupId}/accept-all`);
          toast.success('Done', res.data.message || 'All pending accepted');
          fetchData();
        } catch { toast.error('Error', 'Failed to accept all'); }
      }
    });
  };

  const handleRejectAllInGroup = (groupId, groupName, pendingApps) => {
    if (pendingApps.length === 0) { toast.info('No pending', 'No pending applications in this group'); return; }
    confirm.show({
      title: 'Reject All',
      message: `Reject all ${pendingApps.length} pending application(s) in "${groupName}"?`,
      confirmText: 'Reject All',
      destructive: true,
      onConfirm: async () => {
        try {
          try {
            const res = await api.post(`/api/application-groups/${groupId}/reject-all`);
            toast.success('Done', res.data.message || 'All pending rejected');
          } catch {
            await Promise.all(pendingApps.map(a => api.put(`/api/applications/${a._id}/status`, { status: 'rejected' })));
            toast.success('Done', `${pendingApps.length} applications rejected`);
          }
          fetchData();
        } catch { toast.error('Error', 'Failed to reject all'); }
      }
    });
  };

  const handleAssignToGroup = async (groupId) => {
    if (!assignModal) return;
    setAssignLoading(true);
    try {
      await api.post(`/api/application-groups/${groupId}/assign`, { applicationId: assignModal._id });
      setAssignModal(null);
      fetchData();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRemoveFromGroup = async (groupId, appId) => {
    try {
      await api.delete(`/api/application-groups/${groupId}/remove/${appId}`);
      fetchData();
    } catch { toast.error('Error', 'Failed to remove from group'); }
  };

  const handleInlineCreateGroup = async () => {
    if (!inlineGroupName.trim()) { toast.warning('Missing', 'Enter a group name'); return; }
    if (!assignModal) return;
    setInlineGroupLoading(true);
    try {
      const grpRes = await api.post('/api/application-groups', { opportunityId, name: inlineGroupName, description: '' });
      await api.post(`/api/application-groups/${grpRes.data._id}/assign`, { applicationId: assignModal._id });
      setInlineGroupName('');
      setAssignModal(null);
      fetchData();
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed');
    } finally {
      setInlineGroupLoading(false);
    }
  };

  const statusColor = (s) => ({ approved: '#27ae60', completed: '#2e86de', rejected: '#e74c3c' }[s] || '#f39c12');

  const groupedAppIds = new Set(groups.flatMap(g => g.applications.map(a => a._id || a)));
  const ungroupedApps = applications.filter(a => !groupedAppIds.has(a._id));
  const filteredApps = appFilter === 'all' ? applications : applications.filter(a => a.status === appFilter);

  // Compact row for each applicant
  const ApplicantRow = ({ app, groupId }) => (
    <TouchableOpacity style={styles.applicantRow} onPress={() => setSelectedApplicant({ ...app, groupId })}>
      <View style={[styles.applicantAvatar, { backgroundColor: statusColor(app.status) }]}>
        <Text style={styles.applicantAvatarText}>{app.volunteer?.name?.charAt(0).toUpperCase() || '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.applicantName}>{app.volunteer?.name}</Text>
        <Text style={styles.applicantEmail} numberOfLines={1}>{app.volunteer?.email}</Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: statusColor(app.status) }]}>
        <Text style={styles.statusPillText}>{app.status}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#bbb" style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );

  // Applicant detail modal content
  const renderApplicantDetail = () => {
    const app = selectedApplicant;
    if (!app) return null;
    const appContribs = contributions.filter(c =>
      c.volunteer?._id === app.volunteer?._id || c.volunteer === app.volunteer?._id
    );
    const pendingContribs = appContribs.filter(c => c.status === 'pending');
    const isOpen = showContribFor[app._id];

    return (
      <ScrollView style={styles.detailModalScroll} showsVerticalScrollIndicator={false}>
        {/* Applicant header */}
        <View style={styles.detailHeader}>
          <View style={[styles.detailAvatar, { backgroundColor: statusColor(app.status) }]}>
            <Text style={styles.detailAvatarText}>{app.volunteer?.name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.detailName}>{app.volunteer?.name}</Text>
            <Text style={styles.detailEmail}>{app.volunteer?.email}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusColor(app.status) }]}>
            <Text style={styles.statusPillText}>{app.status}</Text>
          </View>
        </View>

        {app.photo ? <Image source={{ uri: `${BASE_URL}/${app.photo}` }} style={styles.detailPhoto} resizeMode="cover" /> : null}

        {app.phone ? (
          <View style={styles.detailField}>
            <Ionicons name="call-outline" size={14} color="#888" />
            <Text style={styles.detailFieldText}>{app.phone}</Text>
          </View>
        ) : null}
        {app.email ? (
          <View style={styles.detailField}>
            <Ionicons name="mail-outline" size={14} color="#888" />
            <Text style={styles.detailFieldText}>{app.email}</Text>
          </View>
        ) : null}
        {app.coverLetter ? (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionLabel}>Cover Letter</Text>
            <Text style={styles.detailSectionText}>{app.coverLetter}</Text>
          </View>
        ) : null}
        {app.motivation ? (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionLabel}>Motivation</Text>
            <Text style={styles.detailSectionText}>{app.motivation}</Text>
          </View>
        ) : null}
        {app.hopingToGain ? (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionLabel}>Hoping to Gain</Text>
            <Text style={styles.detailSectionText}>{app.hopingToGain}</Text>
          </View>
        ) : null}
        {app.expectedHours ? (
          <View style={styles.detailField}>
            <Ionicons name="time-outline" size={14} color="#888" />
            <Text style={styles.detailFieldText}>Expected {app.expectedHours} hour{app.expectedHours !== 1 ? 's' : ''}</Text>
          </View>
        ) : null}
        <Text style={styles.detailAppliedAt}>Applied: {new Date(app.appliedAt).toDateString()}</Text>

        {/* Action buttons */}
        <View style={styles.detailActions}>
          {app.status === 'pending' && (
            <>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleUpdateAppStatus(app._id, 'approved')}>
                <Ionicons name="checkmark" size={15} color="#fff" />
                <Text style={styles.actionBtnText}> Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleUpdateAppStatus(app._id, 'rejected')}>
                <Ionicons name="close" size={15} color="#fff" />
                <Text style={styles.actionBtnText}> Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {app.status === 'approved' && (
            <TouchableOpacity style={styles.completeBtn} onPress={() => handleUpdateAppStatus(app._id, 'completed')}>
              <Ionicons name="trophy-outline" size={15} color="#fff" />
              <Text style={styles.actionBtnText}> Mark Complete</Text>
            </TouchableOpacity>
          )}
          {(app.status === 'approved' || app.status === 'completed') && (
            <TouchableOpacity style={styles.revokeBtn} onPress={() => handleRevokeVolunteer(app._id, app.volunteer?.name)}>
              <Ionicons name="person-remove-outline" size={15} color="#fff" />
              <Text style={styles.actionBtnText}> Remove</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Group actions */}
        <View style={styles.detailGroupActions}>
          {app.status === 'pending' && (
            <TouchableOpacity style={styles.assignGroupBtn} onPress={() => { setAssignModal(app); }}>
              <Ionicons name="folder-outline" size={14} color="#9b59b6" />
              <Text style={styles.assignGroupBtnText}> Move to Group</Text>
            </TouchableOpacity>
          )}
          {app.groupId && (
            <TouchableOpacity style={styles.removeFromGroupBtn} onPress={() => handleRemoveFromGroup(app.groupId, app._id)}>
              <Ionicons name="remove-circle-outline" size={14} color="#e74c3c" />
              <Text style={styles.removeFromGroupText}> Remove from group</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contributions */}
        {app.status === 'approved' && (
          <TouchableOpacity
            style={[styles.contribToggleBtn, pendingContribs.length > 0 && styles.contribToggleBtnAlert]}
            onPress={() => setShowContribFor(prev => ({ ...prev, [app._id]: !prev[app._id] }))}
          >
            <Ionicons name="time-outline" size={14} color={pendingContribs.length > 0 ? '#fff' : '#555'} />
            <Text style={[styles.contribToggleBtnText, pendingContribs.length > 0 && { color: '#fff' }]}>
              {' '}Contributions ({appContribs.length}){pendingContribs.length > 0 ? ` · ${pendingContribs.length} pending` : ''}
            </Text>
            <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={pendingContribs.length > 0 ? '#fff' : '#555'} />
          </TouchableOpacity>
        )}
        {isOpen && (
          appContribs.length === 0 ? (
            <Text style={styles.noContribText}>No contributions yet</Text>
          ) : (
            <View style={styles.contribList}>
              {appContribs.map(c => (
                <View key={c._id} style={[styles.contribCard, { borderLeftColor: c.status === 'verified' ? '#27ae60' : c.status === 'rejected' ? '#e74c3c' : '#f39c12' }]}>
                  <View style={styles.contribRow}>
                    <Text style={styles.contribHours}>{c.hours} hr{c.hours !== 1 ? 's' : ''}</Text>
                    <View style={[styles.contribBadge, { backgroundColor: c.status === 'verified' ? '#27ae60' : c.status === 'rejected' ? '#e74c3c' : '#f39c12' }]}>
                      <Text style={styles.contribBadgeText}>{c.status}</Text>
                    </View>
                  </View>
                  {c.description ? <Text style={styles.contribDesc}>{c.description}</Text> : null}
                  <Text style={styles.contribDate}>{new Date(c.createdAt).toDateString()}</Text>
                  {c.status === 'pending' && (
                    <View style={styles.contribActions}>
                      <TouchableOpacity style={styles.verifyBtn} onPress={() => handleVerifyContribution(c._id, 'verified')}>
                        <Text style={styles.verifyBtnText}>Verify</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectContribBtn} onPress={() => handleVerifyContribution(c._id, 'rejected')}>
                        <Text style={styles.rejectContribBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { n: applications.length, l: 'Total', color: '#2e86de' },
          { n: applications.filter(a => a.status === 'pending').length, l: 'Pending', color: '#f39c12' },
          { n: applications.filter(a => a.status === 'approved').length, l: 'Accepted', color: '#27ae60' },
          { n: applications.filter(a => a.status === 'rejected').length, l: 'Rejected', color: '#e74c3c' },
        ].map(s => (
          <View key={s.l} style={styles.statBox}>
            <Text style={[styles.statNumber, { color: s.color }]}>{s.n}</Text>
            <Text style={styles.statLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        {['all', 'pending', 'approved', 'rejected', 'completed'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterTab, appFilter === f && styles.filterTabActive]} onPress={() => setAppFilter(f)}>
            <Text style={[styles.filterTabText, appFilter === f && styles.filterTabTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Groups section */}
        {(appFilter === 'all' || appFilter === 'pending') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Groups ({groups.length})</Text>
              <TouchableOpacity style={styles.newGroupBtn} onPress={() => setShowCreateGroup(!showCreateGroup)}>
                <Ionicons name={showCreateGroup ? 'close' : 'add'} size={16} color="#fff" />
                <Text style={styles.newGroupBtnText}>{showCreateGroup ? 'Cancel' : 'New Group'}</Text>
              </TouchableOpacity>
            </View>

            {showCreateGroup && (
              <View style={styles.createGroupForm}>
                <Text style={styles.formLabel}>Group Name *</Text>
                <TextInput style={styles.input} placeholderTextColor="#999" placeholder="e.g. Shortlisted, Not Qualified" value={newGroupName} onChangeText={setNewGroupName} />
                <Text style={styles.formLabel}>Description <Text style={styles.optional}>(optional)</Text></Text>
                <TextInput style={styles.input} placeholderTextColor="#999" placeholder="Brief description" value={newGroupDesc} onChangeText={setNewGroupDesc} />
                <TouchableOpacity style={styles.saveBtn} onPress={handleCreateGroup} disabled={groupCreateLoading}>
                  {groupCreateLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Group</Text>}
                </TouchableOpacity>
              </View>
            )}

            {groups.length === 0 ? (
              <View style={styles.emptyHint}>
                <Ionicons name="folder-open-outline" size={20} color="#ccc" />
                <Text style={styles.emptyHintText}>Create groups to organise pending applications (e.g. "Shortlisted", "On Hold")</Text>
              </View>
            ) : (
              groups.map(group => {
                const groupApps = group.applications || [];
                const pendingInGroup = groupApps.filter(a => a.status === 'pending');
                const isExpanded = expandedGroups[group._id];
                const isRenaming = renamingGroup === group._id;

                return (
                  <View key={group._id} style={styles.groupCard}>
                    <TouchableOpacity
                      style={styles.groupHeader}
                      onPress={() => setExpandedGroups(prev => ({ ...prev, [group._id]: !prev[group._id] }))}
                    >
                      <Ionicons name="folder-outline" size={16} color="#9b59b6" style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        {isRenaming ? (
                          <View style={styles.renameRow}>
                            <TextInput
                              style={styles.renameInput}
                              value={renameText}
                              onChangeText={setRenameText}
                              autoFocus
                              onSubmitEditing={() => handleRenameGroup(group._id)}
                            />
                            <TouchableOpacity style={styles.renameConfirmBtn} onPress={() => handleRenameGroup(group._id)}>
                              <Ionicons name="checkmark" size={16} color="#27ae60" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setRenamingGroup(null)}>
                              <Ionicons name="close" size={16} color="#e74c3c" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Text style={styles.groupName}>{group.name}</Text>
                        )}
                        {group.description ? <Text style={styles.groupDesc}>{group.description}</Text> : null}
                        <Text style={styles.groupCount}>{groupApps.length} application{groupApps.length !== 1 ? 's' : ''}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.renameIconBtn}
                        onPress={() => { setRenamingGroup(group._id); setRenameText(group.name); }}
                      >
                        <Ionicons name="pencil-outline" size={14} color="#aaa" />
                      </TouchableOpacity>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#9b59b6" />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.groupBody}>
                        <View style={styles.groupBulkActions}>
                          <TouchableOpacity
                            style={[styles.acceptAllBtn, pendingInGroup.length === 0 && styles.btnDisabled]}
                            onPress={() => handleAcceptAllInGroup(group._id, group.name, pendingInGroup)}
                          >
                            <Ionicons name="checkmark-done" size={14} color="#fff" />
                            <Text style={styles.bulkBtnText}> Accept All ({pendingInGroup.length})</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.rejectAllBtn, pendingInGroup.length === 0 && styles.btnDisabled]}
                            onPress={() => handleRejectAllInGroup(group._id, group.name, pendingInGroup)}
                          >
                            <Ionicons name="close-circle-outline" size={14} color="#fff" />
                            <Text style={styles.bulkBtnText}> Reject All ({pendingInGroup.length})</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteGroupBtn} onPress={() => handleDeleteGroup(group._id, group.name)}>
                            <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                          </TouchableOpacity>
                        </View>

                        {groupApps.length === 0 ? (
                          <Text style={styles.emptyGroupText}>No applications in this group yet.</Text>
                        ) : (
                          groupApps.map(app => <ApplicantRow key={app._id} app={app} groupId={group._id} />)
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Ungrouped pending */}
            {ungroupedApps.filter(a => a.status === 'pending').length > 0 && (
              <View style={styles.ungroupedSection}>
                <Text style={styles.ungroupedLabel}>Ungrouped Pending ({ungroupedApps.filter(a => a.status === 'pending').length})</Text>
                {ungroupedApps.filter(a => a.status === 'pending').map(app => <ApplicantRow key={app._id} app={app} />)}
              </View>
            )}

            {appFilter === 'all' && ungroupedApps.filter(a => a.status !== 'pending').length > 0 && (
              <View style={styles.ungroupedSection}>
                <Text style={styles.ungroupedLabel}>Other Applications</Text>
                {ungroupedApps.filter(a => a.status !== 'pending').map(app => <ApplicantRow key={app._id} app={app} />)}
              </View>
            )}
          </View>
        )}

        {/* Non-pending filter: flat list */}
        {appFilter !== 'all' && appFilter !== 'pending' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Applications ({filteredApps.length})</Text>
            {filteredApps.length === 0 ? (
              <View style={styles.centered}><Text style={styles.emptyText}>No applications</Text></View>
            ) : filteredApps.map(app => <ApplicantRow key={app._id} app={app} />)}
          </View>
        )}
      </ScrollView>

      {/* Applicant Detail Modal */}
      <Modal visible={!!selectedApplicant} animationType="slide" onRequestClose={() => setSelectedApplicant(null)}>
        <View style={styles.detailModal}>
          <View style={styles.detailModalHeader}>
            <TouchableOpacity onPress={() => setSelectedApplicant(null)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#333" />
            </TouchableOpacity>
            <Text style={styles.detailModalTitle}>Applicant Details</Text>
          </View>
          {renderApplicantDetail()}
        </View>
      </Modal>

      {/* Assign to Group Modal */}
      <Modal visible={!!assignModal} transparent animationType="slide" onRequestClose={() => setAssignModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setAssignModal(null)}>
          <View style={styles.assignSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Move to Group</Text>
            <Text style={styles.sheetSubtitle}>{assignModal?.volunteer?.name}</Text>
            {groups.length === 0 ? (
              <View>
                <Text style={styles.noGroupsText}>No groups yet. Create one:</Text>
                <TextInput style={[styles.input, { marginTop: 10 }]} placeholderTextColor="#999" placeholder="Group name" value={inlineGroupName} onChangeText={setInlineGroupName} />
                <TouchableOpacity style={styles.saveBtn} onPress={handleInlineCreateGroup} disabled={inlineGroupLoading}>
                  {inlineGroupLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create & Assign</Text>}
                </TouchableOpacity>
              </View>
            ) : groups.map(g => (
              <TouchableOpacity key={g._id} style={styles.groupItem} onPress={() => handleAssignToGroup(g._id)} disabled={assignLoading}>
                <Ionicons name="folder-outline" size={18} color="#9b59b6" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupItemName}>{g.name}</Text>
                  {g.description ? <Text style={styles.groupItemDesc}>{g.description}</Text> : null}
                </View>
                {assignLoading ? <ActivityIndicator size="small" color="#2e86de" /> : <Ionicons name="chevron-forward" size={16} color="#aaa" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAssignModal(null)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  statsRow: { flexDirection: 'row', padding: 12, paddingBottom: 4, gap: 8 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', elevation: 2 },
  statNumber: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexWrap: 'wrap' },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#2e86de' },
  filterTabActive: { backgroundColor: '#2e86de' },
  filterTabText: { color: '#2e86de', fontSize: 11, fontWeight: 'bold' },
  filterTabTextActive: { color: '#fff' },
  section: { padding: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  newGroupBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#9b59b6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  newGroupBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 2 },
  createGroupForm: { backgroundColor: '#f8f4ff', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#9b59b6' },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 5 },
  optional: { fontWeight: 'normal', color: '#aaa', fontSize: 11 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  saveBtn: { backgroundColor: '#27ae60', borderRadius: 8, padding: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  emptyHint: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12, gap: 8 },
  emptyHintText: { color: '#aaa', fontSize: 13, textAlign: 'center' },
  groupCard: { backgroundColor: '#fff', borderRadius: 10, marginBottom: 10, elevation: 2, overflow: 'hidden', borderLeftWidth: 4, borderLeftColor: '#9b59b6' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#faf7ff' },
  groupName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  groupDesc: { fontSize: 12, color: '#888', marginTop: 1 },
  groupCount: { fontSize: 11, color: '#9b59b6', marginTop: 2, fontWeight: '600' },
  renameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  renameInput: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#9b59b6', fontSize: 14, color: '#333', padding: 2 },
  renameConfirmBtn: { padding: 2 },
  renameIconBtn: { padding: 6, marginRight: 4 },
  groupBody: { padding: 12, paddingTop: 8 },
  groupBulkActions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  acceptAllBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#27ae60', borderRadius: 8, padding: 9 },
  rejectAllBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e74c3c', borderRadius: 8, padding: 9 },
  btnDisabled: { backgroundColor: '#bbb' },
  bulkBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  deleteGroupBtn: { backgroundColor: '#ffe0e0', borderRadius: 8, padding: 9, alignItems: 'center', paddingHorizontal: 12 },
  emptyGroupText: { color: '#aaa', fontSize: 13, textAlign: 'center', padding: 10 },
  ungroupedSection: { marginTop: 8 },
  ungroupedLabel: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  // Applicant row
  applicantRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, elevation: 1 },
  applicantAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  applicantAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  applicantName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  applicantEmail: { fontSize: 12, color: '#888', marginTop: 1 },
  statusPill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  emptyText: { color: '#aaa', fontSize: 14 },
  // Detail modal
  detailModal: { flex: 1, backgroundColor: '#f0f4f8' },
  detailModalHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, elevation: 2, gap: 12 },
  backBtn: { padding: 4 },
  detailModalTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  detailModalScroll: { flex: 1, padding: 15 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, elevation: 2 },
  detailAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  detailAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  detailName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  detailEmail: { fontSize: 13, color: '#888', marginTop: 2 },
  detailPhoto: { width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 14, borderWidth: 2, borderColor: '#ddd' },
  detailField: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  detailFieldText: { fontSize: 14, color: '#555' },
  detailSection: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 10 },
  detailSectionLabel: { fontSize: 11, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  detailSectionText: { fontSize: 14, color: '#444', lineHeight: 20 },
  detailAppliedAt: { fontSize: 12, color: '#aaa', marginBottom: 14 },
  detailActions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  acceptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#27ae60', borderRadius: 8, padding: 11 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e74c3c', borderRadius: 8, padding: 11 },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2e86de', borderRadius: 8, padding: 11 },
  revokeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e74c3c', borderRadius: 8, padding: 11 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  detailGroupActions: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  assignGroupBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#9b59b6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  assignGroupBtnText: { color: '#9b59b6', fontSize: 13, fontWeight: 'bold' },
  removeFromGroupBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffe8e8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  removeFromGroupText: { color: '#e74c3c', fontSize: 13, fontWeight: 'bold' },
  contribToggleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4f8', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#ddd', marginBottom: 8 },
  contribToggleBtnAlert: { backgroundColor: '#f39c12', borderColor: '#f39c12' },
  contribToggleBtnText: { color: '#555', fontWeight: 'bold', fontSize: 13, flex: 1 },
  noContribText: { color: '#bbb', fontSize: 13, marginBottom: 10, fontStyle: 'italic' },
  contribList: { marginBottom: 10 },
  contribCard: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3 },
  contribRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  contribHours: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  contribBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  contribBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  contribDesc: { fontSize: 13, color: '#555', marginBottom: 4 },
  contribDate: { fontSize: 11, color: '#aaa', marginBottom: 6 },
  contribActions: { flexDirection: 'row', gap: 8 },
  verifyBtn: { flex: 1, backgroundColor: '#27ae60', borderRadius: 6, padding: 8, alignItems: 'center' },
  verifyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  rejectContribBtn: { flex: 1, backgroundColor: '#e74c3c', borderRadius: 6, padding: 8, alignItems: 'center' },
  rejectContribBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  // Assign sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  assignSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  sheetSubtitle: { fontSize: 14, color: '#888', marginBottom: 16 },
  noGroupsText: { color: '#888', fontSize: 13, textAlign: 'center' },
  groupItem: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#f8f9fa', borderRadius: 10, marginBottom: 8 },
  groupItemName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  groupItemDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  cancelBtn: { marginTop: 8, padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  cancelBtnText: { color: '#888', fontSize: 15 }
});

export default ManageApplicationsScreen;
