const express = require('express');
const router = express.Router();

const profileRoutes = require('./profileRoutes');
const eventRoutes = require('./eventRoutes');
const forumRoutes = require('./forumRoutes');
const buddyRoutes = require('./buddyRoutes');

router.use('/', profileRoutes); 
router.use('/', eventRoutes);
router.use('/', forumRoutes);
router.use('/buddy', buddyRoutes);

module.exports = router;
