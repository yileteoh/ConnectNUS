const express = require('express');
const router = express.Router();
const { getOrCreateConversation, getConversations, getMessages } = require('../controllers/chatController');

router.post('/conversations', getOrCreateConversation);
router.get('/conversations/:userId', getConversations);
router.get('/messages/:conversationId', getMessages);

module.exports = router;
