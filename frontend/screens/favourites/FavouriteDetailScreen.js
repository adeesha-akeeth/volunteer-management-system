import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity,
  RefreshControl, Image, ScrollView, Modal, TextInput,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import AutoHeightImage from '../../components/AutoHeightImage';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const FavouriteDetailScreen = ({ route, navigation }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const { list: initialList } = route.params;

  const [list, setList] = useState(initialList);
  const [opportunities, setOpportunities] = useState(initialList.opportunities || []);
  const [extraData, setExtraData] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState(initialList.name);
  const [editDesc, setEditDesc] = useState(initialList.description || '');
  const [editPhoto, setEditPhoto] = useState(null);           // new local URI
  const [editExistingPhoto, setEditExistingPhoto] = useState(initialList.photo || null);
  const [editRemovePhoto, setEditRemovePhoto] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchList = async () => {
    try {
      const response = await api.get('/api/favourites');
      const updated = response.data.find(l => l._id === list._id);
      if (updated) {
        setList(updated);
        setOpportunities(updated.opportunities || []);
      }
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  };

  const fetchExtras = async (opps) => {
    if (!opps || opps.length === 0) return;
    try {
      const results = await Promise.allSettled(
        opps.map(o => api.get(`/api/opportunities/${o._id}`))
      );
      const map = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          const d = r.value.data;
          map[opps[i]._id] = {
            likes: d.likes || 0,
            dislikes: d.dislikes || 0,
            averageRating: d.averageRating || null,
            reviewCount: d.reviewCount || 0
          };
        }
      });
      setExtraData(map);
    } catch {}
  };

  useEffect(() => {
    fetchExtras(opportunities);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchList().then(() => fetchExtras(opportunities));
  };

  const handleRemove = (opportunityId) => {
    confirm.show({
      title: 'Remove',
      message: 'Remove this opportunity from the list?',
      confirmText: 'Remove',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/favourites/${list._id}/remove/${opportunityId}`);
          setOpportunities(prev => prev.filter(op => op._id !== opportunityId));
        } catch {
          toast.error('Error', 'Failed to remove');
        }
      }
    });
  };

  const pickEditPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setEditPhoto(result.assets[0].uri);
      setEditRemovePhoto(false);
    }
  };

  const handleEdit = async () => {
    if (!editName.trim()) { toast.warning('Required', 'Please enter a list name'); return; }
    setEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('description', editDesc.trim());
      if (editPhoto) {
        formData.append('photo', { uri: editPhoto, type: 'image/jpeg', name: 'banner.jpg' });
      } else if (editRemovePhoto) {
        formData.append('removePhoto', 'true');
      }
      const res = await api.put(`/api/favourites/${list._id}`, formData);
      const updatedPhoto = res.data?.photo || '';
      setList(prev => ({ ...prev, name: editName.trim(), description: editDesc.trim(), photo: updatedPhoto }));
      setEditExistingPhoto(updatedPhoto || null);
      setEditPhoto(null);
      setEditRemovePhoto(false);
      setEditVisible(false);
      toast.success('Updated', 'List updated successfully');
    } catch {
      toast.error('Error', 'Failed to update list');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = () => {
    confirm.show({
      title: 'Delete List',
      message: `Delete "${list.name}"? All saved opportunities will be removed from this list.`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/favourites/${list._id}`);
          navigation.goBack();
        } catch {
          toast.error('Error', 'Failed to delete list');
        }
      }
    });
  };

  const allCategories = [...new Set(opportunities.map(o => o.category).filter(Boolean))];

  const renderItem = ({ item }) => {
    const extra = extraData[item._id] || {};
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item._id })}
        activeOpacity={0.9}
      >
        {item.bannerImage ? (
          <Image source={{ uri: `${BASE_URL}/${item.bannerImage}` }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="globe-outline" size={28} color="#aaa" />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.badgeRow}>
            {item.category && <View style={styles.categoryBadge}><Text style={styles.categoryText}>{item.category}</Text></View>}
            {extra.averageRating && (
              <View style={styles.ratingBadge}><Text style={styles.ratingText}>⭐ {extra.averageRating} ({extra.reviewCount})</Text></View>
            )}
          </View>

          <Text style={styles.cardTitle}>{item.title}</Text>
          {item.organization ? (
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={13} color="#888" style={{ marginRight: 4 }} />
              <Text style={styles.cardDetail}>{item.organization}</Text>
            </View>
          ) : null}
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={13} color="#888" style={{ marginRight: 4 }} />
            <Text style={styles.cardDetail}>{item.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={13} color="#888" style={{ marginRight: 4 }} />
            <Text style={styles.cardDetail}>
              {item.startDate
                ? `${new Date(item.startDate).toDateString()} — ${new Date(item.endDate).toDateString()}`
                : 'Date not set'}
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <View style={styles.voteBadge}><Text style={styles.voteBadgeText}>👍 {extra.likes || 0}</Text></View>
            <View style={[styles.voteBadge, { backgroundColor: '#ffe8e8' }]}><Text style={[styles.voteBadgeText, { color: '#e74c3c' }]}>👎 {extra.dislikes || 0}</Text></View>
            <TouchableOpacity style={styles.removeButton} onPress={() => handleRemove(item._id)}>
              <Text style={styles.removeButtonText}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const openEdit = () => {
    setEditName(list.name);
    setEditDesc(list.description || '');
    setEditPhoto(null);
    setEditExistingPhoto(list.photo || null);
    setEditRemovePhoto(false);
    setEditVisible(true);
  };

  const editPreviewUri = editPhoto || (editExistingPhoto && !editRemovePhoto ? `${BASE_URL}/${editExistingPhoto}` : null);

  return (
    <View style={styles.container}>
      {/* Banner image */}
      {list.photo ? (
        <AutoHeightImage uri={`${BASE_URL}/${list.photo}`} style={styles.bannerImage} borderRadius={0} />
      ) : null}

      {/* Header with list info and actions */}
      <View style={styles.headerCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>{list.name}</Text>
          {list.description ? <Text style={styles.description}>{list.description}</Text> : null}
          <Text style={styles.countLabel}>{opportunities.length} opportunit{opportunities.length !== 1 ? 'ies' : 'y'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={openEdit}>
            <Ionicons name="pencil-outline" size={18} color="#2e86de" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerActionBtn, styles.headerDeleteBtn]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      {allCategories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ gap: 8, paddingRight: 10 }}>
          {allCategories.map(cat => (
            <View key={cat} style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{cat}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={opportunities}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 15, paddingTop: 8 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No opportunities in this list yet</Text>
            <Text style={styles.emptySubText}>Tap the ❤️ on any opportunity to add it here!</Text>
          </View>
        }
      />

      {/* Edit List Modal */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setEditVisible(false)} />
          <View style={styles.modalCenteredWrapper} pointerEvents="box-none">
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit List</Text>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.label}>List Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Environmental Causes"
                  placeholderTextColor="#aaa"
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                />
                <Text style={styles.label}>Description (optional)</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="What kind of opportunities?"
                  placeholderTextColor="#aaa"
                  value={editDesc}
                  onChangeText={setEditDesc}
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.label}>Banner Image (optional)</Text>
                <TouchableOpacity style={styles.imagePickerBtn} onPress={pickEditPhoto}>
                  <Ionicons name="image-outline" size={18} color="#e74c3c" style={{ marginRight: 8 }} />
                  <Text style={styles.imagePickerText}>{editPreviewUri ? 'Replace banner image' : 'Add a banner image'}</Text>
                </TouchableOpacity>
                {editPreviewUri ? (
                  <View style={{ position: 'relative', marginBottom: 10 }}>
                    <AutoHeightImage uri={editPreviewUri} borderRadius={10} />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => {
                        if (editPhoto) setEditPhoto(null);
                        else { setEditExistingPhoto(null); setEditRemovePhoto(true); }
                      }}
                    >
                      <Ionicons name="close-circle" size={26} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                ) : null}
                <TouchableOpacity style={styles.submitButton} onPress={handleEdit} disabled={editSubmitting}>
                  {editSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Save Changes</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  bannerImage: {},

  headerCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2
  },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  description: { fontSize: 14, color: '#666', marginBottom: 4 },
  countLabel: { fontSize: 12, color: '#e74c3c', fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', gap: 8, marginLeft: 10, marginTop: 4 },
  headerActionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center', alignItems: 'center'
  },
  headerDeleteBtn: { backgroundColor: '#ffe0e0' },

  categoryScroll: { paddingHorizontal: 15, paddingVertical: 8, maxHeight: 50 },
  categoryChip: { backgroundColor: '#e8f4fd', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#2e86de' },
  categoryChipText: { color: '#2e86de', fontWeight: 'bold', fontSize: 12, textTransform: 'capitalize' },

  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, elevation: 3, overflow: 'hidden' },
  cardImage: { width: '100%', height: 120 },
  cardImagePlaceholder: { width: '100%', height: 80, backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center' },
  cardContent: { padding: 12 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  categoryBadge: { backgroundColor: '#e8f4fd', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#2e86de', fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  ratingBadge: { backgroundColor: '#fff8e1', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText: { color: '#f39c12', fontSize: 11, fontWeight: 'bold' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardDetail: { fontSize: 13, color: '#555', flex: 1 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  voteBadge: { backgroundColor: '#e8f4fd', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  voteBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#2e86de' },
  removeButton: { marginLeft: 'auto', backgroundColor: '#ffe0e0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  removeButtonText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 12 },

  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  emptySubText: { fontSize: 14, color: '#999', textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCenteredWrapper: { width: '88%', maxHeight: '80%', zIndex: 10 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 6 },
  input: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', color: '#333' },
  textArea: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16, borderWidth: 1, borderColor: '#ddd', minHeight: 80, textAlignVertical: 'top', color: '#333' },
  imagePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffe0e0', borderWidth: 1, borderColor: '#e74c3c', borderRadius: 10, padding: 12, marginBottom: 10 },
  imagePickerText: { fontSize: 13, color: '#e74c3c', flex: 1 },
  removePhotoBtn: { position: 'absolute', top: 6, right: 6 },
  submitButton: { backgroundColor: '#e74c3c', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelButton: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelButtonText: { color: '#999', fontWeight: 'bold', fontSize: 15 }
});

export default FavouriteDetailScreen;
