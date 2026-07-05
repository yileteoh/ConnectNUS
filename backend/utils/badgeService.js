const { db } = require('../config/firebase');
const badgeConfig = require('../config/badges');
const { sendNotification } = require('./notificationHelper');

// Firestore doesn't allow FieldValue.serverTimestamp() inside array elements, so badge
// entries use a plain ISO string for unlockedAt instead of a Timestamp sentinel.
const now = () => new Date().toISOString();

// Bump a counter-backed badge category by `incrementBy` and award any newly-crossed tier(s).
// Read-then-write inside a transaction (no FieldValue.increment - keeps parity with the
// rest of the codebase's counter style and with the test firestore mock).
const awardProgress = async (userId, category, incrementBy = 1) => {
  const config = badgeConfig[category];
  const userRef = db.collection('users').doc(userId);
  let newlyUnlocked = [];

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef);
    if (!doc.exists) return;

    const data = doc.data();
    const badgeCounts = { ...(data.badgeCounts || {}) };
    const oldCount = badgeCounts[category] || 0;
    const newCount = oldCount + incrementBy;
    badgeCounts[category] = newCount;

    const existingBadges = data.badges || [];
    const alreadyUnlockedTiers = new Set(
      existingBadges.filter((b) => b.category === category).map((b) => b.tier)
    );

    const badgesToAdd = config.tiers
      .filter((t) => newCount >= t.threshold && oldCount < t.threshold && !alreadyUnlockedTiers.has(t.tier))
      .map((t) => ({
        id: `${category}_${t.tier}`,
        category,
        tier: t.tier,
        name: config.name,
        unlockedAt: now()
      }));

    transaction.update(userRef, {
      badgeCounts,
      badges: [...existingBadges, ...badgesToAdd]
    });

    newlyUnlocked = badgesToAdd;
  });

  for (const badge of newlyUnlocked) {
    await sendNotification({
      userId,
      title: 'Badge unlocked!',
      body: `You earned the ${badge.tier} "${badge.name}" badge.`,
      type: 'badge',
      referenceId: badge.id
    });
  }

  return newlyUnlocked;
};

// Award a non-tiered, one-time badge (e.g. Buddy Bonder). No-op if already unlocked.
const unlockOnce = async (userId, category) => {
  const config = badgeConfig[category];
  const userRef = db.collection('users').doc(userId);
  let badge = null;

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef);
    if (!doc.exists) return;

    const existingBadges = doc.data().badges || [];
    if (existingBadges.some((b) => b.category === category)) return;

    badge = { id: category, category, tier: null, name: config.name, unlockedAt: now() };
    transaction.update(userRef, { badges: [...existingBadges, badge] });
  });

  if (badge) {
    await sendNotification({
      userId,
      title: 'Badge unlocked!',
      body: `You earned the "${badge.name}" badge.`,
      type: 'badge',
      referenceId: badge.id
    });
  }

  return badge;
};

// Rank buddy seniority off the profile YEAR_OPTIONS scale to decide who is the
// mentor (senior) vs mentee (junior) in a matched pair. Returns null on a tie.
const YEAR_RANK = { 'Year 1': 1, 'Year 2': 2, 'Year 3': 3, 'Year 4': 4, 'Year 5+': 5, 'Graduate': 6 };

const getSeniorPartner = (userAId, yearA, userBId, yearB) => {
  const rankA = YEAR_RANK[yearA] || 0;
  const rankB = YEAR_RANK[yearB] || 0;
  if (rankA === rankB) return null;
  return rankA > rankB
    ? { seniorId: userAId, juniorId: userBId }
    : { seniorId: userBId, juniorId: userAId };
};

module.exports = { awardProgress, unlockOnce, getSeniorPartner };
