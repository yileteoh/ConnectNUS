const express = require('express');
const router = express.Router();
const { getRecommendations, sendBuddyRequest, acceptBuddyRequest, removeBuddy, checkBuddyStatus, getPendingRequests, getMyBuddyProfile } = require('../controllers/buddyController');

router.get('/recommendations/:userId', getRecommendations);
router.get('/status', checkBuddyStatus);
router.post('/request', sendBuddyRequest);
router.put('/accept', acceptBuddyRequest);
router.post('/remove', removeBuddy);
router.get('/requests/:userId', getPendingRequests);
router.get('/mybuddy/:userId', getMyBuddyProfile);

module.exports = router;