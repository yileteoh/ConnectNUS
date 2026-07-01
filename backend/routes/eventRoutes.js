const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

router.post('/events', eventController.createEvent);
router.get('/events', eventController.getEvents);
router.get('/events/:eventId', eventController.getEventById);
router.put('/events/:eventId/join', eventController.joinEvent);
router.put('/events/:eventId/leave', eventController.leaveEvent);
router.delete('/events/:eventId', eventController.deleteEvent);
router.put('/events/:eventId', eventController.updateEvent);
router.get('/recommendations/:userId', eventController.getAIRecommendedEvents);

module.exports = router;