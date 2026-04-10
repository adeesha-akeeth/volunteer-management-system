import React, { useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);

  const currentPhotoUri = user?.profileImage ? `${BASE_URL}/${user.profileImage}` : null;

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        {currentPhotoUri ? (
          <Image source={{ uri: currentPhotoUri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.profileName}>{user?.name}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        {user?.phone ? <Text style={styles.profilePhone}>📞 {user.phone}</Text> : null}
        {user?.bio ? <Text style={styles.profileBio}>{user.bio}</Text> : null}

        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editProfileBtnText}>✏️ Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.publicProfileBtn}
            onPress={() => navigation.navigate('PublisherProfile', { publisherId: user?.id })}
          >
            <Text style={styles.publicProfileBtnText}>👁 Public Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Management */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('ChangePassword')}>
          <Text style={styles.navButtonText}>🔒 Change Password</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* My Activity */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Activity</Text>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('MyApplications')}>
          <Text style={styles.navButtonText}>📋 My Applications</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('MyCreatedOpportunities')}>
          <Text style={styles.navButtonText}>📌 My Created Opportunities</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('AllContributions')}>
          <Text style={styles.navButtonText}>⏱ Manage Contributions</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('FavouritesList')}>
          <Text style={styles.navButtonText}>❤️ My Favourites</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('MyLikesComments')}>
          <Text style={styles.navButtonText}>👍 My Likes & Comments</Text>
          <Text style={styles.navButtonArrow}>→</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  profileHeader: { alignItems: 'center', marginBottom: 20, paddingVertical: 24, backgroundColor: '#fff', borderRadius: 16, elevation: 3, paddingHorizontal: 20 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#2e86de', marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: '#fff' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  profileEmail: { fontSize: 14, color: '#888', marginTop: 4 },
  profilePhone: { fontSize: 14, color: '#555', marginTop: 4 },
  profileBio: { fontSize: 13, color: '#666', marginTop: 10, textAlign: 'center', fontStyle: 'italic', lineHeight: 20, paddingHorizontal: 10 },
  headerBtns: { flexDirection: 'row', gap: 10, marginTop: 14 },
  editProfileBtn: { backgroundColor: '#2e86de', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9 },
  editProfileBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  publicProfileBtn: { backgroundColor: '#f0f4f8', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9, borderWidth: 1, borderColor: '#dee2e6' },
  publicProfileBtnText: { color: '#2e86de', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  navButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, backgroundColor: '#f8f9fa', marginBottom: 8 },
  navButtonText: { fontSize: 15, color: '#333' },
  navButtonArrow: { fontSize: 18, color: '#2e86de', fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#e74c3c', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 30 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

export default ProfileScreen;
