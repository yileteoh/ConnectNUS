// frontend/app/buddy.js
import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  SafeAreaView, Image, Platform, StatusBar, ActivityIndicator, RefreshControl, ScrollView, TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Header from '../../components/Header';
import { auth } from '../../firebaseConfig';
import { getBuddyRecommendations, getPendingRequests, getMyBuddyProfile } from '../../services/buddyService';
import { getUserProfile } from '../../services/profileService';
import { getOrCreateConversation } from '../../services/chatService';

const FACULTY_OPTIONS = [
  'All',
  'College of Design and Engineering',
  'Faculty of Arts & Social Sciences',
  'Faculty of Law',
  'Faculty of Science',
  'School of Computing',
  'NUS Business School',
  'Yong Loo Lin School of Medicine',
  'Other Schools & Programmes',
];

export default function BuddyScreen() {
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optedOut, setOptedOut] = useState(false);
  const [exclusiveBuddy, setExclusiveBuddy] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaculty, setActiveFaculty] = useState('All');

  // Intelligent Master Fetch Function
  const loadAllBuddyData = async () => {
    if (!currentUserId) return;
    try {
      // Fetch user's own profile to check operational status
      const myProfile = await getUserProfile(currentUserId);
      
      // Check if user is already locked into an exclusive 1-on-1 partnership
      if (myProfile.currentBuddyId) {
        const buddyData = await getMyBuddyProfile(currentUserId);
        setExclusiveBuddy(buddyData);
        return;
      }
      setExclusiveBuddy(null);
      
      // If user toggled off buddy matching in settings
      if (myProfile.buddyStatus === false) {
        setOptedOut(true);
        return;
      }
      setOptedOut(false);

      // If open and single, fetch Inbox Requests + Recommendations in parallel
      const [inboxData, recData] = await Promise.all([
        getPendingRequests(currentUserId),
        getBuddyRecommendations(currentUserId)
      ]);
      setPendingRequests(inboxData);
      setRecommendations(recData);

    } catch (error) {
      console.error("Failed to load buddy ecosystem:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAllBuddyData();
    }, [currentUserId])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllBuddyData();
  }, [currentUserId]);

  const filteredBuddies = recommendations.filter(buddy => {
    // Search match (checks name, bio, or interests)
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (buddy.name && buddy.name.toLowerCase().includes(query)) ||
      (buddy.interests && buddy.interests.some(i => i.toLowerCase().includes(query)));
      
    // Faculty match
    const matchesFaculty = activeFaculty === 'All' || buddy.faculty === activeFaculty;

    return matchesSearch && matchesFaculty;
  });

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Buddy" showSettings={false} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#002D5B" />
          <Text style={{ marginTop: 10, color: '#666', fontSize: 14 }}>Checking buddy status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Rendered if user already has an active 1-on-1 Buddy
  if (exclusiveBuddy) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="My Buddy" showSettings={false} />
        <ScrollView contentContainerStyle={{ padding: 20 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#002D5B" />}>
          
          <View style={styles.exclusiveCard}>
            <View style={styles.exclusiveHeader}>
              <Ionicons name="diamond" size={20} color="#F28C28" />
              <Text style={styles.exclusiveHeaderText}>Your Exclusive Buddy</Text>
            </View>
            
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              {exclusiveBuddy.profilePicUrl ? (
                <Image source={{ uri: exclusiveBuddy.profilePicUrl }} style={styles.exclusiveAvatar} />
              ) : (
                <Image source={require('../../assets/profile_image.jpg')} style={styles.exclusiveAvatar} />
              )}
              <Text style={styles.exclusiveName}>{exclusiveBuddy.name}</Text>
              <Text style={styles.exclusiveSub}>{exclusiveBuddy.faculty}</Text>
            </View>

            <TouchableOpacity
              style={styles.chatButton}
              onPress={async () => {
                const conv = await getOrCreateConversation(currentUserId, exclusiveBuddy.id);
                router.push(`/chat/${conv.conversationId}?name=${encodeURIComponent(exclusiveBuddy.name)}&otherId=${exclusiveBuddy.id}&avatar=${encodeURIComponent(exclusiveBuddy.profilePicUrl || '')}`);
              }}
            >
              <Ionicons name="chatbubbles" size={20} color="#FFF" />
              <Text style={styles.chatButtonText}>Chat with {exclusiveBuddy.name}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.manageButton} 
              onPress={() => router.push(`/user/${exclusiveBuddy.id}`)}
            >
              <Text style={styles.manageButtonText}>View Full Profile</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

if (optedOut) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header title="Find a Buddy" showSettings={false} />
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={60} color="#CCC" />
          <Text style={styles.emptyStateTitle}>Matching Disabled</Text>
          <Text style={styles.emptyStateSub}>You have turned off Buddy Matching. Go to Edit Profile to enable it and discover new peers.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Dynamic Header containing the Inbox Queue
  const renderInboxHeader = () => (
    <View style={{ paddingBottom: 10 }}>
      {/* Pending Requests Section (Inbox) */}
      {pendingRequests.length > 0 && (
        <View style={styles.inboxContainer}>
          <Text style={styles.inboxTitle}>Pending Requests ({pendingRequests.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 15 }}>
            {pendingRequests.map(req => (
              <TouchableOpacity key={req.id} style={styles.inboxCard} onPress={() => router.push(`/user/${req.senderId}`)}>
                {req.senderPicUrl ? (
                  <Image source={{ uri: req.senderPicUrl }} style={styles.inboxAvatar} />
                ) : (
                  <Image source={require('../../assets/profile_image.jpg')} style={styles.inboxAvatar} />
                )}
                <Text style={styles.inboxName} numberOfLines={1}>{req.senderName}</Text>
                <Text style={styles.inboxActionText}>Tap to respond</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Discovery Filters */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search by name, interests..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 15 }}>
        {FACULTY_OPTIONS.map((faculty) => {
          const isActive = activeFaculty === faculty;
          return (
            <TouchableOpacity key={faculty} style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={() => setActiveFaculty(faculty)}>
              <Text style={isActive ? styles.filterChipTextActive : styles.filterChipText}>{faculty}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.headerContext}>
        <Text style={styles.headerContextTitle}>Recommended for You</Text>
        <Text style={styles.headerContextSub}>Based on shared modules and interests</Text>
      </View>
    </View>
  );

  // Recommendation List rendering function
  const renderBuddyCard = ({ item }) => {
    const isTopMatch = item.matchScore >= 10;
    return (
      <TouchableOpacity style={styles.buddyCard} activeOpacity={0.8} onPress={() => router.push(`/user/${item.id}`)}>
        <View style={styles.cardHeader}>
          {item.profilePicUrl ? (
            <Image source={{ uri: item.profilePicUrl }} style={styles.avatar} />
          ) : (
            <Image source={require('../../assets/profile_image.jpg')} style={styles.avatar} />
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userDetail}>{item.year} • {item.faculty}</Text>
          </View>
          {isTopMatch && (
            <View style={styles.matchBadge}>
              <Ionicons name="sparkles" size={12} color="#FFF" />
              <Text style={styles.matchText}>Top Match</Text>
            </View>
          )}
        </View>

        <Text style={styles.bioText} numberOfLines={2}>
          {item.bio || "Hi there! I'm looking for a buddy."}
        </Text>

        <View style={styles.tagsContainer}>
          {(item.commonTags && item.commonTags.length > 0 ? item.commonTags : item.interests || []).slice(0, 3).map((tag, index) => (
            <View key={index} style={[styles.tag, item.commonTags?.length > 0 && { backgroundColor: '#FFE4C4' }]}>
              <Text style={[styles.tagText, item.commonTags?.length > 0 && { color: '#A04000', fontWeight: 'bold' }]}>{tag}</Text>
            </View>
          ))}
          {((item.commonTags || item.interests || []).length > 3) && <Text style={styles.moreTags}>+</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Find a Buddy" showSettings={false} />

      <FlatList
        data={filteredBuddies}
        keyExtractor={(item) => item.id}
        renderItem={renderBuddyCard}
        ListHeaderComponent={renderInboxHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#002D5B" />}
        ListEmptyComponent={() => {
          return (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={60} color="#CCC" />
              <Text style={styles.emptyStateTitle}>No peers found</Text>
              <Text style={styles.emptyStateSub}>Try adjusting your search query or faculty filters.</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContext: { paddingHorizontal: 15, paddingTop: 10 },
  headerContextTitle: { fontSize: 20, fontWeight: 'bold', color: '#002D5B' },
  headerContextSub: { fontSize: 13, color: '#666', marginTop: 2 },
  listContent: { paddingBottom: 80 },

  // Search & Filters
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 10, paddingHorizontal: 12, height: 45, marginHorizontal: 15, marginTop: 15, marginBottom: 15 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  filterScroll: { marginBottom: 15, maxHeight: 40 },
  filterChip: { backgroundColor: '#E6E8EA', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, justifyContent: 'center', alignItems: 'center', height: 35 },
  filterChipActive: { backgroundColor: '#002D5B' },
  filterChipText: { color: '#555', fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  
  // Recommendation Card
  buddyCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, marginHorizontal: 15, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#EEE' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  userDetail: { fontSize: 13, color: '#666', marginTop: 2 },
  matchBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F28C28', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  matchText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  bioText: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 12 },
  tagsContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  tag: { backgroundColor: '#F0F2F5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 8, marginBottom: 4 },
  tagText: { fontSize: 12, color: '#444', fontWeight: '500' },
  moreTags: { fontSize: 12, color: '#888', marginBottom: 4, marginLeft: 2 },

  // Empty & Error States
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, paddingHorizontal: 30 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B', marginTop: 12 },
  emptyStateSub: { fontSize: 14, color: '#666', marginTop: 6, textAlign: 'center', lineHeight: 20 },

  // Inbox UI
  inboxContainer: { backgroundColor: '#FFF9F0', paddingTop: 15, borderBottomWidth: 1, borderBottomColor: '#FFE4C4' },
  inboxTitle: { fontSize: 14, fontWeight: 'bold', color: '#A04000', marginHorizontal: 15, marginBottom: 12 },
  inboxCard: { backgroundColor: '#FFF', width: 120, padding: 12, borderRadius: 8, marginRight: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FFE4C4' },
  inboxAvatar: { width: 40, height: 40, borderRadius: 20, marginBottom: 8 },
  inboxName: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 4, textAlign: 'center' },
  inboxActionText: { fontSize: 11, color: '#F28C28', fontWeight: '600' },

  // Exclusive Buddy UI
  exclusiveCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 25, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 5, marginTop: 20 },
  exclusiveHeader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  exclusiveHeaderText: { fontSize: 14, fontWeight: 'bold', color: '#F28C28', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 1 },
  exclusiveAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#FAFAFA', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, marginBottom: 15 },
  exclusiveName: { fontSize: 24, fontWeight: 'bold', color: '#002D5B', marginBottom: 5 },
  exclusiveSub: { fontSize: 15, color: '#666' },
  chatButton: { backgroundColor: '#002D5B', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 10, marginTop: 25 },
  chatButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  manageButton: { marginTop: 15, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#F8F9FA' },
  manageButtonText: { color: '#555', fontSize: 14, fontWeight: '600' }
});