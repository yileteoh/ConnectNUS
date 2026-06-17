import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable,
  SafeAreaView, Image, Platform, StatusBar, TextInput,
  KeyboardAvoidingView, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { doc, onSnapshot, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import {
  getMessages, connectSocket, joinRoom,
  sendSocketMessage, broadcastImage, onMessage, disconnectSocket, uploadImage,
} from '../../services/chatService';

const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatLastSeen = (isOnline, lastSeen) => {
  const ms = lastSeen?.toMillis ? lastSeen.toMillis() : (lastSeen || 0);
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);

  // Treat isOnline as stale if lastSeen hasn't been refreshed within 5 min
  // (heartbeat pings every 2 min, so >5 min means the app was killed/backgrounded)
  if (isOnline && diff < 5 * 60 * 1000) return 'Active now';

  if (!ms) return 'Offline';
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours / 24)}d ago`;
};

const formatDateSeparator = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
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
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [savingImage, setSavingImage] = useState(false);
  const flatListRef = useRef(null);

  // Insert date-separator objects between messages from different days
  const flatListData = useMemo(() => {
    const result = [];
    let lastDateStr = null;
    messages.forEach((msg) => {
      const dateStr = msg.timestamp ? new Date(msg.timestamp).toDateString() : null;
      if (dateStr && dateStr !== lastDateStr) {
        result.push({ _separatorId: `sep_${msg.timestamp}`, date: msg.timestamp });
        lastDateStr = dateStr;
      }
      result.push(msg);
    });
    return result;
  }, [messages]);

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
          console.log('Socket received message:', JSON.stringify(newMsg));
          // Skip all our own echoes — we add every own message to local state immediately
          if (newMsg.senderId === currentUserId) return;
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
    // Add locally for instant feedback; skip our own socket echo in onMessage
    setMessages((prev) => [...prev, {
      messageId: `local_${Date.now()}`,
      senderId: currentUserId,
      text,
      type: 'text',
      timestamp: Date.now(),
    }]);
    sendSocketMessage(conversationId, currentUserId, text, 'text', null);
  };

  // Step 1: close the modal synchronously, then schedule the picker after the animation finishes
  const handlePickImage = (fromCamera) => {
    setShowAttachMenu(false);
    setTimeout(() => launchPicker(fromCamera), 400);
  };

  // Step 2: run after modal has fully dismissed
  const launchPicker = async (fromCamera) => {
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission needed', 'Camera access is required.');
        result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.7 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission needed', 'Photo library access is required.');
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.7 });
      }
      if (result.canceled) return;
      setUploading(true);
      const imageUrl = await uploadImage(result.assets[0].uri);
      console.log('Image uploaded, URL:', imageUrl);

      // Save directly to Firestore — reliable regardless of socket state
      const msgRef = await addDoc(
        collection(db, 'conversations', conversationId, 'messages'),
        { senderId: currentUserId, text: '', type: 'image', imageUrl, timestamp: serverTimestamp() }
      );
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: { text: '📷 Photo', senderId: currentUserId },
        lastMessageTime: serverTimestamp(),
      });

      const timestamp = Date.now();
      // Add to local state with the real Firestore messageId
      setMessages((prev) => [...prev, {
        messageId: msgRef.id,
        senderId: currentUserId,
        text: '',
        type: 'image',
        imageUrl,
        timestamp,
      }]);
      // Broadcast to the other user via socket (server does NOT save to Firestore again)
      broadcastImage(conversationId, currentUserId, imageUrl, msgRef.id, timestamp);
    } catch (error) {
      console.error('Image upload error:', error?.code, error?.message, error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveImage = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required to save images.');
        return;
      }
      setSavingImage(true);
      const localUri = FileSystem.cacheDirectory + `connectnus_${Date.now()}.jpg`;
      await FileSystem.downloadAsync(previewImageUrl, localUri);
      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert('Saved', 'Image saved to your photo library.');
    } catch (error) {
      console.error('Save image error:', error);
      Alert.alert('Error', 'Failed to save image. Please try again.');
    } finally {
      setSavingImage(false);
    }
  };

  const renderItem = ({ item }) => {
    // Date separator row
    if (item._separatorId) {
      return (
        <View style={styles.dateSeparatorRow}>
          <View style={styles.dateSeparatorLine} />
          <Text style={styles.dateSeparatorText}>{formatDateSeparator(item.date)}</Text>
          <View style={styles.dateSeparatorLine} />
        </View>
      );
    }

    // Regular message bubble
    const isOwn = item.senderId === currentUserId;
    return (
      <View style={[styles.messageRow, isOwn ? styles.rowOwn : styles.rowOther]}>
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther,
          item.type === 'image' && item.imageUrl ? styles.bubbleImage : null]}>
          {item.type === 'image' && item.imageUrl ? (
            <TouchableOpacity activeOpacity={0.85} onPress={() => setPreviewImageUrl(item.imageUrl)}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.imageMessage}
                resizeMode="cover"
                onError={(e) => console.error('Image failed to load:', e.nativeEvent.error, 'URL:', item.imageUrl)}
              />
            </TouchableOpacity>
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
          {avatar && decodeURIComponent(avatar) ? (
            <Image source={{ uri: decodeURIComponent(avatar) }} style={styles.headerAvatar} />
          ) : (
            <Image source={require('../../assets/profile_image.jpg')} style={styles.headerAvatar} />
          )}
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{name || 'Chat'}</Text>
            <Text style={[styles.headerStatus, statusText === 'Active now' && styles.headerStatusOnline]}>
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
          data={flatListData}
          keyExtractor={(item) => item._separatorId || item.messageId}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No messages yet. Say hi! 👋</Text>
            </View>
          }
        />
      )}

      {/* Full-screen image preview modal */}
      <Modal
        visible={!!previewImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.imagePreviewOverlay}>
          <TouchableOpacity style={styles.imagePreviewClose} onPress={() => setPreviewImageUrl(null)}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          {previewImageUrl && (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.imagePreviewFull}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity style={styles.imagePreviewSave} onPress={handleSaveImage} disabled={savingImage}>
            {savingImage
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Ionicons name="download-outline" size={22} color="#FFF" />
            }
            <Text style={styles.imagePreviewSaveText}>{savingImage ? 'Saving...' : 'Save to Gallery'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Attachment menu modal */}
      <Modal visible={showAttachMenu} transparent animationType="none" onRequestClose={() => setShowAttachMenu(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAttachMenu(false)} />
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
        </View>
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
  headerName: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  headerStatus: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  headerStatusOnline: { color: '#4CD964' },
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
  bubbleImage: { paddingHorizontal: 4, paddingVertical: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  textOwn: { color: '#FFF' },
  textOther: { color: '#333' },
  bubbleTime: { fontSize: 11, marginTop: 4 },
  timeOwn: { color: '#BFD0E8', textAlign: 'right' },
  timeOther: { color: '#999', textAlign: 'left' },
  imageMessage: { width: 200, height: 200, borderRadius: 10 },

  // Date separator
  dateSeparatorRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, paddingHorizontal: 8 },
  dateSeparatorLine: { flex: 1, height: 1, backgroundColor: '#D0D0D0' },
  dateSeparatorText: { fontSize: 12, color: '#888', marginHorizontal: 10, fontWeight: '500' },

  // Empty state
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 15, color: '#999' },

  // Attachment menu
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  attachMenu: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, flexDirection: 'row', justifyContent: 'space-around' },
  attachOption: { alignItems: 'center' },
  attachIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  attachLabel: { fontSize: 13, color: '#333', fontWeight: '500' },

  // Full-screen image preview
  imagePreviewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  imagePreviewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  imagePreviewFull: { width: '100%', height: '80%' },
  imagePreviewSave: { position: 'absolute', bottom: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, gap: 8 },
  imagePreviewSaveText: { color: '#FFF', fontSize: 15, fontWeight: '600' },

  // Input bar
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EAEAEA' },
  attachButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 15, color: '#333', marginRight: 8 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#002D5B', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#B0BEC5' },
});
