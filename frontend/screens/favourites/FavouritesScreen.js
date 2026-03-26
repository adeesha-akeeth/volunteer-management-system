import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
  RefreshControl, Image, TextInput, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api';

const FavouritesScreen = ({ navigation }) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchLists = async () => {
    try {
      const response = await api.get('/api/favourites');
      setLists(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load favourites');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchLists(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchLists(); };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7
    });
    if (!result.canceled) setPhoto(result.assets[0]);
  };

  const handleCreate = async () => {
    if (!name) { Alert.alert('Error', 'Please enter a list name'); return; }
    setSubmitting(true);
    try {
      if (photo) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        const filename = photo.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('photo', { uri: photo.uri, name: filename, type });
        await api.post('/api/favourites', formData);
      } else {
        await api.post('/api/favourites', { name, description });
      }
      setShowCreateModal(false);
      setName('');
      setDescription('');
      setPhoto(null);
      fetchLists();
    } catch (error) {
      Alert.alert('Error', 'Failed to create list');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!name) { Alert.alert('Error', 'Please enter a list name'); return; }
    setSubmitting(true);
    try {
      if (photo) {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        const filename = photo.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('photo', { uri: photo.uri, name: filename, type });
        await api.put(`/api/favourites/${selectedList._id}`, formData);
      } else {
        await api.put(`/api/favourites/${selectedList._id}`, { name, description });
      }
      setShowEditModal(false);
      setName('');
      setDescription('');
      setPhoto(null);
      setSelectedList(null);
      fetchLists();
    } catch (error) {
      Alert.alert('Error', 'Failed to update list');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await api.put(`/api/favourites/${selectedList._id}`, {
        name: selectedList.name,
        description: selectedList.description,
        removePhoto: 'true'
      });
      fetchLists();
      setShowEditModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to remove photo');
    }
  };

  const handleDelete = (listId) => {
    Alert.alert('Delete List', 'Are you sure? This will delete the list and all its saved opportunities.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/favourites/${listId}`);
            fetchLists();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete list');
          }
        }
      }
    ]);
  };

  const openEditModal = (list) => {
    setSelectedList(list);
    setName(list.name);
    setDescription(list.description);
    setPhoto(null);
    setShowEditModal(true);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('FavouriteDetail', { list: item })}
    >
      {item.photo ? (
        <Image
          source={{ uri: `https://volunteer-management-system-qux8.onrender.com/${item.photo}` }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Text style={styles.cardImagePlaceholderText}>❤️</Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
        <Text style={styles.cardCount}>{item.opportunities?.length || 0} opportunities saved</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item._id)}>
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const ModalContent = ({ onSubmit, title, buttonText }) => (
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>

        <Text style={styles.label}>List Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Environmental Causes"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={styles.textArea}
          placeholder="What kind of opportunities will you save here?"
          placeholderTextColor="#aaa"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Cover Photo (optional)</Text>
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickPhoto}>
          <Text style={styles.imagePickerText}>
            {photo ? '✅ Photo Selected' : '📷 Add Cover Photo'}
          </Text>
        </TouchableOpacity>

        {selectedList?.photo && !photo && (
          <TouchableOpacity style={styles.removePhotoButton} onPress={handleRemovePhoto}>
            <Text style={styles.removePhotoText}>🗑️ Remove Current Photo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.submitButton} onPress={onSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{buttonText}</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setName('');
          setDescription('');
          setPhoto(null);
          setSelectedList(null);
        }}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#e74c3c" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>My Favourites</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
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
            <Text style={styles.emptySubText}>Create a list to start saving opportunities!</Text>
          </View>
        }
      />

      <Modal visible={showCreateModal} transparent animationType="slide">
        <ModalContent onSubmit={handleCreate} title="Create New List" buttonText="Create List" />
      </Modal>

      <Modal visible={showEditModal} transparent animationType="slide">
        <ModalContent onSubmit={handleEdit} title="Edit List" buttonText="Save Changes" />
      </Modal>
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
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, elevation: 3, overflow: 'hidden' },
  cardImage: { width: '100%', height: 120, },
  cardImagePlaceholder: { width: '100%', height: 80, backgroundColor: '#ffe0e0', justifyContent: 'center', alignItems: 'center' },
  cardImagePlaceholderText: { fontSize: 30 },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  cardDescription: { fontSize: 14, color: '#666', marginBottom: 4 },
  cardCount: { fontSize: 12, color: '#e74c3c', fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', padding: 8, gap: 8 },
  editButton: { padding: 8, backgroundColor: '#f0f4f8', borderRadius: 8 },
  editButtonText: { fontSize: 18 },
  deleteButton: { padding: 8, backgroundColor: '#ffe0e0', borderRadius: 8 },
  deleteButtonText: { fontSize: 18 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 60, marginBottom: 15 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  emptySubText: { fontSize: 14, color: '#999', textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  input: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  textArea: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#ddd', minHeight: 80, textAlignVertical: 'top', color: '#333' },
  imagePickerButton: { backgroundColor: '#f0f4f8', borderWidth: 2, borderColor: '#e74c3c', borderStyle: 'dashed', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  imagePickerText: { color: '#e74c3c', fontWeight: 'bold' },
  removePhotoButton: { padding: 10, alignItems: 'center', marginBottom: 10 },
  removePhotoText: { color: '#e74c3c', fontSize: 14 },
  submitButton: { backgroundColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 15, alignItems: 'center' },
  cancelButtonText: { color: '#999', fontWeight: 'bold' }
});

export default FavouritesScreen;