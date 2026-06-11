const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

router.post('/register', profileController.registerUser);
router.put('/profile', profileController.updateProfile);
router.get('/profile/:userId', profileController.getProfile);
router.post('/profile/feedback', profileController.submitFeedback);
router.delete('/profile/:userId', profileController.deleteProfile);

module.exports = router;