import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Image, Platform, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Header from '../../components/Header';
import { auth } from '../../firebaseConfig';
import { getConversations } from '../../services/chatService';

// Converts a timestamp (milliseconds) into a short readable string for the inbox
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function ChatScreen() {
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = async () => {
    if (!currentUserId) return;
    try {
      const data = await getConversations(currentUserId);
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload every time the Chat tab comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadConversations();
    }, [currentUserId])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations();
  }, [currentUserId]);

  const renderConversationCard = ({ item }) => {
    // Find the other participant (not the current user)
    const otherId = item.participants.find((id) => id !== currentUserId);
    const otherUser = item.participantInfo?.[otherId] || {};
    const lastText = item.lastMessage?.text || 'No messages yet';
    const lastTime = item.lastMessageTime?.toMillis
      ? formatTime(item.lastMessageTime.toMillis())  
      : formatTime(item.lastMessageTime);       

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push(`/chat/${item.conversationId}`)}
      >
        {otherUser.profilePicUrl ? (
          <Image source={{ uri: otherUser.profilePicUrl }} style={styles.avatar} />
        ) : (
          <Image source={require('../../assets/profile_image.jpg')} style={styles.avatar} />
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text style={styles.name}>{otherUser.name || 'User'}</Text>
            <Text style={styles.time}>{lastTime}</Text>
          </View>
          <Text style={styles.preview} numberOfLines={1}>{lastText}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Messages" showSettings={false} />

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.conversationId}
        renderItem={renderConversationCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#002D5B" />}
        ListEmptyComponent={() => {
          if (loading && !refreshing) {
            return (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#002D5B" />
              </View>
            );
          }
          return (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={60} color="#CCC" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>Match with a buddy to start chatting!</Text>
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
  listContent: { paddingVertical: 10, paddingBottom: 80 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#EEE' },
  cardBody: { flex: 1, marginLeft: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#002D5B' },
  time: { fontSize: 12, color: '#999' },
  preview: { fontSize: 14, color: '#666' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#666', marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
