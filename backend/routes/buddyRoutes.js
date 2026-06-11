const express = require('express');
const router = express.Router();
const { getRecommendations, sendBuddyRequest, acceptBuddyRequest, removeBuddy, checkBuddyStatus } = require('../controllers/buddyController');

router.get('/recommendations/:userId', getRecommendations);
router.get('/status', checkBuddyStatus);
router.post('/request', sendBuddyRequest);
router.put('/accept', acceptBuddyRequest);
router.post('/remove', removeBuddy);

module.exports = router;