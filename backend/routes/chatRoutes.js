const express = require('express');
const router = express.Router();
// Import the chat controller functions
const { getOrCreateConversation, getConversations, getMessages, markAsRead, ensureGroupConversation } = require('../controllers/chatController');

// Chat routes
router.post('/conversations', getOrCreateConversation);
router.post('/group/:eventId', ensureGroupConversation);
router.get('/conversations/:userId', getConversations);
router.get('/messages/:conversationId', getMessages);
router.put('/read/:conversationId/:userId', markAsRead);

module.exports = router;
