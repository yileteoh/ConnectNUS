import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Image, Platform, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import Header from '../../components/Header';
import { auth, db } from '../../firebaseConfig';

const toMs = (ts) => {
  if (!ts) return null;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts._seconds) return ts._seconds * 1000;
  if (typeof ts === 'number') return ts;
  return null;
};

const formatTime = (ts) => {
  const ms = toMs(ts);
  if (!ms) return '';
  const diff = Date.now() - ms;
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
  const [myBuddyId, setMyBuddyId] = useState(null);

  useEffect(() => {
    if (!currentUserId) return;
    const unsub = onSnapshot(doc(db, 'users', currentUserId), (snap) => {
      if (snap.exists()) {
        setMyBuddyId(snap.data().currentBuddyId || null);
      }
    });
    return unsub;
  }, [currentUserId]);

  // Real-time listener — same query the Header badge already uses, so permissions are confirmed working
  useEffect(() => {
    if (!currentUserId) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUserId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ conversationId: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const tA = toMs(a.lastMessageTime) ?? -Infinity;
        const tB = toMs(b.lastMessageTime) ?? -Infinity;
        return tB - tA;
      });
      setConversations(docs);
      setLoading(false);
    }, (err) => {
      console.error('Conversations listener error:', err);
      setLoading(false);
    });
    return unsub;
  }, [currentUserId]);

  const sortedConversations = [...conversations].sort((a, b) => {
    const otherIdA = a.participants?.find((id) => id !== currentUserId);
    const otherIdB = b.participants?.find((id) => id !== currentUserId);

    const aIsBuddy = !a.conversationId?.startsWith('event_') && otherIdA === myBuddyId;
    const bIsBuddy = !b.conversationId?.startsWith('event_') && otherIdB === myBuddyId;

    if (aIsBuddy && !bIsBuddy) return -1;
    if (!aIsBuddy && bIsBuddy) return 1;

    const tA = toMs(a.lastMessageTime) ?? -Infinity;
    const tB = toMs(b.lastMessageTime) ?? -Infinity;
    return tB - tA;
  });

  const renderConversationCard = ({ item }) => {
    const isGroup = item.type === 'group' || item.conversationId?.startsWith('event_');
    const lastText = item.lastMessage?.text || 'No messages yet';
    const lastTime = formatTime(item.lastMessageTime);
    const unread = item.unreadCounts?.[currentUserId] || 0;

    if (isGroup) {
      const groupName = item.eventTitle || 'Group Chat';
      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => router.push(
            `/chat/${item.conversationId}?name=${encodeURIComponent(groupName)}`
          )}
        >
          <View style={styles.groupAvatarCircle}>
            <Ionicons name="people" size={24} color="#FFF" />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardTop}>
              <Text style={[styles.name, unread > 0 && styles.nameBold]} numberOfLines={1}>{groupName}</Text>
              <Text style={styles.time}>{lastTime}</Text>
            </View>
            <View style={styles.cardBottom}>
              <Text style={[styles.preview, unread > 0 && styles.previewBold]} numberOfLines={1}>{lastText}</Text>
              {unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // 1-on-1 DM
    const otherId = item.participants?.find((id) => id !== currentUserId);
    const otherUser = item.participantInfo?.[otherId] || {};
    const isBuddy = otherId === myBuddyId;
    return (
      <TouchableOpacity
        style={[styles.card, isBuddy && styles.buddyCardHighlight]}
        activeOpacity={0.8}
        onPress={() => router.push(
          `/chat/${item.conversationId}?name=${encodeURIComponent(otherUser.name || '')}&otherId=${otherId}&avatar=${encodeURIComponent(otherUser.profilePicUrl || '')}`
        )}
      >
        {otherUser.profilePicUrl ? (
          <Image source={{ uri: otherUser.profilePicUrl }} style={styles.avatar} />
        ) : (
          <Image source={require('../../assets/profile_image.jpg')} style={styles.avatar} />
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <Text style={[styles.name, unread > 0 && styles.nameBold]} numberOfLines={1}>
                {otherUser.name || 'User'}
              </Text>
              {isBuddy && (
                <View style={styles.buddyBadge}>
                  <Ionicons name="star" size={10} color="#FFF" />
                  <Text style={styles.buddyBadgeText}>BUDDY</Text>
                </View>
              )}
            </View>
            <Text style={styles.time}>{lastTime}</Text>
          </View>
          <View style={styles.cardBottom}>
            <Text style={[styles.preview, unread > 0 && styles.previewBold]} numberOfLines={1}>{lastText}</Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Messages" showSettings={false} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#002D5B" />
        </View>
      ) : (
        <FlatList
          data={sortedConversations}
          keyExtractor={(item) => item.conversationId}
          renderItem={renderConversationCard}
          contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={60} color="#CCC" />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>Match with a buddy or join an event to start chatting!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingVertical: 10, paddingBottom: 80 },
  emptyContainer: { flex: 1 },

  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  buddyCardHighlight: { backgroundColor: '#ffe9bc' },
  buddyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F28C28', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  buddyBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold', marginLeft: 2, letterSpacing: 0.5 },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#EEE' },
  groupAvatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#0288D1', justifyContent: 'center', alignItems: 'center' },
  cardBody: { flex: 1, marginLeft: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#002D5B', flex: 1, marginRight: 8 },
  nameBold: { fontWeight: '800' },
  time: { fontSize: 12, color: '#999' },
  preview: { fontSize: 14, color: '#666', flex: 1, marginRight: 8 },
  previewBold: { color: '#333', fontWeight: '600' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unreadBadge: { backgroundColor: '#E53935', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadBadgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#002D5B', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#666', marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
