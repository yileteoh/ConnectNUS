// Display-only mirror of backend/config/badges.js (thresholds must stay in sync).
// icon/iconLib pick which @expo/vector-icons set profile.js should render with.
export const TIER_ORDER = ['bronze', 'silver', 'gold'];

export const TIER_COLORS = {
  bronze: { border: '#CD7F32', background: '#FBEEE6', icon: '#8C4A1E' },
  silver: { border: '#A8A8A8', background: '#F2F2F2', icon: '#5A5A5A' },
  gold: { border: '#D4AF37', background: '#FFF8E1', icon: '#8A6D1D' },
  locked: { border: '#CCC', background: '#F9F9F9', icon: '#666' },
};

export const BADGE_CATEGORIES = [
  {
    key: 'likesReceived',
    name: 'Popular Poster',
    iconLib: 'FontAwesome5',
    icon: 'thumbs-up',
    tiers: [
      { tier: 'bronze', threshold: 10 },
      { tier: 'silver', threshold: 50 },
      { tier: 'gold', threshold: 100 },
    ],
  },
  {
    key: 'eventsAttended',
    name: 'Event Explorer',
    iconLib: 'Ionicons',
    icon: 'compass',
    tiers: [
      { tier: 'bronze', threshold: 3 },
      { tier: 'silver', threshold: 10 },
      { tier: 'gold', threshold: 25 },
    ],
  },
  {
    key: 'eventsHosted',
    name: 'Event Host',
    iconLib: 'Ionicons',
    icon: 'calendar',
    tiers: [
      { tier: 'bronze', threshold: 1 },
      { tier: 'silver', threshold: 5 },
      { tier: 'gold', threshold: 15 },
    ],
  },
  {
    key: 'buddyMentorDays',
    name: 'Buddy Mentor',
    iconLib: 'FontAwesome5',
    icon: 'medal',
    tiers: [
      { tier: 'bronze', threshold: 7 },
      { tier: 'silver', threshold: 30 },
      { tier: 'gold', threshold: 90 },
    ],
  },
  {
    key: 'buddyBonder',
    name: 'Buddy Bonder',
    iconLib: 'Ionicons',
    icon: 'people',
    tiers: [], // one-time badge, no thresholds
  },
];

// Highest unlocked tier for a category, or null if locked. `badges` is profile.badges from Firestore.
export const getUnlockedTier = (categoryKey, badges = []) => {
  const entries = badges.filter((b) => b.category === categoryKey);
  if (entries.length === 0) return null;
  if (entries[0].tier === null) return 'unlocked'; // one-time badge
  return entries
    .map((b) => b.tier)
    .sort((a, b) => TIER_ORDER.indexOf(b) - TIER_ORDER.indexOf(a))[0];
};

// Short progress string shown under a locked/in-progress badge, e.g. "7/10 to Bronze".
export const getProgressText = (category, badgeCounts = {}, unlockedTier) => {
  if (category.tiers.length === 0) {
    return unlockedTier ? 'Unlocked' : 'Not yet unlocked';
  }
  if (unlockedTier === 'gold') return 'Maxed out';

  const count = badgeCounts[category.key] || 0;
  const nextTier = category.tiers.find((t) => t.threshold > count);
  if (!nextTier) return 'Maxed out';
  return `${count}/${nextTier.threshold} to ${nextTier.tier}`;
};
