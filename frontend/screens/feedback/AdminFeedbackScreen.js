import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/Toast';
import AutoHeightImage from '../../components/AutoHeightImage';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const AdminFeedbackScreen = () => {
  const t = useTheme();
  const toast = useToast();

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState(null);
  const [replying, setReplying] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/user-feedback/admin/all');
      setFeedbacks(res.data || []);
    } catch {
      toast.error('Error', 'Failed to load feedbacks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));
  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const openFeedback = (item) => {
    setSelected(item);
    setReplyText('');
    setReplyImage(null);
  };

  const pickReplyImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) setReplyImage(result.assets[0].uri);
  };

  const handleReply = async () => {
    if (!replyText.trim()) { toast.error('Required', 'Please write a reply'); return; }
    setReplying(true);
    try {
      const formData = new FormData();
      formData.append('reply', replyText.trim());
      if (replyImage) {
        formData.append('image', { uri: replyImage, type: 'image/jpeg', name: 'reply.jpg' });
      }
      const res = await api.post(`/api/user-feedback/${selected._id}/reply`, formData);
      setFeedbacks(prev => prev.map(f => f._id === selected._id ? res.data : f));
      setSelected(res.data);
      setReplyText('');
      setReplyImage(null);
      toast.success('Replied', 'Reply sent to user');
    } catch (e) {
      toast.error('Error', e.response?.data?.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const s = makeStyles(t);
  const filtered = filter === 'all' ? feedbacks : feedbacks.filter(f => f.status === filter);
  const pendingCount = feedbacks.filter(f => f.status === 'pending').length;

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={t.accent} /></View>;

  return (
    <>
      <View style={s.container}>
        {/* Stats bar */}
        <View style={s.statsBar}>
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: t.warning }]}>{pendingCount}</Text>
            <Text style={s.statLbl}>Pending</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: t.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: t.success }]}>{feedbacks.length - pendingCount}</Text>
            <Text style={s.statLbl}>Replied</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: t.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: t.text }]}>{feedbacks.length}</Text>
            <Text style={s.statLbl}>Total</Text>
          </View>
        </View>

        {/* Filter tabs */}
        <View style={s.filterRow}>
          {['pending', 'replied', 'all'].map(f => (
            <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterBtnActive]} onPress={() => setFilter(f)}>
              <Text style={[s.filterBtnText, filter === f && s.filterBtnTextActive]}>
                {f === 'pending' ? `Pending (${pendingCount})` : f === 'replied' ? 'Replied' : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}
          contentContainerStyle={{ padding: 14 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={52} color={t.textMuted} />
              <Text style={s.emptyTitle}>No feedbacks here</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPending = item.status === 'pending';
            return (
              <View style={[s.card, isPending && s.cardPending]}>
                <View style={s.cardRow}>
                  <View style={[s.userAvatar, { backgroundColor: isPending ? t.warningBg : t.accentBg }]}>
                    <Text style={[s.userAvatarText, { color: isPending ? t.warning : t.accent }]}>
                      {item.user?.name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{item.user?.name || 'User'}</Text>
                    <Text style={s.userEmail}>{item.user?.email}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: isPending ? t.warningBg : t.successBg }]}>
                    <Text style={[s.badgeText, { color: isPending ? t.warning : t.success }]}>
                      {isPending ? 'Pending' : 'Replied'}
                    </Text>
                  </View>
                </View>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardMsg} numberOfLines={2}>{item.message}</Text>
                <Text style={s.cardDate}>{new Date(item.createdAt).toDateString()}</Text>

                {/* Action button */}
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: isPending ? t.accent : t.bgCardAlt, borderColor: isPending ? t.accent : t.border }]}
                  onPress={() => openFeedback(item)}
                >
                  <Ionicons
                    name={isPending ? 'send-outline' : 'eye-outline'}
                    size={14}
                    color={isPending ? '#fff' : t.textSub}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[s.actionBtnText, { color: isPending ? '#fff' : t.textSub }]}>
                    {isPending ? 'Reply' : 'View'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>

      {/* Detail / Reply Modal */}
      {selected && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelected(null)}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={s.modalOverlay}>
              <View style={s.modalBox}>
                {/* Header */}
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Feedback Detail</Text>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <Ionicons name="close" size={22} color={t.textSub} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* User info */}
                  <View style={s.mUserRow}>
                    <View style={[s.mAvatar, { backgroundColor: t.accentBg }]}>
                      <Text style={[s.mAvatarText, { color: t.accent }]}>{selected.user?.name?.charAt(0).toUpperCase() || '?'}</Text>
                    </View>
                    <View>
                      <Text style={s.mUserName}>{selected.user?.name}</Text>
                      <Text style={s.mUserEmail}>{selected.user?.email}</Text>
                    </View>
                    <View style={[s.badge, { marginLeft: 'auto', backgroundColor: selected.status === 'pending' ? t.warningBg : t.successBg }]}>
                      <Text style={[s.badgeText, { color: selected.status === 'pending' ? t.warning : t.success }]}>
                        {selected.status === 'pending' ? 'Pending' : 'Replied'}
                      </Text>
                    </View>
                  </View>

                  {/* Feedback */}
                  <View style={s.mSection}>
                    <Text style={s.mSectionTitle}>Feedback</Text>
                    <Text style={s.mFeedbackTitle}>{selected.title}</Text>
                    <Text style={s.mFeedbackMsg}>{selected.message}</Text>
                    {selected.image ? (
                      <AutoHeightImage uri={`${BASE_URL}/${selected.image}`} style={s.feedbackImage} />
                    ) : null}
                    <Text style={s.mDate}>{new Date(selected.createdAt).toDateString()}</Text>
                  </View>

                  {/* Existing replies */}
                  {selected.replies?.length > 0 && (
                    <View style={s.mSection}>
                      <Text style={s.mSectionTitle}>Replies ({selected.replies.length})</Text>
                      {selected.replies.map((r, i) => (
                        <View key={i} style={[s.replyItem, i > 0 && s.replyItemBorder]}>
                          <Text style={s.replyText}>{r.text}</Text>
                          {r.image ? (
                            <AutoHeightImage uri={`${BASE_URL}/${r.image}`} style={s.replyImage} borderRadius={8} />
                          ) : null}
                          <Text style={s.replyDate}>{r.createdAt ? new Date(r.createdAt).toDateString() : ''}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Legacy reply (before replies array was introduced) */}
                  {(!selected.replies || selected.replies.length === 0) && selected.status === 'replied' && selected.adminReply ? (
                    <View style={s.mSection}>
                      <Text style={s.mSectionTitle}>Reply</Text>
                      <View style={s.replyItem}>
                        <Text style={s.replyText}>{selected.adminReply}</Text>
                        <Text style={s.replyDate}>{selected.repliedAt ? new Date(selected.repliedAt).toDateString() : ''}</Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Add new reply */}
                  <View style={s.mSection}>
                    <Text style={s.mSectionTitle}>{selected.replies?.length > 0 ? 'Add Another Reply' : 'Write a Reply'}</Text>
                    <TextInput
                      style={s.replyInput}
                      placeholder="Type your reply to the user..."
                      placeholderTextColor={t.textMuted}
                      value={replyText}
                      onChangeText={setReplyText}
                      multiline
                      numberOfLines={4}
                    />

                    {/* Image picker */}
                    <TouchableOpacity style={s.imagePickerBtn} onPress={pickReplyImage}>
                      <Ionicons name="image-outline" size={18} color={t.textSub} style={{ marginRight: 8 }} />
                      <Text style={s.imagePickerText}>{replyImage ? 'Change Image' : 'Attach Image (optional)'}</Text>
                    </TouchableOpacity>
                    {replyImage ? (
                      <View style={s.previewContainer}>
                        <AutoHeightImage uri={replyImage} borderRadius={10} />
                        <TouchableOpacity style={s.removeImageBtn} onPress={() => setReplyImage(null)}>
                          <Ionicons name="close-circle" size={26} color={t.danger} />
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      style={[s.replyBtn, replying && { opacity: 0.6 }]}
                      onPress={handleReply}
                      disabled={replying}
                    >
                      {replying ? <ActivityIndicator size="small" color="#fff" /> : (
                        <>
                          <Ionicons name="send-outline" size={16} color="#fff" style={{ marginRight: 8 }} />
                          <Text style={s.replyBtnText}>Send Reply</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  statsBar: { flexDirection: 'row', backgroundColor: t.bgCard, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.border },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: 'bold' },
  statLbl: { fontSize: 10, color: t.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 30, alignSelf: 'center' },
  filterRow: { flexDirection: 'row', backgroundColor: t.bgCard, borderBottomWidth: 1, borderBottomColor: t.border, padding: 10, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: t.bgCardAlt, alignItems: 'center' },
  filterBtnActive: { backgroundColor: t.accent },
  filterBtnText: { fontSize: 12, color: t.textSub, fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
  card: { backgroundColor: t.bgCard, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  cardPending: { borderLeftWidth: 3, borderLeftColor: t.warning },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  userAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  userAvatarText: { fontWeight: 'bold', fontSize: 16 },
  userName: { fontSize: 14, fontWeight: 'bold', color: t.text },
  userEmail: { fontSize: 11, color: t.textMuted },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: t.text, marginBottom: 4 },
  cardMsg: { fontSize: 13, color: t.textSub, lineHeight: 18 },
  cardDate: { fontSize: 10, color: t.textMuted, marginTop: 6, marginBottom: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, alignSelf: 'flex-start' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 16, color: t.textMuted, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: t.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', paddingBottom: 20, borderTopWidth: 1, borderColor: t.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: t.borderLight },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: t.text },
  mUserRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 0 },
  mAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  mAvatarText: { fontWeight: 'bold', fontSize: 20 },
  mUserName: { fontSize: 15, fontWeight: 'bold', color: t.text },
  mUserEmail: { fontSize: 12, color: t.textMuted },
  mSection: { margin: 16, marginTop: 14, backgroundColor: t.bgCardAlt, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border },
  mSectionTitle: { fontSize: 11, fontWeight: 'bold', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  mFeedbackTitle: { fontSize: 16, fontWeight: 'bold', color: t.text, marginBottom: 6 },
  mFeedbackMsg: { fontSize: 14, color: t.textSub, lineHeight: 20 },
  mDate: { fontSize: 10, color: t.textMuted, marginTop: 8 },
  feedbackImage: { marginTop: 10 },
  replyItem: { paddingVertical: 8 },
  replyItemBorder: { borderTopWidth: 1, borderTopColor: t.borderLight },
  replyText: { fontSize: 14, color: t.text, lineHeight: 20 },
  replyImage: { marginTop: 8 },
  replyDate: { fontSize: 10, color: t.textMuted, marginTop: 4 },
  replyInput: { backgroundColor: t.bgInput, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 12, fontSize: 14, color: t.text, minHeight: 100, textAlignVertical: 'top', marginBottom: 10 },
  imagePickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.bgInput, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 10, marginBottom: 10 },
  imagePickerText: { fontSize: 13, color: t.textSub },
  previewContainer: { position: 'relative', marginBottom: 10 },
  removeImageBtn: { position: 'absolute', top: 6, right: 6 },
  replyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent, borderRadius: 10, padding: 13, marginTop: 4 },
  replyBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});

export default AdminFeedbackScreen;
