import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Image,
  Modal, TextInput, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const STATUS_COLOR = {
  pending: '#f39c12',
  approved: '#27ae60',
  completed: '#2e86de',
  rejected: '#e74c3c'
};

const STATUS_LABEL = {
  pending: 'Pending',
  approved: 'Accepted',
  completed: 'Completed',
  rejected: 'Rejected'
};

const FILTERS = ['all', 'pending', 'approved', 'completed', 'rejected'];

const ManageApplicationsScreen = ({ route, navigation }) => {
  const { opportunityId } = route.params;
  const toast = useToast();
  const confirm = useConfirm();

  const [applications, setApplications] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});

  const [detailApp, setDetailApp] = useState(null);

  const [createGroupModal, setCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [createGroupLoading, setCreateGroupLoading] = useState(false);

  const [moveAppModal, setMoveAppModal] = useState(null);
  const [bulkLoading, setBulkLoading] = useState({});

  const fetchData = async () => {
    try {
      const [appRes, groupRes] = await Promise.all([
        api.get(`/api/applications/opportunity/${opportunityId}`),
        api.get(`/api/application-groups/opportunity/${opportunityId}`)
      ]);
      setApplications(appRes.data);
      setGroups(groupRes.data);
    } catch {
      toast.error('Error', 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const updateStatus = async (appId, status) => {
    setActionLoading(prev => ({ ...prev, [appId + status]: true }));
    try {
      await api.put(`/api/applications/${appId}/status`, { status });
      setApplications(prev => prev.map(a => a._id === appId ? { ...a, status } : a));
      setGroups(prev => prev.map(g => ({
        ...g,
        applications: g.applications.map(a => a._id === appId ? { ...a, status } : a)
      })));
      if (detailApp?._id === appId) setDetailApp(prev => ({ ...prev, status }));
      toast.success('Updated', `Applicant marked as ${STATUS_LABEL[status]}`);
    } catch {
      toast.error('Error', 'Failed to update status');
    } finally {
      setActionLoading(prev => ({ ...prev, [appId + status]: false }));
    }
  };

  const handleRemove = (app) => {
    confirm.show({
      title: 'Remove Volunteer',
      message: `Remove ${app.volunteer?.name} from this opportunity?`,
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.put(`/api/applications/${app._id}/revoke`);
          setApplications(prev => prev.map(a => a._id === app._id ? { ...a, status: 'rejected' } : a));
          setGroups(prev => prev.map(g => ({
            ...g,
            applications: g.applications.map(a => a._id === app._id ? { ...a, status: 'rejected' } : a)
          })));
          if (detailApp?._id === app._id) setDetailApp(null);
          toast.success('Removed', 'Volunteer removed');
        } catch {
          toast.error('Error', 'Failed to remove volunteer');
        }
      }
    });
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { toast.warning('Required', 'Please enter a group name'); return; }
    setCreateGroupLoading(true);
    try {
      const res = await api.post('/api/application-groups', {
        opportunityId, name: newGroupName.trim(), description: newGroupDesc.trim()
      });
      setGroups(prev => [...prev, { ...res.data, applications: [] }]);
      setCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      toast.success('Created', `Group "${res.data.name}" created`);
    } catch {
      toast.error('Error', 'Failed to create group');
    } finally {
      setCreateGroupLoading(false);
    }
  };

  const handleDeleteGroup = (group) => {
    confirm.show({
      title: 'Delete Group',
      message: `Delete "${group.name}"? Applications will return to ungrouped.`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/application-groups/${group._id}`);
          setGroups(prev => prev.filter(g => g._id !== group._id));
          toast.success('Deleted', 'Group deleted');
        } catch {
          toast.error('Error', 'Failed to delete group');
        }
      }
    });
  };

  const handleMoveToGroup = async (groupId, appId) => {
    try {
      const res = await api.post(`/api/application-groups/${groupId}/assign`, { applicationId: appId });
      setGroups(prev => prev.map(g => {
        if (g._id === groupId) return res.data;
        return { ...g, applications: g.applications.filter(a => a._id !== appId) };
      }));
      setMoveAppModal(null);
      toast.success('Moved', 'Application added to group');
    } catch {
      toast.error('Error', 'Failed to move application');
    }
  };

  const handleRemoveFromGroup = async (groupId, appId) => {
    try {
      await api.delete(`/api/application-groups/${groupId}/remove/${appId}`);
      setGroups(prev => prev.map(g => g._id === groupId
        ? { ...g, applications: g.applications.filter(a => a._id !== appId) }
        : g
      ));
      toast.success('Removed', 'Removed from group');
    } catch {
      toast.error('Error', 'Failed to remove from group');
    }
  };

  const handleBulkStatus = (group, newStatus) => {
    const pendingCount = group.applications.filter(a => a.status === 'pending').length;
    if (!pendingCount) {
      toast.info('Nothing to do', 'No pending applications in this group');
      return;
    }
    const isAccept = newStatus === 'approved';
    confirm.show({
      title: isAccept ? 'Accept All' : 'Reject All',
      message: `${isAccept ? 'Accept' : 'Reject'} all ${pendingCount} pending application(s) in "${group.name}"?`,
      confirmText: isAccept ? 'Accept All' : 'Reject All',
      destructive: !isAccept,
      onConfirm: async () => {
        const key = group._id + newStatus;
        setBulkLoading(prev => ({ ...prev, [key]: true }));
        try {
          const endpoint = isAccept ? 'accept-all' : 'reject-all';
          await api.post(`/api/application-groups/${group._id}/${endpoint}`);
          const groupAppIds = new Set(group.applications.map(a => a._id));
          setGroups(prev => prev.map(g => g._id === group._id
            ? { ...g, applications: g.applications.map(a => a.status === 'pending' ? { ...a, status: newStatus } : a) }
            : g
          ));
          setApplications(prev => prev.map(a =>
            groupAppIds.has(a._id) && a.status === 'pending' ? { ...a, status: newStatus } : a
          ));
          toast.success('Done', `${pendingCount} application(s) ${isAccept ? 'accepted' : 'rejected'}`);
        } catch {
          toast.error('Error', `Failed to ${isAccept ? 'accept' : 'reject'} all`);
        } finally {
          setBulkLoading(prev => ({ ...prev, [key]: false }));
        }
      }
    });
  };

  const isLoading = (appId, action) => !!actionLoading[appId + action];

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'all' ? applications.length : applications.filter(a => a.status === f).length;
    return acc;
  }, {});

  const groupedAppIds = new Set(groups.flatMap(g => g.applications.map(a => a._id)));
  const allFiltered = filter === 'all' ? applications : applications.filter(a => a.status === filter);
  const ungroupedApps = allFiltered.filter(a => !groupedAppIds.has(a._id));
  const visibleGroups = groups.map(g => ({
    ...g,
    applications: filter === 'all' ? g.applications : g.applications.filter(a => a.status === filter)
  }));

  const renderInlineActions = (app, inGroup = false, groupId = null) => {
    const busy = Object.keys(actionLoading).some(k => k.startsWith(app._id) && actionLoading[k]);
    return (
      <View style={styles.inlineActions}>
        {app.status === 'pending' && (
          <>
            <TouchableOpacity style={[styles.iconBtn, styles.iconBtnAccept]} onPress={() => updateStatus(app._id, 'approved')} disabled={busy}>
              {isLoading(app._id, 'approved') ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={14} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.iconBtnReject]} onPress={() => updateStatus(app._id, 'rejected')} disabled={busy}>
              {isLoading(app._id, 'rejected') ? <ActivityIndicator size="small" color="#e74c3c" /> : <Ionicons name="close" size={14} color="#e74c3c" />}
            </TouchableOpacity>
          </>
        )}
        {app.status === 'approved' && (
          <>
            <TouchableOpacity style={[styles.iconBtn, styles.iconBtnCompletion]} onPress={() => updateStatus(app._id, 'completed')} disabled={busy}>
              {isLoading(app._id, 'completed') ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="trophy-outline" size={14} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.iconBtnContrib]} onPress={() => navigation.navigate('AllContributions')}>
              <Ionicons name="time-outline" size={14} color="#9b59b6" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, styles.iconBtnRemovePerson]} onPress={() => handleRemove(app)} disabled={busy}>
              <Ionicons name="person-remove-outline" size={14} color="#e74c3c" />
            </TouchableOpacity>
          </>
        )}
        {inGroup ? (
          <TouchableOpacity style={[styles.iconBtn, styles.iconBtnUngroup]} onPress={() => handleRemoveFromGroup(groupId, app._id)}>
            <Ionicons name="folder-open-outline" size={13} color="#888" />
          </TouchableOpacity>
        ) : groups.length > 0 ? (
          <TouchableOpacity style={[styles.iconBtn, styles.iconBtnMoveGroup]} onPress={() => setMoveAppModal(app)}>
            <Ionicons name="folder-outline" size={13} color="#2e86de" />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderAppRow = (item, inGroup = false, groupId = null) => (
    <View key={item._id} style={[styles.row, { borderLeftColor: STATUS_COLOR[item.status] }]}>
      <TouchableOpacity style={styles.rowLeft} onPress={() => setDetailApp(item)} activeOpacity={0.7}>
        <View style={[styles.avatar, { backgroundColor: STATUS_COLOR[item.status] }]}>
          <Text style={styles.avatarText}>{item.volunteer?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>{item.volunteer?.name}</Text>
          <Text style={styles.rowEmail} numberOfLines={1}>{item.volunteer?.email}</Text>
          <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
            <Text style={[styles.statusPillText, { color: STATUS_COLOR[item.status] }]}>{STATUS_LABEL[item.status]}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.rowRight}>
        {renderInlineActions(item, inGroup, groupId)}
      </View>
    </View>
  );

  const renderGroup = (group) => (
    <View key={group._id} style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <View style={styles.groupHeaderLeft}>
          <Ionicons name="folder" size={17} color="#2e86de" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.groupName}>{group.name}</Text>
            {group.description ? <Text style={styles.groupDesc} numberOfLines={1}>{group.description}</Text> : null}
          </View>
          <View style={styles.groupBadge}>
            <Text style={styles.groupBadgeText}>{group.applications.length}</Text>
          </View>
        </View>
        <View style={styles.groupActions}>
          <TouchableOpacity
            style={[styles.groupActionBtn, { backgroundColor: '#e8f8f0' }]}
            onPress={() => handleBulkStatus(group, 'approved')}
            disabled={!!bulkLoading[group._id + 'approved']}
          >
            {bulkLoading[group._id + 'approved']
              ? <ActivityIndicator size="small" color="#27ae60" />
              : <><Ionicons name="checkmark-done" size={12} color="#27ae60" /><Text style={[styles.groupActionText, { color: '#27ae60' }]}> Accept</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.groupActionBtn, { backgroundColor: '#fde8e8' }]}
            onPress={() => handleBulkStatus(group, 'rejected')}
            disabled={!!bulkLoading[group._id + 'rejected']}
          >
            {bulkLoading[group._id + 'rejected']
              ? <ActivityIndicator size="small" color="#e74c3c" />
              : <><Ionicons name="close-circle" size={12} color="#e74c3c" /><Text style={[styles.groupActionText, { color: '#e74c3c' }]}> Reject</Text></>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.groupDeleteBtn} onPress={() => handleDeleteGroup(group)}>
            <Ionicons name="trash-outline" size={14} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>
      {group.applications.length === 0 ? (
        <Text style={styles.groupEmpty}>No applications in this group</Text>
      ) : (
        <View style={{ paddingTop: 6 }}>
          {group.applications.map(app => renderAppRow(app, true, group._id))}
        </View>
      )}
    </View>
  );

  const renderDetail = () => {
    if (!detailApp) return null;
    const app = detailApp;
    const busy = Object.keys(actionLoading).some(k => k.startsWith(app._id) && actionLoading[k]);
    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailTopBar}>
          <TouchableOpacity onPress={() => setDetailApp(null)} style={styles.detailClose}>
            <Ionicons name="close" size={22} color="#555" />
          </TouchableOpacity>
          <Text style={styles.detailTopTitle}>Applicant Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView style={styles.detailScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.detailProfile}>
            <View style={[styles.detailAvatar, { backgroundColor: STATUS_COLOR[app.status] }]}>
              <Text style={styles.detailAvatarText}>{app.volunteer?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
            <Text style={styles.detailName}>{app.volunteer?.name}</Text>
            <View style={[styles.detailStatusPill, { backgroundColor: STATUS_COLOR[app.status] }]}>
              <Text style={styles.detailStatusText}>{STATUS_LABEL[app.status]}</Text>
            </View>
          </View>
          {app.photo ? (
            <Image source={{ uri: `${BASE_URL}/${app.photo}` }} style={styles.detailPhoto} resizeMode="cover" />
          ) : null}
          <View style={styles.detailCard}>
            <Text style={styles.detailCardTitle}>Contact</Text>
            <View style={styles.detailField}>
              <Ionicons name="mail-outline" size={15} color="#888" style={{ width: 22 }} />
              <Text style={styles.detailFieldText}>{app.volunteer?.email || '—'}</Text>
            </View>
            {(app.phone || app.volunteer?.phone) ? (
              <View style={styles.detailField}>
                <Ionicons name="call-outline" size={15} color="#888" style={{ width: 22 }} />
                <Text style={styles.detailFieldText}>{app.phone || app.volunteer?.phone}</Text>
              </View>
            ) : null}
            {app.expectedHours ? (
              <View style={styles.detailField}>
                <Ionicons name="time-outline" size={15} color="#888" style={{ width: 22 }} />
                <Text style={styles.detailFieldText}>Expected {app.expectedHours} hr{app.expectedHours !== 1 ? 's' : ''}</Text>
              </View>
            ) : null}
            <View style={styles.detailField}>
              <Ionicons name="calendar-outline" size={15} color="#888" style={{ width: 22 }} />
              <Text style={styles.detailFieldText}>Applied {new Date(app.appliedAt).toDateString()}</Text>
            </View>
          </View>
          {(app.coverLetter || app.motivation || app.hopingToGain) && (
            <View style={styles.detailCard}>
              <Text style={styles.detailCardTitle}>Application</Text>
              {app.coverLetter ? (<><Text style={styles.detailSubLabel}>Cover Letter</Text><Text style={styles.detailCardText}>{app.coverLetter}</Text></>) : null}
              {app.motivation ? (<><Text style={styles.detailSubLabel}>Motivation</Text><Text style={styles.detailCardText}>{app.motivation}</Text></>) : null}
              {app.hopingToGain ? (<><Text style={styles.detailSubLabel}>Hoping to Gain</Text><Text style={styles.detailCardText}>{app.hopingToGain}</Text></>) : null}
            </View>
          )}
          <View style={styles.detailActions}>
            {app.status === 'pending' && (
              <>
                <TouchableOpacity style={[styles.detailBtn, { backgroundColor: '#27ae60' }]} onPress={() => updateStatus(app._id, 'approved')} disabled={busy}>
                  {isLoading(app._id, 'approved') ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={16} color="#fff" /><Text style={styles.detailBtnText}> Accept</Text></>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.detailBtn, { borderWidth: 1.5, borderColor: '#e74c3c', backgroundColor: '#fff' }]} onPress={() => updateStatus(app._id, 'rejected')} disabled={busy}>
                  {isLoading(app._id, 'rejected') ? <ActivityIndicator color="#e74c3c" /> : <><Ionicons name="close-circle-outline" size={16} color="#e74c3c" /><Text style={[styles.detailBtnText, { color: '#e74c3c' }]}> Reject</Text></>}
                </TouchableOpacity>
              </>
            )}
            {app.status === 'approved' && (
              <>
                <TouchableOpacity style={[styles.detailBtn, { backgroundColor: '#2e86de' }]} onPress={() => updateStatus(app._id, 'completed')} disabled={busy}>
                  {isLoading(app._id, 'completed') ? <ActivityIndicator color="#fff" /> : <><Ionicons name="trophy-outline" size={16} color="#fff" /><Text style={styles.detailBtnText}> Mark Completion</Text></>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.detailBtn, { backgroundColor: '#9b59b6' }]} onPress={() => { setDetailApp(null); navigation.navigate('AllContributions'); }}>
                  <Ionicons name="time-outline" size={16} color="#fff" />
                  <Text style={styles.detailBtnText}> Contributions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.detailBtn, { borderWidth: 1.5, borderColor: '#e74c3c', backgroundColor: '#fff' }]} onPress={() => handleRemove(app)} disabled={busy}>
                  <Ionicons name="person-remove-outline" size={16} color="#e74c3c" />
                  <Text style={[styles.detailBtnText, { color: '#e74c3c' }]}> Remove</Text>
                </TouchableOpacity>
              </>
            )}
            {app.status === 'completed' && (
              <TouchableOpacity style={[styles.detailBtn, { backgroundColor: '#9b59b6' }]} onPress={() => { setDetailApp(null); navigation.navigate('AllContributions'); }}>
                <Ionicons name="time-outline" size={16} color="#fff" />
                <Text style={styles.detailBtnText}> View Contributions</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', count: counts.all, color: '#2e86de' },
          { label: 'Pending', count: counts.pending, color: '#f39c12' },
          { label: 'Accepted', count: counts.approved, color: '#27ae60' },
          { label: 'Done', count: counts.completed, color: '#2e86de' },
        ].map(s => (
          <View key={s.label} style={styles.statBox}>
            <Text style={[styles.statNum, { color: s.color }]}>{s.count}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && { backgroundColor: STATUS_COLOR[f] || '#2e86de', borderColor: STATUS_COLOR[f] || '#2e86de' }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && { color: '#fff' }]}>
              {f === 'all' ? 'All' : STATUS_LABEL[f]}{counts[f] > 0 ? ` (${counts[f]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Groups section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Groups ({groups.length})</Text>
          <TouchableOpacity style={styles.newGroupBtn} onPress={() => setCreateGroupModal(true)}>
            <Ionicons name="add" size={13} color="#fff" />
            <Text style={styles.newGroupBtnText}> New Group</Text>
          </TouchableOpacity>
        </View>

        {groups.length === 0 ? (
          <Text style={styles.noGroupsText}>No groups yet. Create one to organise applications.</Text>
        ) : (
          visibleGroups.map(g => renderGroup(g))
        )}

        {/* Ungrouped section */}
        <View style={[styles.sectionRow, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Ungrouped ({ungroupedApps.length})</Text>
        </View>

        {ungroupedApps.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color="#ddd" />
            <Text style={styles.emptyText}>
              No {filter !== 'all' ? (STATUS_LABEL[filter]?.toLowerCase() + ' ') : ''}ungrouped applicants
            </Text>
          </View>
        ) : (
          ungroupedApps.map(app => renderAppRow(app, false, null))
        )}
      </ScrollView>

      {/* Applicant Detail Modal */}
      <Modal visible={!!detailApp} animationType="slide" onRequestClose={() => setDetailApp(null)}>
        {renderDetail()}
      </Modal>

      {/* Create Group Modal */}
      <Modal visible={createGroupModal} transparent animationType="slide" onRequestClose={() => setCreateGroupModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCreateGroupModal(false)}>
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New Group</Text>
            <Text style={styles.inputLabel}>Group Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Morning Shift"
              placeholderTextColor="#aaa"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <Text style={styles.inputLabel}>Description <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, { minHeight: 65, textAlignVertical: 'top' }]}
              placeholder="Brief description..."
              placeholderTextColor="#aaa"
              value={newGroupDesc}
              onChangeText={setNewGroupDesc}
              multiline
            />
            <TouchableOpacity style={styles.sheetBtn} onPress={handleCreateGroup} disabled={createGroupLoading}>
              {createGroupLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.sheetBtnText}>Create Group</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setCreateGroupModal(false)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Move to Group Modal */}
      <Modal visible={!!moveAppModal} transparent animationType="slide" onRequestClose={() => setMoveAppModal(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMoveAppModal(null)}>
          <View style={styles.bottomSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Move to Group</Text>
            {moveAppModal && (
              <Text style={styles.sheetSubtitle}>{moveAppModal.volunteer?.name}</Text>
            )}
            {groups.map(g => (
              <TouchableOpacity key={g._id} style={styles.groupPickerItem} onPress={() => handleMoveToGroup(g._id, moveAppModal._id)}>
                <Ionicons name="folder-outline" size={18} color="#2e86de" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.groupPickerName}>{g.name}</Text>
                  {g.description ? <Text style={styles.groupPickerDesc}>{g.description}</Text> : null}
                </View>
                <Text style={styles.groupPickerCount}>{g.applications.length} apps</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setMoveAppModal(null)}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', gap: 6 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  statNum: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 1 },

  filterScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', maxHeight: 44 },
  filterContent: { paddingHorizontal: 10, paddingVertical: 7, gap: 6, alignItems: 'center', paddingRight: 14 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, backgroundColor: '#f0f4f8', borderWidth: 1, borderColor: '#ddd' },
  filterChipText: { fontSize: 11, fontWeight: '600', color: '#555' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.4 },
  newGroupBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2e86de', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  newGroupBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
  noGroupsText: { color: '#aaa', fontSize: 12, marginBottom: 8, fontStyle: 'italic' },

  groupCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, elevation: 2, overflow: 'hidden', borderWidth: 1, borderColor: '#e8eef5' },
  groupHeader: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#f0f4f8', backgroundColor: '#f8fafd' },
  groupHeaderLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  groupName: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  groupDesc: { fontSize: 11, color: '#888', marginTop: 1 },
  groupBadge: { backgroundColor: '#2e86de', borderRadius: 10, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginLeft: 6 },
  groupBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  groupActions: { flexDirection: 'row', gap: 6 },
  groupActionBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  groupActionText: { fontSize: 11, fontWeight: 'bold' },
  groupDeleteBtn: { backgroundColor: '#fde8e8', borderRadius: 10, width: 30, height: 30, justifyContent: 'center', alignItems: 'center', marginLeft: 2 },
  groupEmpty: { color: '#bbb', fontSize: 12, padding: 12, textAlign: 'center', fontStyle: 'italic' },

  row: {
    backgroundColor: '#fff', borderRadius: 10, marginBottom: 6,
    flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 3, paddingRight: 8,
    marginHorizontal: 8
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, padding: 10, gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  rowEmail: { fontSize: 10, color: '#888', marginTop: 1, marginBottom: 3 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  statusPillText: { fontSize: 9, fontWeight: 'bold' },
  rowRight: { flexShrink: 0 },

  inlineActions: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  iconBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  iconBtnAccept: { backgroundColor: '#27ae60' },
  iconBtnReject: { backgroundColor: '#fde8e8', borderWidth: 1, borderColor: '#e74c3c' },
  iconBtnCompletion: { backgroundColor: '#2e86de' },
  iconBtnContrib: { backgroundColor: '#f3eeff', borderWidth: 1, borderColor: '#9b59b6' },
  iconBtnRemovePerson: { backgroundColor: '#fde8e8', borderWidth: 1, borderColor: '#e74c3c' },
  iconBtnMoveGroup: { backgroundColor: '#e8f0fb', borderWidth: 1, borderColor: '#2e86de' },
  iconBtnUngroup: { backgroundColor: '#f0f4f8', borderWidth: 1, borderColor: '#ccc' },

  empty: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText: { color: '#aaa', fontSize: 13 },

  // Detail modal
  detailContainer: { flex: 1, backgroundColor: '#f0f4f8' },
  detailTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee', elevation: 2 },
  detailClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f4f8', justifyContent: 'center', alignItems: 'center' },
  detailTopTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  detailScroll: { flex: 1 },
  detailProfile: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#fff', marginBottom: 10 },
  detailAvatar: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  detailAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 28 },
  detailName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  detailStatusPill: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 5 },
  detailStatusText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  detailPhoto: { width: 80, height: 80, borderRadius: 40, alignSelf: 'center', marginBottom: 10, borderWidth: 2, borderColor: '#ddd' },
  detailCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 12, marginBottom: 10, elevation: 1 },
  detailCardTitle: { fontSize: 13, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  detailField: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailFieldText: { fontSize: 14, color: '#444', flex: 1 },
  detailSubLabel: { fontSize: 11, fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  detailCardText: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 4 },
  detailActions: { marginHorizontal: 12, marginBottom: 30, gap: 10 },
  detailBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 14, elevation: 1 },
  detailBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  sheetSubtitle: { fontSize: 13, color: '#888', marginTop: -10, marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 5, marginTop: 4 },
  optional: { fontWeight: 'normal', color: '#aaa', fontSize: 11 },
  input: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: '#ddd', color: '#333', marginBottom: 8 },
  sheetBtn: { backgroundColor: '#2e86de', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  sheetBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sheetCancelBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  sheetCancelText: { color: '#888', fontSize: 14 },

  groupPickerItem: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#f8fafd', borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e8eef5' },
  groupPickerName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  groupPickerDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  groupPickerCount: { fontSize: 11, color: '#888', fontWeight: '600' },
});

export default ManageApplicationsScreen;
