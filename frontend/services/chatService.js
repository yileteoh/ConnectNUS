import Constants from 'expo-constants';
import { io } from 'socket.io-client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

const BASE_URL = Constants.expoConfig?.extra?.backendUrl;

// Find or create a 1-on-1 conversation between two buddies
export const getOrCreateConversation = async (userId1, userId2) => {
  try {
    const response = await fetch(`${BASE_URL}/api/chat/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId1, userId2 }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result.data; // { conversationId, participants, participantInfo, ... }
  } catch (error) {
    throw error;
  }
};

// Load the inbox — all conversations this user is part of
export const getConversations = async (userId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/chat/conversations/${userId}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result.data || [];
  } catch (error) {
    throw error;
  }
};

// Load full message history for a conversation (called when opening a chat room)
export const getMessages = async (conversationId) => {
  try {
    const response = await fetch(`${BASE_URL}/api/chat/messages/${conversationId}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message);
    return result.data || [];
  } catch (error) {
    throw error;
  }
};

// Socket.io helpers
// Single shared socket instance — created once, reused across screens
let socket = null;

// Connect to the backend Socket.io server (call once when entering any chat screen)
export const connectSocket = () => {
  if (!socket || !socket.connected) {
    socket = io(BASE_URL, { transports: ['websocket'] });
  }
  return socket;
};

// Tell the server which conversation room to join
export const joinRoom = (conversationId) => {
  if (socket) {
    socket.emit('join_room', { conversationId });
  }
};

// Send a text or image message through the socket
export const sendSocketMessage = (conversationId, senderId, text, type = 'text', imageUrl = null) => {
  if (socket) {
    socket.emit('send_message', { conversationId, senderId, text, type, imageUrl });
  }
};

// Upload an image to Firebase Storage and return its public download URL
export const uploadImage = async (localUri) => {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const filename = `chat_images/${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
};

// Listen for incoming messages — returns an unsubscribe function to clean up on unmount
export const onMessage = (callback) => {
  if (socket) {
    socket.on('receive_message', callback);
    return () => socket.off('receive_message', callback);
  }
  return () => {};
};

// Disconnect when the user leaves the chat entirely
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
