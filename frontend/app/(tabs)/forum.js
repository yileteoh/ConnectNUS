// frontend/app/forum.js
import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  SafeAreaView, Image, TextInput, Platform, StatusBar,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Header from '../../components/Header';
import { auth } from '../../firebaseConfig';
import { fetchGlobalForums, togglePostLike } from '../../services/forumService';

const FORUM_TABS = ['All Topics', 'Study', 'Campus', 'Romance', 'Job', 'Others'];

// Helper to determine badge color dynamically based on string value
const getTagColor = (category) => {
  switch (category) {
    case 'Study': return { bg: '#FF8C00', text: '#FFF' }; // Orange
    case 'Job': return { bg: '#002D5B', text: '#FFF' }; // Dark Blue
    case 'Romance': return { bg: '#E1306C', text: '#FFF' }; // Pink/Red
    case 'Campus': return { bg: '#28A745', text: '#FFF' }; // Green
    default: return { bg: '#E6E8EA', text: '#333' }; // Grey for Others
  }
};

// Format timestamp dynamically
const getRelativeTime = (timeData) => {
  if (!timeData) return 'Just now';
  let date;
  if (timeData._seconds) date = new Date(timeData._seconds * 1000);
  else if (timeData.seconds) date = new Date(timeData.seconds * 1000);
  else date = new Date(timeData); 
  if (isNaN(date.getTime())) return 'Just now';
  const diff = Date.now() - date.getTime();
  if (diff < 0) return 'Just now';
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function ForumScreen() {
  const router = useRouter();
  
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All Topics');
  
  const currentUserId = auth.currentUser?.uid;

  const loadForums = async (categoryFilter = activeCategory) => {
    try {
      const data = await fetchGlobalForums(categoryFilter);
      setForums(data);
    } catch (error) {
      console.error('Failed to load forums:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Re-fetch data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadForums(activeCategory);
    }, [activeCategory])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadForums(activeCategory);
  }, [activeCategory]);

  const handleCategorySwitch = (category) => {
    if (category === activeCategory) return;
    setActiveCategory(category);
    setLoading(true);
  };

  // Optimistic UI update for likes (updates UI instantly before server confirms)
  const handleToggleLike = async (postId) => {
    if (!currentUserId) return;

    // Optimistically update local state
    setForums(currentPosts => currentPosts.map(post => {
      if (post.id === postId) {
        const hasLiked = post.likes?.includes(currentUserId);
        const newLikes = hasLiked 
          ? post.likes.filter(id => id !== currentUserId) 
          : [...(post.likes || []), currentUserId];
        return { ...post, likes: newLikes };
      }
      return post;
    }));

    try {
      await togglePostLike(postId, currentUserId);
    } catch (error) {
      // Revert if API fails
      loadForums(activeCategory); 
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Discussions" showSettings={false} />

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search discussions..."
          placeholderTextColor="#888"
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {FORUM_TABS.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity 
                key={cat}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => handleCategorySwitch(cat)}
              >
                <Text style={isActive ? styles.filterChipTextActive : styles.filterChipText}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.feedContainer} 
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#002D5B" />}
      >
        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#002D5B" />
            <Text style={styles.loadingText}>Loading discussions...</Text>
          </View>
        ) : forums.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={60} color="#CCC" />
            <Text style={styles.emptyStateTitle}>No discussions yet</Text>
            <Text style={styles.emptyStateSub}>Be the first to start a conversation in '{activeCategory}'!</Text>
          </View>
        ) : (
          forums.map((post) => {
            const tagStyle = getTagColor(post.category);
            const isLiked = post.likes?.includes(currentUserId);

            return (
              <TouchableOpacity 
                key={post.id} 
                style={styles.postCard}
                activeOpacity={0.8}
                onPress={() => router.push(`/forum-details/${post.id}`)} 
              >
                <View style={styles.postHeader}>
                  <View style={[styles.tagBadge, { backgroundColor: tagStyle.bg }]}>
                    <Text style={[styles.tagText, { color: tagStyle.text }]}>{post.category}</Text>
                  </View>
                  <Text style={styles.timeText}>{getRelativeTime(post.createdAt)}</Text>
                </View>
                
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postSnippet} numberOfLines={3}>
                  {post.content}
                </Text>

                <View style={styles.postFooter}>
                  
                  {/* Clickable Author Profile Link */}
                  <TouchableOpacity 
                    style={styles.authorRow}
                    onPress={() => {
                      if (post.creatorId === currentUserId) router.push('/(tabs)/profile');
                      else router.push(`/user/${post.creatorId}`);
                    }}
                  >
                    {post.creatorPicUrl ? (
                      <Image source={{ uri: post.creatorPicUrl }} style={styles.authorAvatar} />
                    ) : (
                      <Image source={require('../../assets/profile_image.jpg')} style={styles.authorAvatar} />
                    )}
                    <Text style={styles.authorName}>{post.creatorId === currentUserId ? 'You' : post.creatorName}</Text>
                  </TouchableOpacity>

                  {/* Upvote and Comment Stats */}
                  <View style={styles.statsRow}>
                    <TouchableOpacity 
                      style={styles.statItem} 
                      onPress={() => handleToggleLike(post.id)}
                    >
                      <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#E1306C" : "#666"} />
                      <Text style={[styles.statText, isLiked && { color: "#E1306C", fontWeight: 'bold' }]}>
                        {post.likes?.length || 0}
                      </Text>
                    </TouchableOpacity>
                    
                    <View style={styles.statItem}>
                      <Ionicons name="chatbox-outline" size={18} color="#666" />
                      <Text style={styles.statText}>{post.commentCount || 0}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button for Creating Post */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/create-forum')}>
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 10, paddingHorizontal: 12, height: 45, marginHorizontal: 15, marginTop: 10, marginBottom: 15 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  filterScroll: { marginBottom: 15, maxHeight: 40 },
  filterChip: { backgroundColor: '#E6E8EA', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, justifyContent: 'center', alignItems: 'center', height: 35 },
  filterChipActive: { backgroundColor: '#F28C28' },
  filterChipText: { color: '#555', fontSize: 14, fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  feedContainer: { flex: 1, paddingHorizontal: 15 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B', marginTop: 12 },
  emptyStateSub: { fontSize: 14, color: '#666', marginTop: 6, textAlign: 'center' },
  
  postCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  timeText: { fontSize: 12, color: '#888' },
  postTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B', marginBottom: 8, lineHeight: 24 },
  postSnippet: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 14 },
  
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: '#EAEAEA' },
  authorName: { fontSize: 13, fontWeight: '600', color: '#333' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flexDirection: 'row', alignItems: 'center', marginLeft: 16, padding: 4 },
  statText: { fontSize: 13, color: '#666', marginLeft: 6 },
  
  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#F28C28', justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 }
});