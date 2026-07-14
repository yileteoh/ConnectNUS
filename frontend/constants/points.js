// Display-only mirror of backend/config/points.js (thresholds must stay in sync).
export const LEVELS = [
  { level: 1, title: 'Freshie', threshold: 0 },
  { level: 2, title: 'Familiar Face', threshold: 50 },
  { level: 3, title: 'Campus Regular', threshold: 150 },
  { level: 4, title: 'Super Connector', threshold: 350 },
  { level: 5, title: 'Campus Icon', threshold: 700 },
  { level: 6, title: 'NUS Legend', threshold: 1500 },
];

// Returns the current level plus progress toward the next one (or null nextLevel if maxed).
export const getLevel = (points = 0) => {
  let current = LEVELS[0];
  let currentIndex = 0;
  LEVELS.forEach((lvl, index) => {
    if (points >= lvl.threshold) {
      current = lvl;
      currentIndex = index;
    }
  });

  const nextLevel = LEVELS[currentIndex + 1] || null;
  const progress = nextLevel
    ? (points - current.threshold) / (nextLevel.threshold - current.threshold)
    : 1;

  return { ...current, nextLevel, progress: Math.max(0, Math.min(1, progress)) };
};
