const express = require('express');
const router = express.Router();

// Import route modules
const profileRoutes = require('./profileRoutes');
const eventRoutes = require('./eventRoutes');
const forumRoutes = require('./forumRoutes');
const buddyRoutes = require('./buddyRoutes');
const chatRoutes = require('./chatRoutes');

// Use the imported route modules
router.use('/', profileRoutes);
router.use('/', eventRoutes);
router.use('/', forumRoutes);
router.use('/buddy', buddyRoutes);
router.use('/chat', chatRoutes);

module.exports = router;
