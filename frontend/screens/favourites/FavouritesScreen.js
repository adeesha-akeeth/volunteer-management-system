import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import api from '../../api';

// ListFormModal is defined OUTSIDE the screen component to prevent the
// 1-letter-at-a-time re-mount bug caused by inner component redefinition.
const ListFormModal = ({ visible, title, name, description, onChangeName, onChangeDescription, onSubmit, onCancel, submitting }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
    <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onCancel} />
      <View style={styles.modalContent}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>{title}</Text>

        <Text style={styles.label}>List Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Environmental Causes"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={onChangeName}
          autoFocus
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="What kind of opportunities?"
          placeholderTextColor="#aaa"
          value={description}
          onChangeText={onChangeDescription}
          multiline
          numberOfLines={3}
        />

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

  const fetchLists = async () => {
    try {
      const res = await api.get('/api/favourites');
      setLists(res.data);
    } catch {
      Alert.alert('Error', 'Failed to load favourites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchLists(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchLists(); };

  const handleCreate = async () => {
    if (!createName.trim()) { Alert.alert('Required', 'Please enter a list name'); return; }
    setCreating(true);
    try {
      await api.post('/api/favourites', { name: createName.trim(), description: createDesc.trim() });
      setShowCreate(false);
      setCreateName(''); setCreateDesc('');
      fetchLists();
    } catch {
      Alert.alert('Error', 'Failed to create list');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (list) => {
    setEditingList(list);
    setEditName(list.name);
    setEditDesc(list.description || '');
    setShowEdit(true);
  };

  const handleEdit = async () => {
    if (!editName.trim()) { Alert.alert('Required', 'Please enter a list name'); return; }
    setEditing(true);
    try {
      await api.put(`/api/favourites/${editingList._id}`, { name: editName.trim(), description: editDesc.trim() });
      setShowEdit(false);
      setEditingList(null);
      fetchLists();
    } catch {
      Alert.alert('Error', 'Failed to update list');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = (list) => {
    Alert.alert(
      'Delete List',
      `Delete "${list.name}"? All saved opportunities in this list will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/api/favourites/${list._id}`);
            fetchLists();
          } catch {
            Alert.alert('Error', 'Failed to delete list');
          }
        }}
      ]
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('FavouriteDetail', { list: item })} activeOpacity={0.8}>
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>❤️</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.description ? <Text style={styles.cardDescription} numberOfLines={1}>{item.description}</Text> : null}
        <Text style={styles.cardCount}>{item.opportunities?.length || 0} saved</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
          <Text style={styles.actionBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteActionBtn]} onPress={() => handleDelete(item)}>
          <Text style={styles.actionBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#e74c3c" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Favourites</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreate(true)}>
          <Text style={styles.createButtonText}>+ New List</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={lists}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={styles.emptyText}>No favourites lists yet</Text>
            <Text style={styles.emptySubText}>Create a list to save opportunities you love!</Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.emptyCreateBtnText}>Create My First List</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ListFormModal
        visible={showCreate}
        title="Create New List"
        name={createName}
        description={createDesc}
        onChangeName={setCreateName}
        onChangeDescription={setCreateDesc}
        onSubmit={handleCreate}
        onCancel={() => { setShowCreate(false); setCreateName(''); setCreateDesc(''); }}
        submitting={creating}
      />

      <ListFormModal
        visible={showEdit}
        title="Edit List"
        name={editName}
        description={editDesc}
        onChangeName={setEditName}
        onChangeDescription={setEditDesc}
        onSubmit={handleEdit}
        onCancel={() => { setShowEdit(false); setEditingList(null); }}
        submitting={editing}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#333' },
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
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 60, marginBottom: 15 },
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
