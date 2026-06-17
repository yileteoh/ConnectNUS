import Constants from 'expo-constants';
import { io } from 'socket.io-client';
import * as FileSystem from 'expo-file-system/legacy';

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const BASE_URL = Constants.expoConfig?.extra?.backendUrl;

// Ensure a group chat conversation exists for an event; creates it if missing and adds the caller
export const ensureGroupConversation = async (eventId, eventTitle, userId, userName, userProfilePic) => {
  const response = await fetch(`${BASE_URL}/api/chat/group/${eventId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventTitle, userId, userName, userProfilePic }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message);
  return result.data;
};

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
export const sendSocketMessage = (conversationId, senderId, text, type = 'text', imageUrl = null, replyTo = null) => {
  if (socket) {
    socket.emit('send_message', { conversationId, senderId, text, type, imageUrl, replyTo });
  }
};

// Upload an image to Cloudinary and return its public download URL
export const uploadImage = async (localUri) => {
  const formData = new FormData();
  formData.append('file', { uri: localUri, type: 'image/jpeg', name: 'photo.jpg' });
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  const result = await response.json();
  if (!result.secure_url) {
    console.error('Cloudinary upload error:', result);
    throw new Error(result.error?.message || 'Upload failed');
  }
  return result.secure_url;
};

// Listen for incoming messages — returns an unsubscribe function to clean up on unmount
export const onMessage = (callback) => {
  if (socket) {
    socket.on('receive_message', callback);
    return () => socket.off('receive_message', callback);
  }
  return () => {};
};

// Broadcast an image message to other room members — no server-side Firestore save
// (the client saves directly to Firestore before calling this)
export const broadcastImage = (conversationId, senderId, imageUrl, messageId, timestamp) => {
  if (socket) {
    socket.emit('broadcast_image', { conversationId, senderId, imageUrl, messageId, timestamp });
  }
};

// Broadcast a reply-text message to other room members — no server-side Firestore save
// (the client saves directly to Firestore before calling this)
export const broadcastText = (conversationId, senderId, text, messageId, timestamp, replyTo) => {
  if (socket) {
    socket.emit('broadcast_text', { conversationId, senderId, text, messageId, timestamp, replyTo });
  }
};

// Upload a document to Cloudinary and return its URL.
// Images go to image/upload (renders correctly). Everything else (PDF, DOCX, etc.)
// goes to raw/upload which preserves the original bytes — image/upload corrupts PDFs
// by storing a rasterized rendition instead of the original file.
// Base64 read is required because RN fetch FormData does not reliably send
// DocumentPicker URIs as binary (results in 0-byte uploads).
export const uploadDocument = async (localUri, fileName, mimeType) => {
  const resourceType = mimeType?.startsWith('image/') ? 'image' : 'raw';

  const formData = new FormData();
  if (resourceType === 'image') {
    // Images: base64 data URI is reliable for image/upload
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
    formData.append('file', `data:${mimeType || 'image/jpeg'};base64,${base64}`);
  } else {
    // Non-image files: use the file URI directly so Cloudinary stores opaque bytes.
    // Sending as a base64 data URI causes Cloudinary to inspect ZIP magic bytes in
    // DOCX/XLSX files, extract internal paths like "word/document.xml", and reject
    // with "Display name cannot contain slashes".
    formData.append('file', { uri: localUri, type: 'application/octet-stream', name: 'upload' });
  }
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);


  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );
  const result = await response.json();
  if (!result.secure_url) {
    console.error('Cloudinary document upload error:', result);
    throw new Error(result.error?.message || 'Upload failed');
  }
  console.log('Cloudinary doc upload OK:', result.resource_type, result.format, result.bytes, result.secure_url);
  return result.secure_url;
};

// Broadcast a document message to other room members — no server-side Firestore save
export const broadcastDocument = (conversationId, senderId, documentUrl, documentName, messageId, timestamp) => {
  if (socket) {
    socket.emit('broadcast_document', { conversationId, senderId, documentUrl, documentName, messageId, timestamp });
  }
};

// Clear the unread badge for this user — call when inbox opens
export const markAsRead = async (userId) => {
  try {
    await fetch(`${BASE_URL}/api/chat/read/${userId}`, { method: 'PUT' });
  } catch (e) {}
};

// Disconnect when the user leaves the chat entirely
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
