import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable,
  SafeAreaView, Image, Platform, StatusBar, TextInput,
  KeyboardAvoidingView, ActivityIndicator, Alert, Modal, Dimensions, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { doc, onSnapshot, collection, addDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, increment, getDocs, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import {
  getMessages, connectSocket, joinRoom,
  sendSocketMessage, broadcastImage, broadcastText, broadcastDocument,
  onMessage, disconnectSocket, uploadImage, uploadDocument,
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
  const [scrollReady, setScrollReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [otherUserStatus, setOtherUserStatus] = useState({ isOnline: false, lastSeen: null });
  const [displayName, setDisplayName] = useState(name ? decodeURIComponent(name) : '');
  const [displayAvatar, setDisplayAvatar] = useState(avatar ? decodeURIComponent(avatar) : '');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [savingImage, setSavingImage] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [longMessages, setLongMessages] = useState(new Set());
  const [replyingTo, setReplyingTo] = useState(null);
  const [actionMenu, setActionMenu] = useState(null); // { item, pageY }
  const flatListRef = useRef(null);
  const initialScrollDone = useRef(false);

  const isGroup = conversationId?.startsWith('event_');
  const eventId = isGroup ? conversationId.replace('event_', '') : null;
  const [participantInfo, setParticipantInfo] = useState({});
  const [myAvatar, setMyAvatar] = useState('');

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

  // Load own avatar (shown on the right side of own messages in group chats)
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = onSnapshot(doc(db, 'users', currentUserId), (snap) => {
      if (snap.exists() && snap.data().profilePicUrl) setMyAvatar(snap.data().profilePicUrl);
    });
    return unsub;
  }, [currentUserId]);

  // Listen to the other user's profile + online status in real time (1-on-1 only)
  useEffect(() => {
    if (!otherId) return;
    const unsubscribe = onSnapshot(doc(db, 'users', otherId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setOtherUserStatus({
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen || null,
        });
        if (data.name) setDisplayName(data.name);
        if (data.profilePicUrl) setDisplayAvatar(data.profilePicUrl);
      }
    });
    return unsubscribe;
  }, [otherId]);

  // Reset this conversation's unread count for the current user when the chat room opens
  useEffect(() => {
    if (!currentUserId || !conversationId) return;
    setDoc(doc(db, 'conversations', conversationId), {
      [`unreadCounts.${currentUserId}`]: 0,
    }, { merge: true }).catch(() => {});
  }, [conversationId, currentUserId]);

  // Load message history and connect socket
  useEffect(() => {
    let unsubscribeMessages = () => {};

    const setup = async () => {
      try {
        const history = await getMessages(conversationId);
        setMessages(history);
        // For group chats, load participant names + avatars from the conversation doc
        if (isGroup) {
          const convDoc = await getDoc(doc(db, 'conversations', conversationId));
          if (convDoc.exists()) setParticipantInfo(convDoc.data().participantInfo || {});
        }
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

  // Initial scroll: keep showing the spinner until FlatList has measured all items
  // and scrolled to the bottom, then reveal the list already at the correct position.
  useEffect(() => {
    if (!loading) {
      if (messages.length === 0) {
        setScrollReady(true);
        initialScrollDone.current = true;
      } else {
        const t = setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
          initialScrollDone.current = true;
          setScrollReady(true);
        }, 400);
        return () => clearTimeout(t);
      }
    }
  }, [loading]);

  // Subsequent messages: smooth scroll after initial load is done
  useEffect(() => {
    if (initialScrollDone.current && messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    const replyTo = replyingTo
      ? { messageId: replyingTo.messageId, senderId: replyingTo.senderId, text: replyingTo.text || '', type: replyingTo.type || 'text' }
      : null;
    setReplyingTo(null);
    const timestamp = Date.now();

    if (replyTo) {
      // Reply message: write directly to Firestore so replyTo is always persisted
      try {
        const msgRef = await addDoc(
          collection(db, 'conversations', conversationId, 'messages'),
          { senderId: currentUserId, text, type: 'text', replyTo, timestamp: serverTimestamp() }
        );
        await setDoc(doc(db, 'conversations', conversationId), {
          lastMessage: { text, senderId: currentUserId },
          lastMessageTime: serverTimestamp(),
        }, { merge: true });
        setMessages((prev) => [...prev, { messageId: msgRef.id, senderId: currentUserId, text, type: 'text', replyTo, timestamp }]);
        broadcastText(conversationId, currentUserId, text, msgRef.id, timestamp, replyTo);
        if (otherId) setDoc(doc(db, 'conversations', conversationId), { [`unreadCounts.${otherId}`]: increment(1) }, { merge: true }).catch(() => {});
      } catch (e) {
        Alert.alert('Error', 'Failed to send message.');
      }
    } else {
      // Regular text: existing socket flow (server saves to Firestore)
      setMessages((prev) => [...prev, { messageId: `local_${timestamp}`, senderId: currentUserId, text, type: 'text', timestamp }]);
      sendSocketMessage(conversationId, currentUserId, text, 'text', null, null);
      if (otherId) setDoc(doc(db, 'conversations', conversationId), { [`unreadCounts.${otherId}`]: increment(1) }, { merge: true }).catch(() => {});
    }
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
      const imageReplyTo = replyingTo
        ? { messageId: replyingTo.messageId, senderId: replyingTo.senderId, text: replyingTo.text || '', type: replyingTo.type || 'text' }
        : null;
      setReplyingTo(null);
      const msgRef = await addDoc(
        collection(db, 'conversations', conversationId, 'messages'),
        { senderId: currentUserId, text: '', type: 'image', imageUrl, ...(imageReplyTo && { replyTo: imageReplyTo }), timestamp: serverTimestamp() }
      );
      await setDoc(doc(db, 'conversations', conversationId), {
        lastMessage: { text: '📷 Photo', senderId: currentUserId },
        lastMessageTime: serverTimestamp(),
      }, { merge: true });

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
      if (otherId) setDoc(doc(db, 'conversations', conversationId), { [`unreadCounts.${otherId}`]: increment(1) }, { merge: true }).catch(() => {});
    } catch (error) {
      console.error('Image upload error:', error?.code, error?.message, error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlePickDocument = () => {
    setShowAttachMenu(false);
    setTimeout(() => launchDocumentPicker(), 400);
  };

  const launchDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      setUploading(true);
      const documentUrl = await uploadDocument(asset.uri, asset.name, asset.mimeType);
      const docReplyTo = replyingTo
        ? { messageId: replyingTo.messageId, senderId: replyingTo.senderId, text: replyingTo.text || '', type: replyingTo.type || 'text' }
        : null;
      setReplyingTo(null);
      const msgRef = await addDoc(
        collection(db, 'conversations', conversationId, 'messages'),
        { senderId: currentUserId, text: '', type: 'document', documentUrl, documentName: asset.name, ...(docReplyTo && { replyTo: docReplyTo }), timestamp: serverTimestamp() }
      );
      await setDoc(doc(db, 'conversations', conversationId), {
        lastMessage: { text: `📄 ${asset.name}`, senderId: currentUserId },
        lastMessageTime: serverTimestamp(),
      }, { merge: true });
      const timestamp = Date.now();
      setMessages((prev) => [...prev, { messageId: msgRef.id, senderId: currentUserId, text: '', type: 'document', documentUrl, documentName: asset.name, timestamp }]);
      broadcastDocument(conversationId, currentUserId, documentUrl, asset.name, msgRef.id, timestamp);
      if (otherId) setDoc(doc(db, 'conversations', conversationId), { [`unreadCounts.${otherId}`]: increment(1) }, { merge: true }).catch(() => {});
    } catch (error) {
      Alert.alert('Error', `Failed to send document: ${error?.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLongPress = (item, event) => {
    setActionMenu({ item, pageY: event.nativeEvent.pageY });
  };

  const handleDeleteMessage = async (item) => {
    try {
      await deleteDoc(doc(db, 'conversations', conversationId, 'messages', item.messageId));
      setMessages((prev) => prev.filter((m) => m.messageId !== item.messageId));

      const convRef = doc(db, 'conversations', conversationId);

      // Refresh lastMessage on the conversation so the inbox preview stays accurate
      const snap = await getDocs(
        query(collection(db, 'conversations', conversationId, 'messages'), orderBy('timestamp', 'desc'), limit(1))
      );
      if (snap.empty) {
        await setDoc(convRef, { lastMessage: null, lastMessageTime: null }, { merge: true });
      } else {
        const d = snap.docs[0].data();
        const preview = d.type === 'image' ? '📷 Photo'
          : d.type === 'document' ? `📄 ${d.documentName || 'Document'}`
          : (d.text || '');
        await setDoc(convRef, {
          lastMessage: { text: preview, senderId: d.senderId },
          lastMessageTime: d.timestamp,
        }, { merge: true });
      }

      // If own message deleted, decrement the recipient's unread count (floor 0)
      if (item.senderId === currentUserId && otherId) {
        const convSnap = await getDoc(convRef);
        const theirUnread = convSnap.data()?.unreadCounts?.[otherId] || 0;
        if (theirUnread > 0) {
          await setDoc(convRef, { [`unreadCounts.${otherId}`]: increment(-1) }, { merge: true });
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete message.');
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

  const getDocTypeLabel = (fileName) => fileName?.split('.').pop()?.toUpperCase() || 'FILE';
  const getDocTypeColor = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '#E53935';
    if (['doc', 'docx'].includes(ext)) return '#1565C0';
    if (['xls', 'xlsx'].includes(ext)) return '#2E7D32';
    if (['ppt', 'pptx'].includes(ext)) return '#F57F17';
    if (ext === 'txt') return '#546E7A';
    return '#455A64';
  };

  const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const isURL = (s) => /^(https?:\/\/|www\.)/i.test(s);
  const renderText = (text, textStyle, linkStyle) => {
    const parts = text.split(URL_REGEX);
    return parts.map((part, i) => {
      if (!isURL(part)) return <Text key={i} style={textStyle}>{part}</Text>;
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <Text key={i} style={linkStyle} onPress={() => Linking.openURL(href)}>
          {part}
        </Text>
      );
    });
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
    const isLong = longMessages.has(item.messageId);
    const isExpanded = expandedMessages.has(item.messageId);

    // Group chat: resolve sender info for other participants
    const senderInfo = isGroup && !isOwn ? (participantInfo[item.senderId] || {}) : {};
    const senderName = senderInfo.name || 'User';
    const senderAvatar = senderInfo.profilePicUrl;

    const renderAvatar = (uri) => uri
      ? <Image source={{ uri }} style={styles.groupMsgAvatar} />
      : <Image source={require('../../assets/profile_image.jpg')} style={styles.groupMsgAvatar} />;

    const bubble = (
      <Pressable
        style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther,
          item.type === 'image' && item.imageUrl ? styles.bubbleImage : null]}
        onLongPress={(e) => handleLongPress(item, e)}
        delayLongPress={350}
      >
          {item.replyTo && (
            <View style={[styles.replyQuote, isOwn ? styles.replyQuoteOwn : styles.replyQuoteOther]}>
              <Text style={styles.replyQuoteName}>
                {item.replyTo.senderId === currentUserId ? 'You'
                  : isGroup ? (participantInfo[item.replyTo.senderId]?.name || 'User')
                  : (name || 'User')}
              </Text>
              <Text style={isOwn ? styles.replyQuoteTextOwn : styles.replyQuoteTextOther} numberOfLines={1}>
                {item.replyTo.type === 'image' ? '📷 Photo' : item.replyTo.type === 'document' ? '📄 Document' : item.replyTo.text}
              </Text>
            </View>
          )}
          {item.type === 'image' && item.imageUrl ? (
            <TouchableOpacity activeOpacity={0.85} onPress={() => setPreviewImageUrl(item.imageUrl)}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.imageMessage}
                resizeMode="cover"
                onError={(e) => console.error('Image failed to load:', e.nativeEvent.error, 'URL:', item.imageUrl)}
              />
            </TouchableOpacity>
          ) : item.type === 'document' && item.documentUrl ? (
            <TouchableOpacity
              style={styles.documentCard}
              onPress={async () => {
                try {
                  if (item.documentUrl.includes('/image/upload/')) {
                    // Image files have correct content-type and extension — open inline
                    WebBrowser.openBrowserAsync(item.documentUrl);
                  } else {
                    // Raw files (PDF, DOCX, etc.) — download to cache with the correct
                    // filename so the OS knows the file type, then share via native sheet
                    const fileName = item.documentName || 'document';
                    const localUri = FileSystem.cacheDirectory + fileName;
                    setUploading(true);
                    const { uri } = await FileSystem.downloadAsync(item.documentUrl, localUri);
                    setUploading(false);
                    await Sharing.shareAsync(uri, { dialogTitle: fileName });
                  }
                } catch (e) {
                  setUploading(false);
                  Alert.alert('Error', 'Failed to open document.');
                }
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.docTypeBox, { backgroundColor: getDocTypeColor(item.documentName) }]}>
                <Text style={styles.docTypeText}>{getDocTypeLabel(item.documentName)}</Text>
              </View>
              <View style={styles.docInfo}>
                <Text
                  style={[styles.docFileName, isOwn ? styles.docFileNameOwn : styles.docFileNameOther]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {item.documentName || 'Document'}
                </Text>
                <Text style={[styles.docSubLabel, isOwn ? styles.docSubLabelOwn : styles.docSubLabelOther]}>
                  {getDocTypeLabel(item.documentName)} · Tap to open
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <>
              <Text
                style={[styles.bubbleText, isOwn ? styles.textOwn : styles.textOther]}
                numberOfLines={isExpanded ? undefined : 5}
                onTextLayout={(e) => {
                  if (!isExpanded && !longMessages.has(item.messageId)) {
                    const rendered = e.nativeEvent.lines.reduce((s, l) => s + l.text.length, 0);
                    if (item.text && rendered < item.text.trimEnd().length) {
                      setLongMessages((prev) => new Set([...prev, item.messageId]));
                    }
                  }
                }}
              >
                {renderText(
                  item.text,
                  isOwn ? styles.textOwn : styles.textOther,
                  isOwn ? styles.linkOwn : styles.linkOther,
                )}
              </Text>
              {isLong && (
                <TouchableOpacity
                  onPress={() => setExpandedMessages((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.messageId)) next.delete(item.messageId);
                    else next.add(item.messageId);
                    return next;
                  })}
                  style={styles.showMoreButton}
                >
                  <Text style={isOwn ? styles.showMoreOwn : styles.showMoreOther}>
                    {isExpanded ? 'Show less' : 'Show more'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
          <Text style={[styles.bubbleTime, isOwn ? styles.timeOwn : styles.timeOther]}>
            {formatMessageTime(item.timestamp)}
          </Text>
        </Pressable>
    );

    return (
      <View style={[styles.messageRow, isOwn ? styles.rowOwn : styles.rowOther]}>
        {isGroup && !isOwn && (
          <View style={styles.groupMsgAvatarWrap}>{renderAvatar(senderAvatar)}</View>
        )}
        {isGroup ? (
          <View style={[styles.bubbleCol, isOwn ? styles.bubbleColOwn : styles.bubbleColOther]}>
            {!isOwn && <Text style={styles.groupSenderName}>{senderName}</Text>}
            {bubble}
          </View>
        ) : bubble}
        {isGroup && isOwn && (
          <View style={styles.groupMsgAvatarWrap}>{renderAvatar(myAvatar)}</View>
        )}
      </View>
    );
  };

  const statusText = formatLastSeen(otherUserStatus.isOnline, otherUserStatus.lastSeen);

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() => isGroup ? router.push(`/event-details/${eventId}`) : otherId && router.push(`/user/${otherId}`)}
          activeOpacity={0.7}
        >
          {isGroup ? (
            <View style={styles.groupHeaderIcon}>
              <Ionicons name="people" size={20} color="#FFF" />
            </View>
          ) : displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={styles.headerAvatar} />
          ) : (
            <Image source={require('../../assets/profile_image.jpg')} style={styles.headerAvatar} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>{displayName || 'Group Chat'}</Text>
            {isGroup ? (
              <Text style={styles.headerStatus}>Tap to view event</Text>
            ) : (
              <Text style={[styles.headerStatus, statusText === 'Active now' && styles.headerStatusOnline]}>
                {statusText}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {!isGroup && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Voice calls will be available in a future update.')} style={styles.headerIcon}>
              <Ionicons name="call-outline" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Video calls will be available in a future update.')} style={styles.headerIcon}>
              <Ionicons name="videocam-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Message list — FlatList is always mounted once data loads so the ref is
          valid when scrollToEnd fires. Opacity hides it until the initial scroll
          is done; the spinner overlays on top during that brief window. */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#002D5B" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={flatListData}
            keyExtractor={(item) => item._separatorId || item.messageId}
            renderItem={renderItem}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            style={{ opacity: scrollReady ? 1 : 0 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No messages yet. Say hi! 👋</Text>
              </View>
            }
          />
          {!scrollReady && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#002D5B" />
            </View>
          )}
        </View>
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

      {/* Floating long-press action menu */}
      <Modal visible={!!actionMenu} transparent animationType="fade" onRequestClose={() => setActionMenu(null)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setActionMenu(null)} />
        {actionMenu && (() => {
          const { item, pageY } = actionMenu;
          const screenH = Dimensions.get('window').height;
          const isOwn = item.senderId === currentUserId;
          const canDelete = isOwn && item.messageId && !item.messageId.startsWith('local_');
          const rowCount = (item.type === 'text' && item.text ? 1 : 0) + 1 + (canDelete ? 1 : 0);
          const menuH = rowCount * 52;
          const top = pageY > screenH / 2 ? pageY - menuH - 12 : pageY + 12;
          return (
            <View style={[styles.actionMenuCard, { top }]}>
              {item.text ? (
                <TouchableOpacity style={styles.actionMenuRow} onPress={() => { Clipboard.setStringAsync(item.text); setActionMenu(null); }}>
                  <Ionicons name="copy-outline" size={18} color="#333" />
                  <Text style={styles.actionMenuLabel}>Copy</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.actionMenuRow} onPress={() => { setReplyingTo(item); setActionMenu(null); }}>
                <Ionicons name="return-up-back-outline" size={18} color="#333" />
                <Text style={styles.actionMenuLabel}>Reply</Text>
              </TouchableOpacity>
              {canDelete ? (
                <TouchableOpacity style={[styles.actionMenuRow, styles.actionMenuRowLast]} onPress={() => {
                  setActionMenu(null);
                  Alert.alert('Delete message', 'This will remove the message for everyone.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDeleteMessage(item) },
                  ]);
                }}>
                  <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                  <Text style={[styles.actionMenuLabel, { color: '#FF3B30' }]}>Delete</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })()}
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
            <TouchableOpacity style={styles.attachOption} onPress={handlePickDocument}>
              <View style={[styles.attachIcon, { backgroundColor: '#2e7d32' }]}>
                <Ionicons name="document-text-outline" size={24} color="#FFF" />
              </View>
              <Text style={styles.attachLabel}>Document</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reply preview bar */}
      {replyingTo && (
        <View style={styles.replyBar}>
          <View style={styles.replyBarContent}>
            <Text style={styles.replyBarName}>
              {replyingTo.senderId === currentUserId ? 'You'
                : isGroup ? (participantInfo[replyingTo.senderId]?.name || 'User')
                : (name || 'User')}
            </Text>
            <Text style={styles.replyBarText} numberOfLines={1}>
              {replyingTo.type === 'image' ? '📷 Photo' : replyingTo.type === 'document' ? '📄 Document' : replyingTo.text}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyBarClose}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      )}

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
  groupHeaderIcon: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  headerStatus: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 1 },
  headerStatusOnline: { color: '#4CD964' },
  headerActions: { flexDirection: 'row' },
  headerIcon: { marginLeft: 16 },

  // Group chat message avatars
  groupMsgAvatarWrap: { width: 32, height: 32, marginHorizontal: 6, alignSelf: 'flex-end' },
  groupMsgAvatar: { width: 32, height: 32, borderRadius: 16 },
  groupSenderName: { fontSize: 11, fontWeight: '700', color: '#F28C28', marginBottom: 2, marginLeft: 2 },
  bubbleCol: { flex: 1 },
  bubbleColOwn: { alignItems: 'flex-end' },
  bubbleColOther: { alignItems: 'flex-start' },

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
  documentCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, width: 210 },
  docTypeBox: { width: 44, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10, flexShrink: 0 },
  docTypeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  docInfo: { flex: 1 },
  docFileName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  docFileNameOwn: { color: '#FFF' },
  docFileNameOther: { color: '#002D5B' },
  docSubLabel: { fontSize: 11, marginTop: 2 },
  docSubLabelOwn: { color: 'rgba(255,255,255,0.65)' },
  docSubLabelOther: { color: '#888' },
  showMoreButton: { marginTop: 4 },
  showMoreOwn: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  showMoreOther: { fontSize: 13, fontWeight: '600', color: '#002D5B' },
  linkOwn: { color: 'rgba(255,255,255,0.9)', textDecorationLine: 'underline' },
  linkOther: { color: '#1a5fb4', textDecorationLine: 'underline' },

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

  // Floating action menu (long press)
  actionMenuCard: { position: 'absolute', left: 24, right: 24, backgroundColor: '#FFF', borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 10, overflow: 'hidden' },
  actionMenuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 15, gap: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEBEB' },
  actionMenuRowLast: { borderBottomWidth: 0 },
  actionMenuLabel: { fontSize: 15, color: '#222', fontWeight: '500' },

  // Reply quote inside bubble
  replyQuote: { borderRadius: 6, padding: 6, marginBottom: 6, borderLeftWidth: 3 },
  replyQuoteOwn: { backgroundColor: 'rgba(255,255,255,0.15)', borderLeftColor: 'rgba(255,255,255,0.6)' },
  replyQuoteOther: { backgroundColor: 'rgba(0,45,91,0.08)', borderLeftColor: '#002D5B' },
  replyQuoteName: { fontSize: 11, fontWeight: '700', color: '#F28C28', marginBottom: 2 },
  replyQuoteTextOwn: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  replyQuoteTextOther: { fontSize: 12, color: '#555' },

  // Reply bar above input
  replyBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4FF', borderTopWidth: 1, borderTopColor: '#D0D8F0', paddingHorizontal: 14, paddingVertical: 8 },
  replyBarContent: { flex: 1 },
  replyBarName: { fontSize: 12, fontWeight: '700', color: '#002D5B', marginBottom: 2 },
  replyBarText: { fontSize: 13, color: '#555' },
  replyBarClose: { padding: 4, marginLeft: 8 },

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
