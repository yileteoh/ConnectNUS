// Single source of truth for badge categories and their tier thresholds.
// Mirrored (display-only) in frontend/constants/badges.js.
module.exports = {
  likesReceived: {
    name: 'Popular Poster',
    tiers: [
      { tier: 'bronze', threshold: 10 },
      { tier: 'silver', threshold: 50 },
      { tier: 'gold', threshold: 100 }
    ]
  },
  eventsAttended: {
    name: 'Event Explorer',
    tiers: [
      { tier: 'bronze', threshold: 3 },
      { tier: 'silver', threshold: 10 },
      { tier: 'gold', threshold: 25 }
    ]
  },
  eventsHosted: {
    name: 'Event Host',
    tiers: [
      { tier: 'bronze', threshold: 1 },
      { tier: 'silver', threshold: 5 },
      { tier: 'gold', threshold: 15 }
    ]
  },
  buddyMentorDays: {
    name: 'Buddy Mentor',
    tiers: [
      { tier: 'bronze', threshold: 7 },
      { tier: 'silver', threshold: 30 },
      { tier: 'gold', threshold: 90 }
    ]
  },
  // One-time badge: no tiers, just a single unlock.
  buddyBonder: {
    name: 'Buddy Bonder',
    tiers: []
  }
};
