import React, { useState, useEffect, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Image, FlatList
} from 'react-native';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';

const OpportunityDetailScreen = ({ route, navigation }) => {
  const { opportunityId } = route.params;
  const { user } = useContext(AuthContext);
  const [opportunity, setOpportunity] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreator, setIsCreator] = useState(false);

  const fetchData = async () => {
    try {
      const [oppResponse, feedbackResponse] = await Promise.all([
        api.get(`/api/opportunities/${opportunityId}`),
        api.get(`/api/feedback/opportunity/${opportunityId}`)
      ]);
      setOpportunity(oppResponse.data);
      setFeedback(feedbackResponse.data.feedback || []);
      setIsCreator(oppResponse.data.createdBy?._id === user?.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to load opportunity details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    Alert.alert('Confirm Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/opportunities/${opportunityId}`);
            Alert.alert('Success', 'Opportunity deleted');
            navigation.goBack();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete');
          }
        }
      }
    ]);
  };

  const renderStars = (rating) => {
    let stars = '';
    for (let i = 1; i <= 5; i++) stars += i <= rating ? '⭐' : '☆';
    return stars;
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2e86de" /></View>;
  if (!opportunity) return <View style={styles.centered}><Text>Opportunity not found</Text></View>;

  return (
    <ScrollView style={styles.container}>
      {/* Banner Image */}
      {opportunity.bannerImage ? (
        <Image
          source={{ uri: `https://volunteer-management-system-qux8.onrender.com/${opportunity.bannerImage}` }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
      ) : null}

      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>{opportunity.title}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{opportunity.category}</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Text style={styles.detail}>🏢 {opportunity.organization}</Text>
        <Text style={styles.detail}>📍 {opportunity.location}</Text>
        <Text style={styles.detail}>📅 {new Date(opportunity.date).toDateString()}</Text>
        <Text style={styles.detail}>👥 {opportunity.spotsAvailable} spots available</Text>
        <Text style={styles.detail}>👤 Posted by: {opportunity.createdBy?.name}</Text>
      </View>

      {/* Description */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>About This Opportunity</Text>
        <Text style={styles.description}>{opportunity.description}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {isCreator ? (
          <>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => navigation.navigate('CreatorOpportunityDetail', { opportunityId })}
            >
              <Text style={styles.manageButtonText}>👥 Manage Applications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>Delete Opportunity</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => navigation.navigate('Apply', { opportunity })}
          >
            <Text style={styles.applyButtonText}>Apply Now</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Feedback Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Reviews {feedback.length > 0 ? `(${feedback.length})` : ''}
        </Text>
        {feedback.length === 0 ? (
          <Text style={styles.noFeedbackText}>No reviews yet. Be the first to share your experience!</Text>
        ) : (
          feedback.map((item) => (
            <View key={item._id} style={styles.feedbackItem}>
              <View style={styles.feedbackHeader}>
                <View style={styles.feedbackAvatar}>
                  <Text style={styles.feedbackAvatarText}>
                    {item.volunteer?.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.feedbackName}>{item.volunteer?.name}</Text>
                  <Text style={styles.feedbackStars}>{renderStars(item.rating)}</Text>
                </View>
              </View>
              {item.comment ? <Text style={styles.feedbackComment}>{item.comment}</Text> : null}
              {item.photo ? (
                <Image
                  source={{ uri: `https://volunteer-management-system-qux8.onrender.com/${item.photo}` }}
                  style={styles.feedbackPhoto}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={styles.feedbackDate}>{new Date(item.createdAt).toDateString()}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 15 },
  headerCard: { backgroundColor: '#2e86de', borderRadius: 10, padding: 20, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', flex: 1 },
  categoryBadge: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  detail: { fontSize: 16, color: '#555', marginBottom: 8 },
  description: { fontSize: 16, color: '#555', lineHeight: 24 },
  buttonContainer: { marginBottom: 15 },
  applyButton: { backgroundColor: '#27ae60', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  applyButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  manageButton: { backgroundColor: '#2e86de', borderRadius: 10, padding: 15, alignItems: 'center', marginBottom: 10 },
  manageButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  deleteButton: { backgroundColor: '#e74c3c', borderRadius: 10, padding: 15, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  noFeedbackText: { color: '#999', fontSize: 14, textAlign: 'center', padding: 10 },
  feedbackItem: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 12 },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  feedbackAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2e86de', justifyContent: 'center', alignItems: 'center' },
  feedbackAvatarText: { color: '#fff', fontWeight: 'bold' },
  feedbackName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  feedbackStars: { fontSize: 14 },
  feedbackComment: { fontSize: 14, color: '#555', marginBottom: 8, lineHeight: 20 },
  feedbackPhoto: { width: '100%', height: 200, borderRadius: 10, marginBottom: 8 },
  feedbackDate: { fontSize: 12, color: '#999' }
});

export default OpportunityDetailScreen;