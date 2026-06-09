const registerProfileRoutes = require('./profileRoutes');
const registerEventRoutes = require('./eventRoutes');
const registerForumRoutes = require('./forumRoutes');

module.exports = function registerRoutes(app, context) {
  registerProfileRoutes(app, context);
  registerEventRoutes(app, context);
  registerForumRoutes(app, context);
};
