const express = require('express');
const router = express.Router();
// Import the buddy controller functions
const { getRecommendations, sendBuddyRequest, acceptBuddyRequest, removeBuddy, checkBuddyStatus, 
    getPendingRequests, getMyBuddyProfile, declineBuddyRequest } = require('../controllers/buddyController');

// Buddy routes
router.get('/recommendations/:userId', getRecommendations);
router.get('/status', checkBuddyStatus);
router.post('/request', sendBuddyRequest);
router.put('/accept', acceptBuddyRequest);
router.post('/remove', removeBuddy);
router.get('/requests/:userId', getPendingRequests);
router.get('/mybuddy/:userId', getMyBuddyProfile);
router.delete('/request/:requestId', declineBuddyRequest);

module.exports = router;