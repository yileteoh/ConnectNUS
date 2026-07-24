// frontend/app/trending-forum.js
import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  SafeAreaView, Image, Platform, StatusBar,
  ActivityIndicator, RefreshControl, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router'; 
import { auth } from '../firebaseConfig';
import { fetchGlobalForums, togglePostLike } from '../services/forumService';

const getTagColor = (category) => {
  switch (category) {
    case 'Study': return { bg: '#FF8C00', text: '#FFF' }; 
    case 'Job': return { bg: '#002D5B', text: '#FFF' }; 
    case 'Romance': return { bg: '#E1306C', text: '#FFF' }; 
    case 'Campus': return { bg: '#28A745', text: '#FFF' }; 
    default: return { bg: '#E6E8EA', text: '#333' }; 
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

const toMillis = (timeData) => {
  if (!timeData) return 0;
  if (timeData._seconds) return timeData._seconds * 1000;
  if (timeData.seconds) return timeData.seconds * 1000;
  const date = new Date(timeData);
  return isNaN(date.getTime()) ? 0 : date.getTime();
};

const wasEdited = (item) => toMillis(item.updatedAt) > toMillis(item.createdAt);

export default function TrendingForumScreen() {
  const router = useRouter();
  
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const currentUserId = auth.currentUser?.uid;

  const loadTrendingDiscussions = async () => {
    try {
      const data = await fetchGlobalForums();
      const now = Date.now();
      
      // ALGORITHM: Filter last 7 days & Calculate Trending Score
      const trendingData = data.map(post => {
        let postDate = new Date();
        const timeData = post.createdAt;
        
        if (timeData && timeData._seconds) postDate = new Date(timeData._seconds * 1000);
        else if (timeData && timeData.seconds) postDate = new Date(timeData.seconds * 1000);
        else if (timeData) postDate = new Date(timeData);
        
        // Time Decay: Only keep posts from the last 7 days
        const diffDays = (now - postDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Calculate Engagement Score: Likes (1pt) + Comments (2pts)
        const likes = post.likes?.length || 0;
        const comments = post.commentCount || 0;
        const trendingScore = likes + (comments * 2);
        
        return { ...post, diffDays, trendingScore };
      })
      .filter(post => post.diffDays <= 7) // Remove old posts
      .sort((a, b) => b.trendingScore - a.trendingScore) // Sort highest score first
      .slice(0, 10);

      setForums(trendingData);
    } catch (error) {
      console.error('Failed to load trending discussions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadTrendingDiscussions();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTrendingDiscussions();
  }, []);

  const handleToggleLike = async (postId) => {
    if (!currentUserId) return;

    const targetPost = forums.find(p => p.id === postId);
    if (!targetPost) return;
    
    // Optimistic UI update
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
      loadTrendingDiscussions(); 
    }
  };

  const renderPost = ({ item: post }) => {
    const tagStyle = getTagColor(post.category);
    const isLiked = post.likes?.includes(currentUserId);
    const isOwnPost = post.creatorId === currentUserId;

    return (
      <TouchableOpacity
        style={[styles.postCard, isOwnPost && styles.postCardOwn]}
        activeOpacity={0.8}
        // Use relative path for routing to forum-details
        onPress={() => router.push(`/forum-details/${post.id}`)}
      >
        <View style={styles.postHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.tagBadge, { backgroundColor: tagStyle.bg }]}>
              <Text style={[styles.tagText, { color: tagStyle.text }]}>{post.category}</Text>
            </View>
            {isOwnPost && (
              <View style={styles.ownPill}>
                <Text style={styles.ownPillText}>Created by you</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>
            {getRelativeTime(wasEdited(post) ? post.updatedAt : post.createdAt)}{wasEdited(post) ? ' • edited' : ''}
          </Text>
        </View>
        
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postSnippet} numberOfLines={3}>
          {post.content}
        </Text>

        <View style={styles.postFooter}>
          <View style={styles.authorRow}>
            {post.creatorPicUrl ? (
              <Image source={{ uri: post.creatorPicUrl }} style={styles.authorAvatar} />
            ) : (
              <Image source={require('../assets/profile_image.jpg')} style={styles.authorAvatar} />
            )}
            <Text style={styles.authorName}>{post.creatorId === currentUserId ? 'You' : post.creatorName}</Text>
          </View>

          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => handleToggleLike(post.id)}>
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
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Custom Header with Back Navigation */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#002D5B" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Trending Discussions</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <FlatList 
        style={styles.feedContainer} 
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 15 }}
        data={forums}
        keyExtractor={(item) => item.id}
        renderItem={renderPost} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D32F2F" />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => {
          if (loading && !refreshing) {
            return (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#002D5B" />
              </View>
            );
          }
          return (
            <View style={styles.emptyState}>
              <Ionicons name="trending-down" size={60} color="#CCC" />
              <Text style={styles.emptyStateTitle}>It is quiet here...</Text>
              <Text style={styles.emptyStateSub}>No trending discussions in the past 7 days.</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 15, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#EAEAEA' },
  backButton: { padding: 5, marginLeft: -5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B' },
  feedContainer: { flex: 1, paddingHorizontal: 15 },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B', marginTop: 12 },
  emptyStateSub: { fontSize: 14, color: '#666', marginTop: 6, textAlign: 'center' },
  postCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#EAEAEA', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  postCardOwn: { backgroundColor: '#FFF7ED' },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  ownPill: { backgroundColor: '#FFEDD5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 6 },
  ownPillText: { color: '#C2410C', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  timeText: { fontSize: 12, color: '#888' },
  postTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B', marginBottom: 8, lineHeight: 24 },
  postSnippet: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 14 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: '#EAEAEA' },
  authorName: { fontSize: 13, fontWeight: '600', color: '#333' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flexDirection: 'row', alignItems: 'center', marginLeft: 16, padding: 4 },
  statText: { fontSize: 13, color: '#666', marginLeft: 6 }
});
