import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator,
  RefreshControl, Image, Modal, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../components/Toast';
import api from '../../api';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const BASE_URL = 'https://volunteer-management-system-qux8.onrender.com';

const CATEGORIES = [
  { key: '', label: 'All', icon: '🌐' },
  { key: 'education', label: 'Education', icon: '🎓' },
  { key: 'environment', label: 'Environment', icon: '🌿' },
  { key: 'health', label: 'Health', icon: '🏥' },
  { key: 'community', label: 'Community', icon: '🤝' },
  { key: 'animals', label: 'Animals', icon: '🐾' },
  { key: 'other', label: 'Other', icon: '📦' },
];

const OpportunityListScreen = ({ navigation }) => {
  const toast = useToast();
  const t = useTheme();
  const isAdmin = useContext(AuthContext).user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('home');
  const [allOpportunities, setAllOpportunities] = useState([]); // full list from API
  const [opportunities, setOpportunities] = useState([]);       // filtered list
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);          // subtle tab switch indicator
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useContext(AuthContext);

  // Favourites modal
  const [favModalVisible, setFavModalVisible] = useState(false);
  const [favLists, setFavLists] = useState([]);
  const [pendingFavOpp, setPendingFavOpp] = useState(null);
  const [favLoading, setFavLoading] = useState(false);

  const applyLocalFilter = useCallback((all, searchTerm, category) => {
    let filtered = all;
    if (category) filtered = filtered.filter(o => o.category === category);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(o =>
        o.title?.toLowerCase().includes(lower) ||
        o.organization?.toLowerCase().includes(lower) ||
        o.createdBy?.name?.toLowerCase().includes(lower) ||
        o.description?.toLowerCase().includes(lower) ||
        o.location?.toLowerCase().includes(lower)
      );
    }
    return filtered;
  }, []);

  const fetchOpportunities = useCallback(async (tab = 'home', searchTerm = '', category = '', isTabSwitch = false) => {
    try {
      const sort = tab === 'popular' ? 'popular' : tab === 'toprated' ? 'toprated' : '';
      let url = `/api/opportunities?`;
      if (sort) url += `sort=${sort}`;
      const response = await api.get(url);
      setAllOpportunities(response.data);
      setOpportunities(applyLocalFilter(response.data, searchTerm, category));
    } catch {
      toast.error('Error', 'Failed to load opportunities');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setTabLoading(false);
    }
  }, [applyLocalFilter]);

  const isMounted = useRef(false);

  useEffect(() => {
    // Only show full loading on first mount
    if (!isMounted.current) setLoading(true);
    fetchOpportunities(activeTab, search, selectedCategory);
  }, [activeTab]);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/api/notifications');
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  };

  // Auto-refresh opportunities and unread count whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (isMounted.current) {
        fetchOpportunities(activeTab, search, selectedCategory);
      } else {
        isMounted.current = true;
      }
      fetchUnreadCount();
    }, [activeTab])
  );

  const handleSearch = (text) => {
    setSearch(text);
    setOpportunities(applyLocalFilter(allOpportunities, text, selectedCategory));
  };

  const handleCategory = (cat) => {
    setSelectedCategory(cat);
    setOpportunities(applyLocalFilter(allOpportunities, search, cat));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOpportunities(activeTab, search, selectedCategory);
  };

  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    setSearch('');
    setSelectedCategory('');
    // Show subtle loading indicator instead of full blank screen
    setTabLoading(true);
    setActiveTab(tab);
  };

  const handleVote = async (item, vote) => {
    // Optimistic update
    const prevVote = item.userVote;
    let newLikes = item.likes || 0;
    let newDislikes = item.dislikes || 0;
    let newUserVote = vote;

    if (prevVote === vote) {
      // toggle off
      if (vote === 'like') newLikes = Math.max(0, newLikes - 1);
      else newDislikes = Math.max(0, newDislikes - 1);
      newUserVote = null;
    } else {
      if (prevVote === 'like') newLikes = Math.max(0, newLikes - 1);
      else if (prevVote === 'dislike') newDislikes = Math.max(0, newDislikes - 1);
      if (vote === 'like') newLikes += 1;
      else newDislikes += 1;
    }

    const updateFn = (prev) => prev.map(o => o._id === item._id
      ? { ...o, likes: newLikes, dislikes: newDislikes, userVote: newUserVote }
      : o
    );
    setOpportunities(updateFn);
    setAllOpportunities(prev => prev.map(o => o._id === item._id
      ? { ...o, likes: newLikes, dislikes: newDislikes, userVote: newUserVote }
      : o
    ));

    try {
      const res = await api.post('/api/votes', { targetId: item._id, targetType: 'opportunity', vote });
      setOpportunities(prev => prev.map(o => o._id === item._id
        ? { ...o, likes: res.data.likes, dislikes: res.data.dislikes, userVote: res.data.userVote }
        : o
      ));
      setAllOpportunities(prev => prev.map(o => o._id === item._id
        ? { ...o, likes: res.data.likes, dislikes: res.data.dislikes, userVote: res.data.userVote }
        : o
      ));
    } catch {
      // Revert on error
      setOpportunities(prev => prev.map(o => o._id === item._id
        ? { ...o, likes: item.likes, dislikes: item.dislikes, userVote: item.userVote }
        : o
      ));
      setAllOpportunities(prev => prev.map(o => o._id === item._id
        ? { ...o, likes: item.likes, dislikes: item.dislikes, userVote: item.userVote }
        : o
      ));
    }
  };

  const handleAddToFavourites = async (opportunity) => {
    setPendingFavOpp(opportunity);
    setFavLoading(true);
    setFavModalVisible(true);
    try {
      const res = await api.get('/api/favourites');
      setFavLists(res.data);
    } catch {
      toast.error('Error', 'Failed to load your lists');
      setFavModalVisible(false);
    } finally {
      setFavLoading(false);
    }
  };

  const addToList = async (listId) => {
    setFavModalVisible(false);
    try {
      await api.post(`/api/favourites/${listId}/add`, { opportunityId: pendingFavOpp._id });
      toast.success('Added!', `"${pendingFavOpp.title}" saved to your list.`);
    } catch (error) {
      toast.error('Error', error.response?.data?.message || 'Failed to add');
    }
  };

  const createDefaultAndAdd = async () => {
    setFavModalVisible(false);
    try {
      const res = await api.post('/api/favourites', { name: 'Favourites', description: 'My saved opportunities' });
      await api.post(`/api/favourites/${res.data._id}/add`, { opportunityId: pendingFavOpp._id });
      toast.success('Saved!', `Created "Favourites" list and added "${pendingFavOpp.title}".`);
    } catch {
      toast.error('Error', 'Failed to save');
    }
  };

  const s = makeStyles(t);

  const renderItem = ({ item }) => {
    const isOwn = item.createdBy?._id === user?.id || item.createdBy?.id === user?.id;
    const hasFundraisers = item.fundraisers?.length > 0;
    const likeActive = item.userVote === 'like';
    const dislikeActive = item.userVote === 'dislike';

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item._id })}
        activeOpacity={0.8}
      >
        {item.bannerImage ? (
          <Image source={{ uri: `${BASE_URL}/${item.bannerImage}` }} style={s.cardImage} resizeMode="cover" />
        ) : (
          <View style={s.cardImagePlaceholder}><Ionicons name="globe-outline" size={28} color={t.textMuted} /></View>
        )}

        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <View style={s.categoryBadge}><Text style={s.categoryText}>{item.category}</Text></View>
            {item.averageRating && (
              <View style={s.ratingBadge}>
                <Text style={s.ratingText}>⭐ {item.averageRating}</Text>
              </View>
            )}
          </View>
          {isOwn && <View style={s.ownBadge}><Text style={s.ownBadgeText}>Your Post</Text></View>}
        </View>

        <Text style={s.cardTitle}>{item.title}</Text>
        {item.createdBy && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); navigation.navigate('PublisherProfile', { publisherId: item.createdBy._id }); }}
            style={s.publisherRow}
          >
            {item.createdBy.profileImage ? (
              <Image source={{ uri: `${BASE_URL}/${item.createdBy.profileImage}` }} style={s.publisherThumb} />
            ) : (
              <View style={s.publisherThumbPlaceholder}>
                <Text style={s.publisherThumbText}>{item.createdBy.name?.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <Text style={s.publisherName}>{item.createdBy.name}</Text>
          </TouchableOpacity>
        )}
        {item.organization ? (
          <View style={s.cardDetailRow}>
            <Ionicons name="business-outline" size={13} color={t.textMuted} style={{ marginRight: 4 }} />
            <Text style={s.cardDetail}>{item.organization}</Text>
          </View>
        ) : null}
        <View style={s.cardDetailRow}>
          <Ionicons name="location-outline" size={13} color={t.textMuted} style={{ marginRight: 4 }} />
          <Text style={s.cardDetail}>{item.location}</Text>
        </View>
        <View style={s.cardDetailRow}>
          <Ionicons name="calendar-outline" size={13} color={t.textMuted} style={{ marginRight: 4 }} />
          <Text style={s.cardDetail}>
            {item.startDate
              ? `${new Date(item.startDate).toDateString()} — ${new Date(item.endDate).toDateString()}`
              : 'Date not set'}
          </Text>
        </View>

        {hasFundraisers && item.fundraisers.map(fr => {
          const pct = fr.targetAmount > 0 ? Math.min(100, Math.round((fr.collectedAmount / fr.targetAmount) * 100)) : 0;
          return (
            <View key={fr._id} style={s.fundraiserMini}>
              <View style={s.fundraiserMiniRow}>
                <Text style={s.fundraiserMiniName}>{fr.name}</Text>
                {fr.status === 'completed' && <Text style={s.fundraiserMiniDone}>✓ Done</Text>}
              </View>
              <View style={s.fundraiserMiniBarBg}>
                <View style={[s.fundraiserMiniBarFill, { width: `${pct}%`, backgroundColor: fr.status === 'completed' ? '#888' : t.success }]} />
              </View>
              <Text style={s.fundraiserMiniPct}>{pct}% · LKR {fr.collectedAmount.toLocaleString()} / {fr.targetAmount.toLocaleString()}</Text>
            </View>
          );
        })}

        <View style={s.cardFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="people-outline" size={14} color={t.success} style={{ marginRight: 4 }} />
            <Text style={s.cardSpots}>{item.spotsAvailable} spots</Text>
          </View>
          <View style={s.footerRight}>
            <TouchableOpacity
              style={[s.voteBtn, likeActive && s.voteBtnLikeActive]}
              onPress={(e) => { e.stopPropagation?.(); handleVote(item, 'like'); }}
            >
              <Ionicons name="thumbs-up-outline" size={13} color={likeActive ? t.accent : t.textMuted} style={{ marginRight: 3 }} />
              <Text style={s.voteBtnText}>{item.likes || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.voteBtn, dislikeActive && s.voteBtnDislikeActive]}
              onPress={(e) => { e.stopPropagation?.(); handleVote(item, 'dislike'); }}
            >
              <Ionicons name="thumbs-down-outline" size={13} color={dislikeActive ? t.danger : t.textMuted} style={{ marginRight: 3 }} />
              <Text style={s.voteBtnText}>{item.dislikes || 0}</Text>
            </TouchableOpacity>

            {!isAdmin && (
              <TouchableOpacity style={s.heartButton} onPress={(e) => { e.stopPropagation?.(); handleAddToFavourites(item); }}>
                <Ionicons name="heart" size={15} color={t.danger} />
              </TouchableOpacity>
            )}
            <View style={[s.applyBadge, isOwn && s.applyBadgeOwn]}>
              <Text style={s.applyBadgeText}>{isOwn || isAdmin ? 'View' : 'View & Apply'}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = () => (
    <>
      {activeTab === 'home' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryScroll} contentContainerStyle={s.categoryScrollContent}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[s.categoryChip, selectedCategory === cat.key && s.categoryChipActive]}
              onPress={() => handleCategory(cat.key)}
            >
              <Text style={s.categoryChipIcon}>{cat.icon}</Text>
              <Text style={[s.categoryChipLabel, selectedCategory === cat.key && s.categoryChipLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>
          {activeTab === 'home' ? 'Opportunities' : activeTab === 'popular' ? 'Most Popular' : 'Top Rated'}
        </Text>
        <Text style={s.sectionCount}>{opportunities.length} found</Text>
      </View>
    </>
  );

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color={t.accent} /></View>;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.welcomeText}>Hello, {user?.name}! {isAdmin ? '🛡️' : '👋'}</Text>
          <Text style={s.headerSubtitle}>{isAdmin ? 'Admin Dashboard' : 'Find your next volunteer opportunity'}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={s.bellButton}>
          <Ionicons name="notifications-outline" size={24} color={t.textSub} />
          {unreadCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={logout} style={s.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={t.danger} />
        </TouchableOpacity>
      </View>

      {/* Admin panel — 2 quick-action cards */}
      {isAdmin && (
        <View style={s.adminPanel}>
          <TouchableOpacity style={[s.adminCard, { borderLeftColor: t.accent }]} onPress={() => navigation.navigate('AdminAnalysis')}>
            <View style={[s.adminCardIcon, { backgroundColor: t.accentBg }]}>
              <Ionicons name="bar-chart-outline" size={22} color={t.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.adminCardTitle}>Platform Analytics</Text>
              <Text style={s.adminCardSub}>Users, opportunities & points</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.adminCard, { borderLeftColor: t.warning }]} onPress={() => navigation.navigate('AdminFeedback')}>
            <View style={[s.adminCardIcon, { backgroundColor: t.warningBg }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={t.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.adminCardTitle}>Feedbacks & Queries</Text>
              <Text style={s.adminCardSub}>View and reply to user feedback</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Search bar — only on Home tab, not for admin */}
      {activeTab === 'home' && !isAdmin && (
        <View style={s.searchContainer}>
          <Ionicons name="search-outline" size={20} color={t.textMuted} style={s.searchIcon} />
          <TextInput style={s.searchInput} placeholderTextColor={t.textMuted} placeholder="Search opportunities..." value={search} onChangeText={handleSearch} />
        </View>
      )}

      {/* Search bar for admin */}
      {activeTab === 'home' && isAdmin && (
        <View style={s.searchContainer}>
          <Ionicons name="search-outline" size={20} color={t.textMuted} style={s.searchIcon} />
          <TextInput style={s.searchInput} placeholderTextColor={t.textMuted} placeholder="Search opportunities..." value={search} onChangeText={handleSearch} />
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabBar}>
        {[
          { key: 'home', label: 'Home', icon: 'home-outline' },
          { key: 'popular', label: 'Popular', icon: 'flame-outline' },
          { key: 'toprated', label: 'Top Rated', icon: 'star-outline' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, activeTab === tab.key && s.tabActive]}
            onPress={() => handleTabChange(tab.key)}
          >
            <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? t.accent : t.textMuted} />
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!isAdmin && (
        <TouchableOpacity style={s.createButton} onPress={() => navigation.navigate('CreateOpportunity')}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={s.createButtonText}>Post New Opportunity</Text>
        </TouchableOpacity>
      )}

      {tabLoading && (
        <View style={s.tabLoadingBar}>
          <ActivityIndicator size="small" color={t.accent} />
          <Text style={s.tabLoadingText}>Loading...</Text>
        </View>
      )}

      <FlatList
        data={opportunities}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color={t.border} />
            <Text style={s.emptyText}>No opportunities found</Text>
            <Text style={s.emptySubText}>Be the first to post one!</Text>
          </View>
        }
      />

      {/* Favourites list picker modal */}
      {!isAdmin && (
        <Modal visible={favModalVisible} transparent animationType="slide" onRequestClose={() => setFavModalVisible(false)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setFavModalVisible(false)}>
            <View style={s.favModal} onStartShouldSetResponder={() => true}>
              <View style={s.favModalHandle} />
              <Text style={s.favModalTitle}>Save to Favourites</Text>
              {pendingFavOpp && <Text style={s.favModalOppTitle} numberOfLines={1}>{pendingFavOpp.title}</Text>}

              {favLoading ? (
                <ActivityIndicator color={t.danger} style={{ marginVertical: 20 }} />
              ) : favLists.length === 0 ? (
                <View style={s.noListsContainer}>
                  <Text style={s.noListsText}>You don't have any lists yet.</Text>
                  <Text style={s.noListsSubText}>Create a favourites list first before saving opportunities.</Text>
                  <TouchableOpacity style={s.favActionBtn} onPress={() => { setFavModalVisible(false); navigation.navigate('Favourites'); }}>
                    <Text style={s.favActionBtnText}>Go to My Favourites to create a list</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={s.favModalHint}>Choose a list:</Text>
                  {favLists.map(list => (
                    <TouchableOpacity key={list._id} style={s.favListItem} onPress={() => addToList(list._id)}>
                      <View style={s.favListIcon}><Text>❤️</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.favListName}>{list.name}</Text>
                        <Text style={s.favListCount}>{list.opportunities?.length || 0} saved</Text>
                      </View>
                      <Text style={s.favListArrow}>→</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={s.favNewListBtn} onPress={() => { setFavModalVisible(false); navigation.navigate('Favourites'); }}>
                    <Text style={s.favNewListBtnText}>+ Create New List</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={s.favCancelBtn} onPress={() => setFavModalVisible(false)}>
                <Text style={s.favCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const makeStyles = (t) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, paddingHorizontal: 15, paddingTop: 15 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  welcomeText: { fontSize: 20, fontWeight: 'bold', color: t.text },
  headerSubtitle: { fontSize: 13, color: t.textMuted, marginTop: 2 },
  bellButton: { padding: 5, marginRight: 4, position: 'relative' },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: t.danger, borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  logoutButton: { padding: 5 },
  // Admin panel
  adminPanel: { marginBottom: 12, gap: 8 },
  adminCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.bgCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: t.border, borderLeftWidth: 4, gap: 12 },
  adminCardIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  adminCardTitle: { fontSize: 14, fontWeight: 'bold', color: t.text },
  adminCardSub: { fontSize: 12, color: t.textMuted, marginTop: 2 },
  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.bgCard, borderRadius: 12, paddingHorizontal: 12, marginBottom: 10, borderWidth: 1, borderColor: t.border, elevation: 1 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, padding: 12, fontSize: 16, color: t.text },
  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: t.bgCard, borderRadius: 12, marginBottom: 10, elevation: 2, overflow: 'hidden', borderWidth: 1, borderColor: t.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 5 },
  tabActive: { borderBottomWidth: 3, borderBottomColor: t.accent, backgroundColor: t.accentBg },
  tabLabel: { fontSize: 13, color: t.textMuted, fontWeight: '600' },
  tabLabelActive: { color: t.accent },
  // Category chips
  categoryScroll: { marginBottom: 10 },
  categoryScrollContent: { paddingRight: 10, gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.bgCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5, borderColor: t.border, gap: 5, elevation: 1 },
  categoryChipActive: { backgroundColor: t.accent, borderColor: t.accent },
  categoryChipIcon: { fontSize: 16 },
  categoryChipLabel: { fontSize: 13, color: t.textSub, fontWeight: '600' },
  categoryChipLabelActive: { color: '#fff' },
  createButton: { backgroundColor: t.accent, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  createButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: t.text },
  sectionCount: { fontSize: 13, color: t.textMuted },
  // Card
  publisherRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  publisherThumb: { width: 22, height: 22, borderRadius: 11 },
  publisherThumbPlaceholder: { width: 22, height: 22, borderRadius: 11, backgroundColor: t.bgCardAlt, justifyContent: 'center', alignItems: 'center' },
  publisherThumbText: { fontSize: 11, fontWeight: 'bold', color: t.textSub },
  publisherName: { fontSize: 12, color: t.accent, fontWeight: '600' },
  noListsSubText: { fontSize: 13, color: t.textMuted, textAlign: 'center', marginBottom: 16, marginTop: 6 },
  card: { backgroundColor: t.bgCard, borderRadius: 12, padding: 15, marginBottom: 12, elevation: 3, borderLeftWidth: 4, borderLeftColor: t.accent, borderWidth: 1, borderColor: t.border },
  cardImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 10 },
  cardImagePlaceholder: { width: '100%', height: 90, borderRadius: 8, marginBottom: 10, backgroundColor: t.accentBg, justifyContent: 'center', alignItems: 'center' },
  cardDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  categoryBadge: { backgroundColor: t.accentBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { color: t.accent, fontSize: 11, fontWeight: 'bold', textTransform: 'capitalize' },
  ratingBadge: { backgroundColor: t.warningBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ratingText: { color: t.warning, fontSize: 11, fontWeight: 'bold' },
  ownBadge: { backgroundColor: t.accentBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ownBadgeText: { color: t.accent, fontSize: 11, fontWeight: 'bold' },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: t.text, marginBottom: 7 },
  cardDetail: { color: t.textSub, marginBottom: 3, fontSize: 13 },
  fundraiserMini: { backgroundColor: t.successBg, borderRadius: 6, padding: 8, marginTop: 6, marginBottom: 2 },
  fundraiserMiniRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  fundraiserMiniName: { fontSize: 11, fontWeight: 'bold', color: t.success },
  fundraiserMiniDone: { fontSize: 10, color: t.textMuted, fontWeight: 'bold' },
  fundraiserMiniBarBg: { height: 5, backgroundColor: t.border, borderRadius: 3, overflow: 'hidden', marginBottom: 3 },
  fundraiserMiniBarFill: { height: '100%', borderRadius: 3 },
  fundraiserMiniPct: { fontSize: 10, color: t.textMuted },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 6 },
  cardSpots: { color: t.success, fontWeight: 'bold', fontSize: 13 },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  voteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.bgCardAlt, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: t.border },
  voteBtnLikeActive: { backgroundColor: t.accentBg, borderColor: t.accent },
  voteBtnDislikeActive: { backgroundColor: t.dangerBg, borderColor: t.danger },
  voteBtnText: { fontSize: 12, color: t.textSub, fontWeight: '600' },
  heartButton: { backgroundColor: t.dangerBg, borderRadius: 18, padding: 6 },
  applyBadge: { backgroundColor: t.accent, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 5 },
  applyBadgeOwn: { backgroundColor: t.textMuted },
  applyBadgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  tabLoadingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 8, backgroundColor: t.accentBg, borderRadius: 8, marginBottom: 6 },
  tabLoadingText: { fontSize: 12, color: t.accent, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: t.text, marginTop: 15 },
  emptySubText: { fontSize: 14, color: t.textMuted, marginTop: 5 },
  // Favourites modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  favModal: { backgroundColor: t.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30, borderTopWidth: 1, borderColor: t.border },
  favModalHandle: { width: 40, height: 4, backgroundColor: t.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  favModalTitle: { fontSize: 20, fontWeight: 'bold', color: t.text, marginBottom: 4 },
  favModalOppTitle: { fontSize: 14, color: t.textMuted, marginBottom: 16 },
  favModalHint: { fontSize: 13, color: t.textMuted, marginBottom: 8 },
  noListsContainer: { alignItems: 'center', paddingVertical: 10 },
  noListsText: { color: t.textMuted, fontSize: 15, marginBottom: 16 },
  favActionBtn: { backgroundColor: t.danger, borderRadius: 10, padding: 14, alignItems: 'center', width: '100%', marginBottom: 10 },
  favActionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  favListItem: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: t.bgCardAlt, borderRadius: 10, marginBottom: 8 },
  favListIcon: { width: 36, height: 36, backgroundColor: t.dangerBg, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  favListName: { fontSize: 15, fontWeight: 'bold', color: t.text },
  favListCount: { fontSize: 12, color: t.textMuted, marginTop: 2 },
  favListArrow: { fontSize: 18, color: t.danger, fontWeight: 'bold' },
  favNewListBtn: { padding: 12, alignItems: 'center', marginTop: 4 },
  favNewListBtnText: { color: t.accent, fontWeight: 'bold', fontSize: 15 },
  favCancelBtn: { marginTop: 8, padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: t.borderLight },
  favCancelText: { color: t.textMuted, fontSize: 15 },
});

export default OpportunityListScreen;
