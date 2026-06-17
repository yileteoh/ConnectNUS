const { admin, db } = require('../config/firebase');

// Helper: build a deterministic conversation ID from two user IDs by sorting to ensure same string is returned
const buildConversationId = (uid1, uid2) => [uid1, uid2].sort().join('_');

// POST /api/chat/conversations
// Called when a user taps "Chat with Buddy" — finds or creates the conversation doc
const getOrCreateConversation = async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;
    const conversationId = buildConversationId(userId1, userId2);
    const convRef = db.collection('conversations').doc(conversationId);
    const convDoc = await convRef.get();

    if (convDoc.exists) {
      return res.status(200).json({ status: 'success', data: { conversationId, ...convDoc.data() } });
    }

    // Fetch both users' names and avatars so the inbox can display them without extra lookups
    const [user1Doc, user2Doc] = await Promise.all([
      db.collection('users').doc(userId1).get(),
      db.collection('users').doc(userId2).get(),
    ]);

    const user1 = user1Doc.data() || {};
    const user2 = user2Doc.data() || {};

    const newConversation = {
      participants: [userId1, userId2],
      participantInfo: {
        [userId1]: { name: user1.name || 'User', profilePicUrl: user1.profilePicUrl || '' },
        [userId2]: { name: user2.name || 'User', profilePicUrl: user2.profilePicUrl || '' },
      },
      lastMessage: null,
      lastMessageTime: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await convRef.set(newConversation);
    return res.status(201).json({ status: 'success', data: { conversationId, ...newConversation } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/chat/conversations/:userId
// Returns all conversations the user is part of, newest message first
const getConversations = async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection('conversations')
      .where('participants', 'array-contains', userId)
      .orderBy('lastMessageTime', 'desc')
      .get();

    const conversations = snapshot.docs.map((doc) => ({
      conversationId: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ status: 'success', data: conversations });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// GET /api/chat/messages/:conversationId
// Returns full message history for a conversation, oldest first
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const snapshot = await db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const messages = snapshot.docs.map((doc) => ({
      messageId: doc.id,
      ...doc.data(),
      // Convert Firestore Timestamp to a plain millisecond number so React Native can use it
      timestamp: doc.data().timestamp?.toMillis ? doc.data().timestamp.toMillis() : null,
    }));

    return res.status(200).json({ status: 'success', data: messages });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

// Non-route helper used by the Socket.io handler in server.js
// Saves a message to Firestore and updates the conversation's lastMessage preview
const saveMessage = async (conversationId, senderId, text, type = 'text', imageUrl = null, replyTo = null) => {
  const convRef = db.collection('conversations').doc(conversationId);
  const messagesRef = convRef.collection('messages');

  const messageData = {
    senderId,
    text,
    type,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (imageUrl) messageData.imageUrl = imageUrl;
  if (replyTo) messageData.replyTo = replyTo;

  const msgDoc = await messagesRef.add(messageData);

  // Preview text for inbox: image messages show a placeholder label
  const previewText = type === 'image' ? '📷 Photo' : text;
  await convRef.update({
    lastMessage: { text: previewText, senderId },
    lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    messageId: msgDoc.id,
    senderId,
    text,
    type,
    imageUrl,
    replyTo,
    timestamp: Date.now(),
  };
};

module.exports = { getOrCreateConversation, getConversations, getMessages, saveMessage };
