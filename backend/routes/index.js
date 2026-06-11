const express = require('express');
const router = express.Router();

const profileRoutes = require('./profileRoutes');
const eventRoutes = require('./eventRoutes');
const forumRoutes = require('./forumRoutes');

router.use('/', profileRoutes); 
router.use('/', eventRoutes);
router.use('/', forumRoutes);

module.exports = router;
