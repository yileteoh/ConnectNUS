const express = require('express');
const router = express.Router();
const { getOrCreateConversation, getConversations, getMessages, markAsRead, ensureGroupConversation } = require('../controllers/chatController');

router.post('/conversations', getOrCreateConversation);
router.post('/group/:eventId', ensureGroupConversation);
router.get('/conversations/:userId', getConversations);
router.get('/messages/:conversationId', getMessages);
router.put('/read/:userId', markAsRead);

module.exports = router;
