// Single source of truth for point values and level thresholds.
// Mirrored (display-only) in frontend/constants/points.js.
module.exports = {
  POINT_VALUES: {
    likeReceived: 2,
    forumPostCreated: 5,
    forumCommentCreated: 3,
    eventAttended: 10,
    eventHosted: 15,
    buddyMatched: 25,          // one-time per user
    profileSetupComplete: 10,  // one-time per user
    chatFirstMessage: 1        // one-time per (user, conversation) pair
  },

  LEVELS: [
    { level: 1, title: 'Freshie', threshold: 0 },
    { level: 2, title: 'Familiar Face', threshold: 50 },
    { level: 3, title: 'Campus Regular', threshold: 150 },
    { level: 4, title: 'Super Connector', threshold: 350 },
    { level: 5, title: 'Campus Icon', threshold: 700 },
    { level: 6, title: 'NUS Legend', threshold: 1500 }
  ]
};
