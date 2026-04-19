import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, ScrollView, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../components/Toast';
import { useConfirm } from '../../components/ConfirmModal';
import AutoHeightImage from '../../components/AutoHeightImage';
import api from '../../api';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const FeedbackScreen = () => {
  const t = useTheme();
  const toast = useToast();
  const confirm = useConfirm();

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fTitle, setFTitle] = useState('');
  const [fMessage, setFMessage] = useState('');
  const [fImage, setFImage] = useState(null);         // new local image URI
  const [existingImage, setExistingImage] = useState(null); // current saved image path
  const [removeImg, setRemoveImg] = useState(false);  // flag to remove existing image
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/user-feedback/my');
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

  const openCreate = () => {
    setEditingId(null);
    setFTitle('');
    setFMessage('');
    setFImage(null);
    setExistingImage(null);
    setRemoveImg(false);
    setModalVisible(true);
  };

  const openEdit = (fb) => {
    setEditingId(fb._id);
    setFTitle(fb.title);
    setFMessage(fb.message);
    setFImage(null);
    setExistingImage(fb.image || null);
    setRemoveImg(false);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setFImage(result.assets[0].uri);
      setRemoveImg(false);
    }
  };

  const removeNewImage = () => { setFImage(null); };

  const removeExistingImage = () => {
    setExistingImage(null);
    setRemoveImg(true);
  };

  const handleSubmit = async () => {
    if (!fTitle.trim() || !fMessage.trim()) {
      toast.error('Required', 'Please fill in title and message');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', fTitle.trim());
      formData.append('message', fMessage.trim());

      if (fImage) {
        formData.append('image', { uri: fImage, type: 'image/jpeg', name: 'feedback.jpg' });
      } else if (editingId && removeImg) {
        formData.append('removeImage', 'true');
      }

      if (editingId) {
        const res = await api.put(`/api/user-feedback/${editingId}`, formData);
        setFeedbacks(prev => prev.map(f => f._id === editingId ? res.data : f));
        toast.success('Updated', 'Feedback updated successfully');
      } else {
        const res = await api.post('/api/user-feedback', formData);
        setFeedbacks(prev => [res.data, ...prev]);
        toast.success('Sent', 'Feedback submitted! Admin will review it.');
      }
      setModalVisible(false);
    } catch (e) {
      toast.error('Error', e.response?.data?.message || 'Failed to save feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    confirm.show({
      title: 'Delete Feedback',
      message: 'Delete this feedback?',
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        try {
          await api.delete(`/api/user-feedback/${id}`);
          setFeedbacks(prev => prev.filter(f => f._id !== id));
          toast.success('Deleted', 'Feedback removed');
        } catch (e) {
          toast.error('Error', e.response?.data?.message || 'Failed to delete');
        }
      }
    });
  };

  const s = makeStyles(t);

  // Determine what image to show in preview area of modal
  const previewUri = fImage || (existingImage && !removeImg ? `${BASE_URL}/${existingImage}` : null);
  const hasImage = !!previewUri;

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={t.accent} /></View>;

  return (
    <>
      <View style={s.container}>
        <FlatList
          data={feedbacks}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}
          contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
          ListHeaderComponent={
            <TouchableOpacity style={s.newBtn} onPress={openCreate}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.newBtnText}>New Feedback</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={52} color={t.textMuted} />
              <Text style={s.emptyTitle}>No Feedback Yet</Text>
              <Text style={s.emptySub}>Share your thoughts or report an issue with the admin.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isPending = item.status === 'pending';
            const replies = item.replies?.length > 0
              ? item.replies
              : (item.adminReply ? [{ text: item.adminReply, image: '', createdAt: item.repliedAt }] : []);
            return (
              <View style={[s.card, !isPending && s.cardReplied]}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{item.title}</Text>
                    <Text style={s.cardDate}>{new Date(item.createdAt).toDateString()}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: isPending ? t.warningBg : t.successBg }]}>
                    <Text style={[s.badgeText, { color: isPending ? t.warning : t.success }]}>
                      {isPending ? 'Pending' : 'Replied'}
                    </Text>
                  </View>
                </View>

                <Text style={s.cardMessage}>{item.message}</Text>

                {item.image ? (
                  <AutoHeightImage
                    uri={`${BASE_URL}/${item.image}`}
                    style={s.feedbackImage}
                  />
                ) : null}

                {!isPending && replies.length > 0 ? (
                  <View style={s.replyBox}>
                    <View style={s.replyHeader}>
                      <Ionicons name="shield-checkmark-outline" size={14} color={t.accent} style={{ marginRight: 5 }} />
                      <Text style={s.replyLabel}>Admin {replies.length > 1 ? `Replies (${replies.length})` : 'Reply'}</Text>
                    </View>
                    {replies.map((r, i) => (
                      <View key={i} style={[s.replyEntry, i > 0 && s.replyEntryBorder]}>
                        <Text style={s.replyText}>{r.text}</Text>
                        {r.image ? (
                          <AutoHeightImage
                            uri={`${BASE_URL}/${r.image}`}
                            style={s.replyImage}
                          />
                        ) : null}
                        <Text style={s.replyDate}>{r.createdAt ? new Date(r.createdAt).toDateString() : ''}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {isPending && (
                  <View style={s.cardActions}>
                    <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
                      <Ionicons name="pencil-outline" size={14} color={t.accent} style={{ marginRight: 4 }} />
                      <Text style={[s.editBtnText, { color: t.accent }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item._id)}>
                      <Ionicons name="trash-outline" size={14} color={t.danger} style={{ marginRight: 4 }} />
                      <Text style={[s.editBtnText, { color: t.danger }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      </View>

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={s.modalBox} pointerEvents="box-none">
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingId ? 'Edit Feedback' : 'New Feedback'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={t.textSub} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={s.inputLabel}>Title</Text>
              <TextInput
                style={s.input}
                placeholder="Brief summary of your feedback"
                placeholderTextColor={t.textMuted}
                value={fTitle}
                onChangeText={setFTitle}
              />
              <Text style={s.inputLabel}>Message</Text>
              <TextInput
                style={[s.input, s.textArea]}
                placeholder="Describe your feedback, suggestion or issue in detail..."
                placeholderTextColor={t.textMuted}
                value={fMessage}
                onChangeText={setFMessage}
                multiline
                numberOfLines={5}
              />

              <Text style={s.inputLabel}>Attachment (optional)</Text>
              <TouchableOpacity style={s.imagePickerBtn} onPress={pickImage}>
                <Ionicons name="image-outline" size={18} color={t.textSub} style={{ marginRight: 8 }} />
                <Text style={s.imagePickerText}>{hasImage ? 'Replace Image' : 'Add a screenshot or photo'}</Text>
              </TouchableOpacity>

              {hasImage ? (
                <View style={s.previewContainer}>
                  <AutoHeightImage uri={previewUri} borderRadius={10} />
                  <TouchableOpacity
                    style={s.removeImageBtn}
                    onPress={fImage ? removeNewImage : removeExistingImage}
                  >
                    <Ionicons name="close-circle" size={26} color={t.danger} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity style={[s.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.submitBtnText}>{editingId ? 'Save Changes' : 'Submit Feedback'}</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent, borderRadius: 12, padding: 14, marginBottom: 14 },
  newBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  card: { backgroundColor: t.bgCard, borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: t.border },
  cardReplied: { borderColor: t.success + '40', borderLeftWidth: 3, borderLeftColor: t.success },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: t.text },
  cardDate: { fontSize: 11, color: t.textMuted, marginTop: 2 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  cardMessage: { fontSize: 13, color: t.textSub, lineHeight: 19, marginBottom: 10 },
  feedbackImage: { marginBottom: 10 },
  replyBox: { backgroundColor: t.accentBg, borderRadius: 10, padding: 12, borderLeftWidth: 2, borderLeftColor: t.accent },
  replyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  replyLabel: { fontSize: 12, fontWeight: 'bold', color: t.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  replyEntry: { paddingVertical: 6 },
  replyEntryBorder: { borderTopWidth: 1, borderTopColor: t.accent + '30', marginTop: 6 },
  replyText: { fontSize: 13, color: t.text, lineHeight: 19 },
  replyImage: { marginTop: 6 },
  replyDate: { fontSize: 10, color: t.textMuted, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: t.borderLight },
  editBtn: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, borderWidth: 1, borderColor: t.accent, paddingHorizontal: 12 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', padding: 6, borderRadius: 8, borderWidth: 1, borderColor: t.danger, paddingHorizontal: 12 },
  editBtnText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: t.text, marginTop: 14 },
  emptySub: { fontSize: 13, color: t.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBox: { backgroundColor: t.bgCard, borderRadius: 18, width: '100%', maxHeight: '85%', paddingBottom: 10, borderWidth: 1, borderColor: t.border },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: t.borderLight },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: t.text },
  inputLabel: { fontSize: 13, fontWeight: '600', color: t.textSub, marginTop: 14, marginBottom: 6, marginHorizontal: 16 },
  input: { marginHorizontal: 16, backgroundColor: t.bgInput, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 12, fontSize: 14, color: t.text },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  imagePickerBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: t.bgInput, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 12, marginBottom: 4 },
  imagePickerText: { fontSize: 13, color: t.textSub },
  previewContainer: { position: 'relative', marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
  removeImageBtn: { position: 'absolute', top: 6, right: 6 },
  submitBtn: { margin: 16, marginTop: 20, backgroundColor: t.accent, borderRadius: 12, padding: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});

export default FeedbackScreen;
