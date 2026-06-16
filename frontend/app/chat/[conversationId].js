import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, Image, Platform, StatusBar, TextInput,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth } from '../../firebaseConfig';
import { getMessages, connectSocket, joinRoom, sendSocketMessage, onMessage, disconnectSocket } from '../../services/chatService';

// Formats a timestamp (ms) into HH:MM for display inside the chat room
const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function ChatRoomScreen() {
  const router = useRouter();
  const { conversationId, name } = useLocalSearchParams();
  const currentUserId = auth.currentUser?.uid;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    let unsubscribe = () => {};

    const setup = async () => {
      try {
        // 1. Load message history from Firestore via REST
        const history = await getMessages(conversationId);
        setMessages(history);
        setLoading(false);

        // 2. Connect to Socket.io and join this conversation's room
        connectSocket();
        joinRoom(conversationId);

        // 3. Listen for new incoming messages in real time
        unsubscribe = onMessage((newMsg) => {
          setMessages((prev) => [...prev, newMsg]);
        });
      } catch (error) {
        console.error('Failed to set up chat room:', error);
        setLoading(false);
      }
    };

    setup();

    // Clean up socket listener when the user leaves this screen
    return () => {
      unsubscribe();
      disconnectSocket();
    };
  }, [conversationId]);

  // Auto-scroll to the bottom whenever a new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendSocketMessage(conversationId, currentUserId, text);
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.senderId === currentUserId;
    return (
      <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>
            {item.text}
          </Text>
          <Text style={[styles.bubbleTime, isOwn ? styles.bubbleTimeOwn : styles.bubbleTimeOther]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Header with back button and buddy's name */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerName} numberOfLines={1}>{name || 'Chat'}</Text>
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

      {/* Text input + send button — rises above the keyboard */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputRow}>
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
  safeArea: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#002D5B', paddingHorizontal: 16, paddingVertical: 14 },
  backButton: { marginRight: 12 },
  headerName: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#FFF' },

  // Messages
  messageList: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 20 },
  messageRow: { marginBottom: 10, flexDirection: 'row' },
  messageRowOwn: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },

  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleOwn: { backgroundColor: '#002D5B', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#FFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#EAEAEA' },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextOwn: { color: '#FFF' },
  bubbleTextOther: { color: '#333' },
  bubbleTime: { fontSize: 11, marginTop: 4 },
  bubbleTimeOwn: { color: '#BFD0E8', textAlign: 'right' },
  bubbleTimeOther: { color: '#999', textAlign: 'left' },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 15, color: '#999' },

  // Input bar
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EAEAEA' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: '#F5F5F5', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#333', marginRight: 10 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#002D5B', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#B0BEC5' },
});
