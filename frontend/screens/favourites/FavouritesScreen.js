import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity,
  RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform,
  Image, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../../components/Toast';
import AutoHeightImage from '../../components/AutoHeightImage';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const ListFormModal = ({ visible, title, name, description, photo, onChangeName, onChangeDescription, onPickPhoto, onRemovePhoto, onSubmit, onCancel, submitting }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <KeyboardAvoidingView
      style={styles.modalOverlay}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onCancel} />
      <View style={styles.modalCenteredWrapper} pointerEvents="box-none">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>List Name *</Text>
            <TextInput style={styles.input} placeholder="e.g. Environmental Causes" placeholderTextColor="#aaa" value={name} onChangeText={onChangeName} autoFocus />
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput style={styles.textArea} placeholder="What kind of opportunities?" placeholderTextColor="#aaa" value={description} onChangeText={onChangeDescription} multiline numberOfLines={3} />
            <Text style={styles.label}>Banner Image (optional)</Text>
            <TouchableOpacity style={styles.imagePickerBtn} onPress={onPickPhoto}>
              <Ionicons name="image-outline" size={18} color="#e74c3c" style={{ marginRight: 8 }} />
              <Text style={styles.imagePickerText}>{photo ? 'Replace banner image' : 'Add a banner image'}</Text>
            </TouchableOpacity>
            {photo ? (
              <View style={{ position: 'relative', marginBottom: 10 }}>
                <AutoHeightImage uri={photo} borderRadius={10} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={onRemovePhoto}>
                  <Ionicons name="close-circle" size={26} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ) : null}
            <TouchableOpacity style={styles.submitButton} onPress={onSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>{title}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

const FavouritesScreen = ({ navigation }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('feed');

  // Feed state
  const [feed, setFeed] = useState([]);
  const [following, setFollowing] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedRefreshing, setFeedRefreshing] = useState(false);

  // Lists state
  const [lists, setLists] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [listsRefreshing, setListsRefreshing] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createPhoto, setCreatePhoto] = useState(null);
  const [creating, setCreating] = useState(false);

  const fetchFeed = async () => {
    try {
      const [feedRes, followingRes] = await Promise.all([
        api.get('/api/follows/feed').catch(() => ({ data: [] })),
        api.get('/api/follows/mine').catch(() => ({ data: [] }))
      ]);
      setFeed(feedRes.data || []);
      setFollowing(followingRes.data || []);
    } catch {
      // silent fail for feed
    } finally {
      setFeedLoading(false);
      setFeedRefreshing(false);
    }
  };

  const fetchLists = async () => {
    try {
      const res = await api.get('/api/favourites');
      setLists(res.data);
    } catch {
      toast.error('Error', 'Failed to load favourites');
    } finally {
      setListsLoading(false);
      setListsRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    fetchFeed();
    fetchLists();
  }, []));

  const handleVote = async (opp, vote) => {
    try {
      const res = await api.post('/api/votes', { targetId: opp._id, targetType: 'opportunity', vote });
      setFeed(prev => prev.map(o =>
        o._id === opp._id ? { ...o, likes: res.data.likes, dislikes: res.data.dislikes, userVote: res.data.userVote } : o
      ));
    } catch {}
  };

  const handlePickCreatePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) setCreatePhoto(result.assets[0].uri);
  };

  const handleCreate = async () => {
    if (!createName.trim()) { toast.warning('Required', 'Please enter a list name'); return; }
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', createName.trim());
      formData.append('description', createDesc.trim());
      if (createPhoto) {
        formData.append('photo', { uri: createPhoto, type: 'image/jpeg', name: 'banner.jpg' });
      }
      await api.post('/api/favourites', formData);
      setShowCreate(false); setCreateName(''); setCreateDesc(''); setCreatePhoto(null);
      fetchLists();
    } catch { toast.error('Error', 'Failed to create list'); }
    finally { setCreating(false); }
  };

  const renderFeedItem = ({ item }) => {
    const likeActive = item.userVote === 'like';
    const dislikeActive = item.userVote === 'dislike';
    const pubPhoto = item.createdBy?.profileImage ? `${BASE_URL}/${item.createdBy.profileImage}` : null;
    const hasFundraisers = item.fundraisers?.length > 0;

    return (
      <TouchableOpacity
        style={styles.feedCard}
        onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item._id })}
        activeOpacity={0.9}
      >
        {item.bannerImage ? (
          <Image source={{ uri: `${BASE_URL}/${item.bannerImage}` }} style={styles.feedBanner} resizeMode="cover" />
        ) : (
          <View style={styles.feedBannerPlaceholder}><Text style={styles.feedBannerIcon}>🌍</Text></View>
        )}

        <View style={styles.feedBody}>
          {/* Publisher row */}
          <TouchableOpacity
            style={styles.feedPubRow}
            onPress={() => navigation.navigate('PublisherProfile', { publisherId: item.createdBy?._id })}
          >
            {pubPhoto ? (
              <Image source={{ uri: pubPhoto }} style={styles.feedPubAvatar} />
            ) : (
              <View style={styles.feedPubAvatarPlaceholder}>
                <Text style={styles.feedPubAvatarText}>{item.createdBy?.name?.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.feedPubName}>{item.createdBy?.name}</Text>
            {item.category && <View style={styles.feedCategoryBadge}><Text style={styles.feedCategoryText}>{item.category}</Text></View>}
          </TouchableOpacity>

          <Text style={styles.feedTitle} numberOfLines={2}>{item.title}</Text>
          {item.organization ? <Text style={styles.feedMeta}>🏢 {item.organization}</Text> : null}
          <Text style={styles.feedMeta}>📍 {item.location}</Text>
          {item.startDate && <Text style={styles.feedMeta}>📅 {new Date(item.startDate).toDateString()}</Text>}

          {/* Fundraiser chips */}
          {hasFundraisers && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fundraiserScroll}>
              {item.fundraisers.filter(fr => fr.status === 'active').map(fr => {
                const pct = fr.targetAmount > 0 ? Math.min(100, Math.round((fr.collectedAmount / fr.targetAmount) * 100)) : 0;
                return (
                  <View key={fr._id} style={styles.fundraiserChip}>
                    <Text style={styles.fundraiserChipText}>💰 {fr.name}</Text>
                    <Text style={styles.fundraiserChipPct}>{pct}% funded</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Actions */}
          <View style={styles.feedActions}>
            <TouchableOpacity
              style={[styles.feedVoteBtn, likeActive && styles.feedVoteLikeActive]}
              onPress={() => handleVote(item, 'like')}
            >
              <Text style={styles.feedVoteBtnText}>👍 {item.likes || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.feedVoteBtn, dislikeActive && styles.feedVoteDislikeActive]}
              onPress={() => handleVote(item, 'dislike')}
            >
              <Text style={styles.feedVoteBtnText}>👎 {item.dislikes || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.feedCommentBtn}
              onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item._id })}
            >
              <Ionicons name="chatbubble-outline" size={15} color="#555" />
              <Text style={styles.feedCommentBtnText}>Comments</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeedTab = () => {
    if (feedLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;

    return (
      <FlatList
        data={feed}
        keyExtractor={item => item._id}
        renderItem={renderFeedItem}
        refreshControl={<RefreshControl refreshing={feedRefreshing} onRefresh={() => { setFeedRefreshing(true); fetchFeed(); }} />}
        ListHeaderComponent={
          <View>
            {/* Following row */}
            <View style={styles.followingHeader}>
              <Text style={styles.followingTitle}>Following ({following.length})</Text>
              <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('FindPublishers', { followedOnly: true })}>
                <Text style={styles.manageBtnText}>Manage →</Text>
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.followingScroll} contentContainerStyle={{ gap: 10, paddingHorizontal: 15 }}>
                {following.map(pub => {
                  const photoUri = pub.profileImage ? `${BASE_URL}/${pub.profileImage}` : null;
                  return (
                    <TouchableOpacity
                      key={pub._id}
                      style={styles.pubChip}
                      onPress={() => navigation.navigate('PublisherProfile', { publisherId: pub._id })}
                    >
                      {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.pubChipAvatar} />
                      ) : (
                        <View style={styles.pubChipAvatarPlaceholder}>
                          <Text style={styles.pubChipAvatarText}>{pub.name?.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <Text style={styles.pubChipName} numberOfLines={1}>{pub.name}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity style={styles.pubChipAdd} onPress={() => navigation.navigate('FindPublishers')}>
                  <View style={styles.pubChipAddIcon}><Text style={styles.pubChipAddText}>+</Text></View>
                  <Text style={styles.pubChipName}>Find More</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            {feed.length > 0 && (
              <Text style={styles.feedSectionLabel}>Recent posts from people you follow</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyFeedIcon}>📰</Text>
            <Text style={styles.emptyFeedText}>No posts yet</Text>
            <Text style={styles.emptyFeedSub}>Follow publishers to see their opportunities here.</Text>
          </View>
        }
      />
    );
  };

  const renderListsTab = () => {
    if (listsLoading) return <View style={styles.centered}><ActivityIndicator size="large" color="#e74c3c" /></View>;

    return (
      <FlatList
        data={lists}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={listsRefreshing} onRefresh={() => { setListsRefreshing(true); fetchLists(); }} />}
        ListHeaderComponent={
          <View style={styles.listsHeader}>
            <Text style={styles.listsTitle}>My Lists</Text>
            <TouchableOpacity style={styles.createButton} onPress={() => setShowCreate(true)}>
              <Text style={styles.createButtonText}>+ New List</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('FavouriteDetail', { list: item })} activeOpacity={0.8}>
            <View style={styles.cardIcon}><Text style={styles.cardIconText}>❤️</Text></View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              {item.description ? <Text style={styles.cardDescription} numberOfLines={1}>{item.description}</Text> : null}
              <Text style={styles.cardCount}>{item.opportunities?.length || 0} saved</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Text style={styles.emptyText}>No favourites lists yet</Text>
            <Text style={styles.emptySubText}>Create a list to save opportunities!</Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.emptyCreateBtnText}>Create My First List</Text>
            </TouchableOpacity>
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
          onPress={() => setActiveTab('feed')}
        >
          <Ionicons name="newspaper-outline" size={16} color={activeTab === 'feed' ? '#2e86de' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'feed' && styles.tabTextActive]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lists' && styles.tabActive]}
          onPress={() => setActiveTab('lists')}
        >
          <Ionicons name="bookmark-outline" size={16} color={activeTab === 'lists' ? '#e74c3c' : '#888'} />
          <Text style={[styles.tabText, activeTab === 'lists' && styles.tabTextActiveRed]}>My Lists</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'feed' ? renderFeedTab() : renderListsTab()}

      <ListFormModal
        visible={showCreate} title="Create New List"
        name={createName} description={createDesc} photo={createPhoto}
        onChangeName={setCreateName} onChangeDescription={setCreateDesc}
        onPickPhoto={handlePickCreatePhoto} onRemovePhoto={() => setCreatePhoto(null)}
        onSubmit={handleCreate} onCancel={() => { setShowCreate(false); setCreateName(''); setCreateDesc(''); setCreatePhoto(null); }}
        submitting={creating}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2e86de' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#888' },
  tabTextActive: { color: '#2e86de' },
  tabTextActiveRed: { color: '#e74c3c' },

  // Feed tab
  followingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 14, paddingBottom: 10 },
  followingTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  manageBtn: { backgroundColor: '#f0f4f8', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  manageBtnText: { color: '#2e86de', fontWeight: 'bold', fontSize: 13 },
  noFollowing: { alignItems: 'center', padding: 20 },
  noFollowingText: { color: '#999', fontSize: 14, marginBottom: 6 },
  noFollowingLink: { color: '#2e86de', fontWeight: 'bold', fontSize: 14 },
  followingScroll: { marginBottom: 4 },
  pubChip: { alignItems: 'center', width: 68 },
  pubChipAvatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 5 },
  pubChipAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  pubChipAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#666' },
  pubChipName: { fontSize: 11, color: '#555', textAlign: 'center', fontWeight: '600' },
  pubChipAdd: { alignItems: 'center', width: 68 },
  pubChipAddIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center', marginBottom: 5, borderWidth: 1.5, borderColor: '#2e86de', borderStyle: 'dashed' },
  pubChipAddText: { fontSize: 24, color: '#2e86de', fontWeight: 'bold' },
  feedSectionLabel: { fontSize: 12, color: '#aaa', paddingHorizontal: 15, paddingTop: 8, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  feedCard: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 15, marginBottom: 14, elevation: 3, overflow: 'hidden' },
  feedBanner: { width: '100%', height: 150 },
  feedBannerPlaceholder: { width: '100%', height: 80, backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center' },
  feedBannerIcon: { fontSize: 32 },
  feedBody: { padding: 14 },
  feedPubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  feedPubAvatar: { width: 30, height: 30, borderRadius: 15 },
  feedPubAvatarPlaceholder: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center' },
  feedPubAvatarText: { fontSize: 13, fontWeight: 'bold', color: '#666' },
  feedPubName: { fontWeight: 'bold', color: '#555', fontSize: 13, flex: 1 },
  feedCategoryBadge: { backgroundColor: '#e8f4fd', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  feedCategoryText: { color: '#2e86de', fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize' },
  feedTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 6 },
  feedMeta: { fontSize: 12, color: '#666', marginBottom: 2 },
  fundraiserScroll: { marginTop: 8, marginBottom: 4 },
  fundraiserChip: { backgroundColor: '#fff8e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderWidth: 1, borderColor: '#ffe082' },
  fundraiserChipText: { fontSize: 12, fontWeight: '600', color: '#e67e22' },
  fundraiserChipPct: { fontSize: 10, color: '#888', marginTop: 1 },
  feedActions: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' },
  feedVoteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f4f8', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  feedVoteLikeActive: { backgroundColor: '#d4efdf' },
  feedVoteDislikeActive: { backgroundColor: '#fde8e8' },
  feedVoteBtnText: { fontSize: 13, fontWeight: '600', color: '#555' },
  feedCommentBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 },
  feedCommentBtnText: { fontSize: 13, color: '#555' },

  emptyFeed: { alignItems: 'center', marginTop: 40, paddingHorizontal: 30 },
  emptyFeedIcon: { fontSize: 48, marginBottom: 12 },
  emptyFeedText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  emptyFeedSub: { fontSize: 14, color: '#999', textAlign: 'center' },

  // Lists tab
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
  emptyContainer: { alignItems: 'center', marginTop: 30 },
  emptyIcon: { fontSize: 50, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  emptySubText: { fontSize: 14, color: '#999', textAlign: 'center', marginBottom: 20 },
  emptyCreateBtn: { backgroundColor: '#e74c3c', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  emptyCreateBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCenteredWrapper: { width: '88%', maxHeight: '80%', zIndex: 10 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
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

export default FavouritesScreen;
