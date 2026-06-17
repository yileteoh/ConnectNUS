import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Image, Platform, StatusBar, TextInput,
  KeyboardAvoidingView, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import {
  getMessages, connectSocket, joinRoom,
  sendSocketMessage, onMessage, disconnectSocket, uploadImage,
} from '../../services/chatService';

const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatLastSeen = (isOnline, lastSeen) => {
  if (isOnline) return 'Active now';
  if (!lastSeen) return 'Offline';
  const ms = lastSeen?.toMillis ? lastSeen.toMillis() : lastSeen;
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours / 24)}d ago`;
};

export default function ChatRoomScreen() {
  const router = useRouter();
  const { conversationId, name, otherId, avatar } = useLocalSearchParams();
  const currentUserId = auth.currentUser?.uid;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [otherUserStatus, setOtherUserStatus] = useState({ isOnline: false, lastSeen: null });
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const flatListRef = useRef(null);

  // Listen to the other user's online/lastSeen status in real time
  useEffect(() => {
    if (!otherId) return;
    const unsubscribe = onSnapshot(doc(db, 'users', otherId), (snap) => {
      if (snap.exists()) {
        setOtherUserStatus({
          isOnline: snap.data().isOnline || false,
          lastSeen: snap.data().lastSeen || null,
        });
      }
    });
    return unsubscribe;
  }, [otherId]);

  // Load message history and connect socket
  useEffect(() => {
    let unsubscribeMessages = () => {};

    const setup = async () => {
      try {
        const history = await getMessages(conversationId);
        setMessages(history);
        setLoading(false);
        connectSocket();
        joinRoom(conversationId);
        unsubscribeMessages = onMessage((newMsg) => {
          setMessages((prev) => [...prev, newMsg]);
        });
      } catch (error) {
        console.error('Failed to set up chat room:', error);
        setLoading(false);
      }
    };

    setup();
    return () => {
      unsubscribeMessages();
      disconnectSocket();
    };
  }, [conversationId]);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendSocketMessage(conversationId, currentUserId, text, 'text', null);
  };

  const handlePickImage = async (fromCamera) => {
    setShowAttachMenu(false);
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission needed', 'Camera access is required.');
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission needed', 'Photo library access is required.');
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      }

      if (result.canceled) return;
      setUploading(true);
      const imageUrl = await uploadImage(result.assets[0].uri);
      sendSocketMessage(conversationId, currentUserId, '', 'image', imageUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.senderId === currentUserId;
    return (
      <View style={[styles.messageRow, isOwn ? styles.rowOwn : styles.rowOther]}>
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          {item.type === 'image' && item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.imageMessage} resizeMode="cover" />
          ) : (
            <Text style={[styles.bubbleText, isOwn ? styles.textOwn : styles.textOther]}>
              {item.text}
            </Text>
          )}
          <Text style={[styles.bubbleTime, isOwn ? styles.timeOwn : styles.timeOther]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const statusText = formatLastSeen(otherUserStatus.isOnline, otherUserStatus.lastSeen);

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* WhatsApp-style header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => otherId && router.push(`/user/${otherId}`)}
          activeOpacity={0.7}
        >
          {avatar ? (
            <Image source={{ uri: decodeURIComponent(avatar) }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="person" size={20} color="#FFF" />
            </View>
          )}
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{name || 'Chat'}</Text>
            <Text style={[styles.headerStatus, otherUserStatus.isOnline && styles.headerStatusOnline]}>
              {statusText}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Voice calls will be available in a future update.')} style={styles.headerIcon}>
            <Ionicons name="call-outline" size={22} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Video calls will be available in a future update.')} style={styles.headerIcon}>
            <Ionicons name="videocam-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Message list */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#002D5B" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.messageId}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No messages yet. Say hi! 👋</Text>
            </View>
          }
        />
      )}

      {/* Attachment menu modal */}
      <Modal visible={showAttachMenu} transparent animationType="fade" onRequestClose={() => setShowAttachMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAttachMenu(false)}>
          <View style={styles.attachMenu}>
            <TouchableOpacity style={styles.attachOption} onPress={() => handlePickImage(true)}>
              <View style={[styles.attachIcon, { backgroundColor: '#002D5B' }]}>
                <Ionicons name="camera" size={24} color="#FFF" />
              </View>
              <Text style={styles.attachLabel}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={() => handlePickImage(false)}>
              <View style={[styles.attachIcon, { backgroundColor: '#F28C28' }]}>
                <Ionicons name="image" size={24} color="#FFF" />
              </View>
              <Text style={styles.attachLabel}>Photo Library</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachButton} onPress={() => setShowAttachMenu(true)}>
            {uploading
              ? <ActivityIndicator size="small" color="#002D5B" />
              : <Ionicons name="add" size={26} color="#002D5B" />
            }
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F0F0F0', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#002D5B', paddingHorizontal: 12, paddingVertical: 10 },
  backButton: { marginRight: 6 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  headerAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerName: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  headerStatus: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  headerStatusOnline: { color: '#90EE90' },
  headerActions: { flexDirection: 'row' },
  headerIcon: { marginLeft: 16 },

  // Messages
  messageList: { paddingHorizontal: 12, paddingVertical: 12, paddingBottom: 20 },
  messageRow: { marginBottom: 8, flexDirection: 'row' },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  bubbleOwn: { backgroundColor: '#002D5B', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#FFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E0E0E0' },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  textOwn: { color: '#FFF' },
  textOther: { color: '#333' },
  bubbleTime: { fontSize: 11, marginTop: 4 },
  timeOwn: { color: '#BFD0E8', textAlign: 'right' },
  timeOther: { color: '#999', textAlign: 'left' },
  imageMessage: { width: 200, height: 200, borderRadius: 12 },

  // Empty state
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 15, color: '#999' },

  // Attachment menu
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  attachMenu: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, flexDirection: 'row', justifyContent: 'space-around' },
  attachOption: { alignItems: 'center' },
  attachIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  attachLabel: { fontSize: 13, color: '#333', fontWeight: '500' },

  // Input bar
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EAEAEA' },
  attachButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, color: '#333', marginRight: 8 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#002D5B', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#B0BEC5' },
});
