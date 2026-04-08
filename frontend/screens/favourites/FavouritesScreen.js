import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform,
  Image, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

// Defined outside to prevent re-mount bug
const ListFormModal = ({ visible, title, name, description, onChangeName, onChangeDescription, onSubmit, onCancel, submitting }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
    <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onCancel} />
      <View style={styles.modalContent}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.label}>List Name *</Text>
        <TextInput style={styles.input} placeholder="e.g. Environmental Causes" placeholderTextColor="#aaa" value={name} onChangeText={onChangeName} autoFocus />
        <Text style={styles.label}>Description (optional)</Text>
        <TextInput style={styles.textArea} placeholder="What kind of opportunities?" placeholderTextColor="#aaa" value={description} onChangeText={onChangeDescription} multiline numberOfLines={3} />
        <TouchableOpacity style={styles.submitButton} onPress={onSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{title}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const FavouritesScreen = ({ navigation }) => {
  const [lists, setLists] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editing, setEditing] = useState(false);

  const fetchData = async () => {
    try {
      const [listsRes, followingRes] = await Promise.all([
        api.get('/api/favourites'),
        api.get('/api/follows/mine').catch(() => ({ data: [] }))
      ]);
      setLists(listsRes.data);
      setFollowing(followingRes.data || []);
    } catch {
      Alert.alert('Error', 'Failed to load favourites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleCreate = async () => {
    if (!createName.trim()) { Alert.alert('Required', 'Please enter a list name'); return; }
    setCreating(true);
    try {
      await api.post('/api/favourites', { name: createName.trim(), description: createDesc.trim() });
      setShowCreate(false); setCreateName(''); setCreateDesc('');
      fetchData();
    } catch { Alert.alert('Error', 'Failed to create list'); }
    finally { setCreating(false); }
  };

  const openEdit = (list) => { setEditingList(list); setEditName(list.name); setEditDesc(list.description || ''); setShowEdit(true); };

  const handleEdit = async () => {
    if (!editName.trim()) { Alert.alert('Required', 'Please enter a list name'); return; }
    setEditing(true);
    try {
      await api.put(`/api/favourites/${editingList._id}`, { name: editName.trim(), description: editDesc.trim() });
      setShowEdit(false); setEditingList(null);
      fetchData();
    } catch { Alert.alert('Error', 'Failed to update list'); }
    finally { setEditing(false); }
  };

  const handleDelete = (list) => {
    Alert.alert('Delete List', `Delete "${list.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/api/favourites/${list._id}`); fetchData(); }
        catch { Alert.alert('Error', 'Failed to delete list'); }
      }}
    ]);
  };

  const recentFollowing = following.slice(0, 2);

  const renderList = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('FavouriteDetail', { list: item })} activeOpacity={0.8}>
      <View style={styles.cardIcon}><Text style={styles.cardIconText}>❤️</Text></View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.description ? <Text style={styles.cardDescription} numberOfLines={1}>{item.description}</Text> : null}
        <Text style={styles.cardCount}>{item.opportunities?.length || 0} saved</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}><Text style={styles.actionBtnText}>✏️</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteActionBtn]} onPress={() => handleDelete(item)}><Text style={styles.actionBtnText}>🗑️</Text></TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#e74c3c" /></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

      {/* Following section */}
      <View style={styles.followingSection}>
        <View style={styles.followingHeader}>
          <Text style={styles.followingTitle}>Following Publishers</Text>
          <TouchableOpacity style={styles.findBtn} onPress={() => navigation.navigate('FindPublishers')}>
            <Ionicons name="search" size={14} color="#2e86de" />
            <Text style={styles.findBtnText}>Find Publishers</Text>
          </TouchableOpacity>
        </View>

        {following.length === 0 ? (
          <View style={styles.noFollowing}>
            <Text style={styles.noFollowingText}>You're not following anyone yet.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FindPublishers')}>
              <Text style={styles.noFollowingLink}>Find publishers to follow →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.followingCards}>
              {recentFollowing.map(pub => {
                const photoUri = pub.profileImage ? `${BASE_URL}/${pub.profileImage}` : null;
                return (
                  <TouchableOpacity
                    key={pub._id}
                    style={styles.pubCard}
                    onPress={() => navigation.navigate('PublisherProfile', { publisherId: pub._id })}
                  >
                    {photoUri ? (
                      <Image source={{ uri: photoUri }} style={styles.pubAvatar} />
                    ) : (
                      <View style={styles.pubAvatarPlaceholder}>
                        <Text style={styles.pubAvatarText}>{pub.name?.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={styles.pubName} numberOfLines={1}>{pub.name}</Text>
                    {pub.averageRating ? (
                      <Text style={styles.pubRating}>⭐ {pub.averageRating}</Text>
                    ) : (
                      <Text style={styles.pubNoRating}>No ratings</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            {following.length > 2 && (
              <TouchableOpacity style={styles.viewMoreBtn} onPress={() => navigation.navigate('FindPublishers')}>
                <Text style={styles.viewMoreText}>View all {following.length} following →</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Favourites lists */}
      <View style={styles.listsSection}>
        <View style={styles.listsHeader}>
          <Text style={styles.listsTitle}>My Lists</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => setShowCreate(true)}>
            <Text style={styles.createButtonText}>+ New List</Text>
          </TouchableOpacity>
        </View>

        {lists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={styles.emptyText}>No favourites lists yet</Text>
            <Text style={styles.emptySubText}>Create a list to save opportunities!</Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.emptyCreateBtnText}>Create My First List</Text>
            </TouchableOpacity>
          </View>
        ) : (
          lists.map(item => (
            <TouchableOpacity key={item._id} style={styles.card} onPress={() => navigation.navigate('FavouriteDetail', { list: item })} activeOpacity={0.8}>
              <View style={styles.cardIcon}><Text style={styles.cardIconText}>❤️</Text></View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.description ? <Text style={styles.cardDescription} numberOfLines={1}>{item.description}</Text> : null}
                <Text style={styles.cardCount}>{item.opportunities?.length || 0} saved</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}><Text style={styles.actionBtnText}>✏️</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.deleteActionBtn]} onPress={() => handleDelete(item)}><Text style={styles.actionBtnText}>🗑️</Text></TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <ListFormModal
        visible={showCreate} title="Create New List"
        name={createName} description={createDesc}
        onChangeName={setCreateName} onChangeDescription={setCreateDesc}
        onSubmit={handleCreate} onCancel={() => { setShowCreate(false); setCreateName(''); setCreateDesc(''); }}
        submitting={creating}
      />
      <ListFormModal
        visible={showEdit} title="Edit List"
        name={editName} description={editDesc}
        onChangeName={setEditName} onChangeDescription={setEditDesc}
        onSubmit={handleEdit} onCancel={() => { setShowEdit(false); setEditingList(null); }}
        submitting={editing}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Following section
  followingSection: { backgroundColor: '#fff', margin: 15, marginBottom: 8, borderRadius: 14, padding: 16, elevation: 2 },
  followingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  followingTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  findBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0f4f8', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  findBtnText: { color: '#2e86de', fontWeight: 'bold', fontSize: 13 },
  noFollowing: { alignItems: 'center', padding: 10 },
  noFollowingText: { color: '#999', fontSize: 14, marginBottom: 6 },
  noFollowingLink: { color: '#2e86de', fontWeight: 'bold', fontSize: 14 },
  followingCards: { flexDirection: 'row', gap: 10 },
  pubCard: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#dee2e6' },
  pubAvatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 6 },
  pubAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  pubAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#666' },
  pubName: { fontWeight: 'bold', fontSize: 13, color: '#333', textAlign: 'center', marginBottom: 2 },
  pubRating: { fontSize: 12, color: '#f39c12' },
  pubNoRating: { fontSize: 11, color: '#bbb' },
  viewMoreBtn: { marginTop: 10, alignItems: 'center' },
  viewMoreText: { color: '#2e86de', fontWeight: 'bold', fontSize: 14 },

  // Lists section
  listsSection: { paddingHorizontal: 15, paddingBottom: 30 },
  listsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listsTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  createButton: { backgroundColor: '#e74c3c', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8 },
  createButtonText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, elevation: 3, flexDirection: 'row', alignItems: 'center', padding: 14 },
  cardIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ffe0e0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardIconText: { fontSize: 22 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 3 },
  cardDescription: { fontSize: 13, color: '#666', marginBottom: 3 },
  cardCount: { fontSize: 12, color: '#e74c3c', fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  actionBtn: { width: 36, height: 36, backgroundColor: '#f8f9fa', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  deleteActionBtn: { backgroundColor: '#ffe0e0' },
  actionBtnText: { fontSize: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 30 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  emptySubText: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 20 },
  emptyCreateBtn: { backgroundColor: '#e74c3c', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  emptyCreateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  textArea: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', minHeight: 80, textAlignVertical: 'top', color: '#333' },
  submitButton: { backgroundColor: '#e74c3c', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelButtonText: { color: '#999', fontWeight: 'bold', fontSize: 15 }
});

export default FavouritesScreen;
