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
import { getBuddyRecommendations } from '../../services/buddyService';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaculty, setActiveFaculty] = useState('All');

  // Fetch recommendations from backend
  const loadRecommendations = async () => {
    try {
      const data = await getBuddyRecommendations(currentUserId);
      setRecommendations(data);
    } catch (error) {
      console.error("Failed to load buddies:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadRecommendations();
    }, [currentUserId])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecommendations();
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

  // Render individual buddy recommendation card
  const renderBuddyCard = ({ item }) => {
    const isTopMatch = item.matchScore >= 5;

    return (
      <TouchableOpacity 
        style={styles.buddyCard} 
        activeOpacity={0.8}
        onPress={() => router.push(`/user/${item.id}`)} // Route to profile to send request
      >
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

          {/* Personalized 'Match' Badge */}
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

        {/* Display max 3 interests */}
        <View style={styles.tagsContainer}>
          {(item.interests || []).slice(0, 3).map((interest, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{interest}</Text>
            </View>
          ))}
          {(item.interests?.length > 3) && <Text style={styles.moreTags}>+{item.interests.length - 3}</Text>}
        </View>

        <View style={styles.connectButton}>
          <Text style={styles.connectButtonText}>View Profile to Connect</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Find a Buddy" showSettings={false} />

     {/* 1. Search Bar */}
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

      {/* 2. Faculty Filter Chips */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {FACULTY_OPTIONS.map((faculty) => {
            const isActive = activeFaculty === faculty;
            
            return (
              <TouchableOpacity 
                key={faculty}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFaculty(faculty)}
              >
                <Text style={isActive ? styles.filterChipTextActive : styles.filterChipText}>
                  {faculty}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredBuddies}
        keyExtractor={(item) => item.id}
        renderItem={renderBuddyCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#002D5B" />
        }
        ListEmptyComponent={() => {
          if (loading && !refreshing) {
            return (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#002D5B" />
                <Text style={{ marginTop: 10, color: '#666' }}>Finding matches...</Text>
              </View>
            );
          }
          return (
            <View style={styles.emptyState}>
              <Ionicons name="people-circle-outline" size={60} color="#CCC" />
              <Text style={styles.emptyStateTitle}>No buddies found</Text>
              <Text style={styles.emptyStateSub}>You might already be paired, or there are no available students right now.</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  headerContext: { paddingHorizontal: 20, paddingVertical: 15 },
  headerContextTitle: { fontSize: 20, fontWeight: 'bold', color: '#002D5B' },
  headerContextSub: { fontSize: 14, color: '#666', marginTop: 4 },
  listContent: { paddingHorizontal: 16, paddingBottom: 80 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 10, paddingHorizontal: 12, height: 45, marginHorizontal: 15, marginTop: 10, marginBottom: 15 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  filterScroll: { marginBottom: 15, maxHeight: 40 },
  filterChip: { backgroundColor: '#E6E8EA', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, justifyContent: 'center', alignItems: 'center', height: 35 },
  filterChipActive: { backgroundColor: '#002D5B' },
  filterChipText: { color: '#555', fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  
  buddyCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#EEE' },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  userDetail: { fontSize: 13, color: '#666', marginTop: 2 },
  
  matchBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F28C28', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  matchText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  
  bioText: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 12 },
  
  tagsContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 },
  tag: { backgroundColor: '#F0F2F5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  tagText: { fontSize: 12, color: '#444', fontWeight: '500' },
  moreTags: { fontSize: 12, color: '#888', marginBottom: 8 },
  
  connectButton: { backgroundColor: '#F8F9FA', borderRadius: 8, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA' },
  connectButtonText: { color: '#002D5B', fontWeight: '600', fontSize: 14 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B', marginTop: 12 },
  emptyStateSub: { fontSize: 14, color: '#666', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
});