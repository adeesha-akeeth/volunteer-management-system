import React, { useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const t = useTheme();
  const isAdmin = user?.role === 'admin';
  const s = makeStyles(t);

  const currentPhotoUri = user?.profileImage ? `${BASE_URL}/${user.profileImage}` : null;

  const NavRow = ({ icon, label, onPress, color }) => (
    <TouchableOpacity style={s.navButton} onPress={onPress}>
      <View style={s.navLeft}>
        <Ionicons name={icon} size={18} color={color || t.accent} style={{ marginRight: 10 }} />
        <Text style={s.navButtonText}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={s.container}>
      {/* Profile Header */}
      <View style={s.profileHeader}>
        {currentPhotoUri ? (
          <Image source={{ uri: currentPhotoUri }} style={s.avatarImage} />
        ) : (
          <View style={s.avatar}>
            <Text style={s.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        {isAdmin && (
          <View style={s.adminBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#fff" style={{ marginRight: 4 }} />
            <Text style={s.adminBadgeText}>Administrator</Text>
          </View>
        )}
        <Text style={s.profileName}>{user?.name}</Text>
        <Text style={s.profileEmail}>{user?.email}</Text>
        {user?.phone ? <Text style={s.profilePhone}>{user.phone}</Text> : null}
        {user?.bio ? <Text style={s.profileBio}>{user.bio}</Text> : null}

        {!isAdmin && (
          <View style={s.headerBtns}>
            <TouchableOpacity style={s.editProfileBtn} onPress={() => navigation.navigate('EditProfile')}>
              <Ionicons name="pencil-outline" size={14} color="#fff" style={{ marginRight: 5 }} />
              <Text style={s.editProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.publicProfileBtn} onPress={() => navigation.navigate('PublisherProfile', { publisherId: user?.id })}>
              <Ionicons name="eye-outline" size={14} color={t.accent} style={{ marginRight: 5 }} />
              <Text style={s.publicProfileBtnText}>Public Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Account */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Account</Text>
        <NavRow icon="lock-closed-outline" label="Change Password" onPress={() => navigation.navigate('ChangePassword')} />
      </View>

      {/* My Activity — non-admin only */}
      {!isAdmin && (
        <View style={s.card}>
          <Text style={s.cardTitle}>My Activity</Text>
          <NavRow icon="document-text-outline" label="My Applications" onPress={() => navigation.navigate('MyApplications')} />
          <NavRow icon="briefcase-outline" label="My Created Opportunities" onPress={() => navigation.navigate('MyCreatedOpportunities')} />
          <NavRow icon="heart-outline" label="My Favourites" onPress={() => navigation.navigate('FavouritesList')} color={t.danger} />
          <NavRow icon="thumbs-up-outline" label="My Likes & Comments" onPress={() => navigation.navigate('MyLikesComments')} />
          <NavRow icon="checkmark-circle-outline" label="Verify Contributions" onPress={() => navigation.navigate('AllContributions')} color={t.success} />
          <NavRow icon="chatbubble-ellipses-outline" label="My Feedback" onPress={() => navigation.navigate('Feedback')} color={t.purple} />
        </View>
      )}

      <TouchableOpacity style={s.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={s.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, padding: 15 },
  profileHeader: { alignItems: 'center', marginBottom: 16, paddingVertical: 24, backgroundColor: t.bgCard, borderRadius: 16, elevation: t.elevation, paddingHorizontal: 20, borderWidth: 1, borderColor: t.border },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: t.accent, marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
  adminBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  adminBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: t.text },
  profileEmail: { fontSize: 14, color: t.textMuted, marginTop: 4 },
  profilePhone: { fontSize: 14, color: t.textSub, marginTop: 4 },
  profileBio: { fontSize: 13, color: t.textSub, marginTop: 10, textAlign: 'center', fontStyle: 'italic', lineHeight: 20, paddingHorizontal: 10 },
  headerBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.accent, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9 },
  editProfileBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  publicProfileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.bgCardAlt, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9, borderWidth: 1, borderColor: t.border },
  publicProfileBtnText: { color: t.accent, fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: t.bgCard, borderRadius: 12, padding: 16, marginBottom: 14, elevation: t.elevation, borderWidth: 1, borderColor: t.border },
  cardTitle: { fontSize: 13, fontWeight: 'bold', color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  navButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, borderRadius: 10, backgroundColor: t.bgCardAlt, marginBottom: 8 },
  navLeft: { flexDirection: 'row', alignItems: 'center' },
  navButtonText: { fontSize: 15, color: t.text },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: t.danger, borderRadius: 12, padding: 16, marginBottom: 30 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ProfileScreen;
