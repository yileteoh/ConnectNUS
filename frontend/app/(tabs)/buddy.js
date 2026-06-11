// frontend/app/buddy.js
import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  SafeAreaView, Image, Platform, StatusBar, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Header from '../../components/Header';
import { auth } from '../../firebaseConfig';
import { getBuddyRecommendations } from '../../services/buddyService';

export default function BuddyScreen() {
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  // Render individual buddy recommendation card
  const renderBuddyCard = ({ item }) => {
    // Backend assigns matchScore = 1 if same faculty
    const isSameFaculty = item.matchScore === 1;

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
            <Text style={styles.userDetail}>Year {item.year} • {item.faculty}</Text>
          </View>

          {/* Personalized 'Match' Badge */}
          {isSameFaculty && (
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

      <View style={styles.headerContext}>
        <Text style={styles.headerContextTitle}>Recommended for You</Text>
        <Text style={styles.headerContextSub}>Based on your faculty and interests</Text>
      </View>

      <FlatList
        data={recommendations}
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
  connectButtonText: { color: '#002D5B', fontWeight: '600', fontSize: 14 }
});