const { db } = require('../config/firebase');
const { POINT_VALUES, LEVELS } = require('../config/points');
const { sendNotification } = require('./notificationHelper');

// Highest level whose threshold has been reached by `points`
const getLevel = (points) => {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (points >= lvl.threshold) current = lvl;
  }
  return current;
};

const notifyLevelUp = async (userId, level) => {
  await sendNotification({
    userId,
    title: 'Level up!',
    body: `You reached Level ${level.level}: ${level.title}!`,
    type: 'points',
    referenceId: `level_${level.level}`
  });
};

// Bump a user's cumulative points for a repeatable action (e.g. receiving a like).
// Read-then-write inside a transaction, same convention as badgeService.awardProgress.
const awardPoints = async (userId, actionKey) => {
  const amount = POINT_VALUES[actionKey];
  const userRef = db.collection('users').doc(userId);
  let leveledUpTo = null;

  // Read-then-write inside a transaction to bump the points and check for level-up
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef);
    if (!doc.exists) return;

    const oldPoints = doc.data().points || 0;
    const newPoints = oldPoints + amount;

    const oldLevel = getLevel(oldPoints);
    const newLevel = getLevel(newPoints);
    if (newLevel.level > oldLevel.level) leveledUpTo = newLevel;

    transaction.update(userRef, { points: newPoints });
  });

  if (leveledUpTo) await notifyLevelUp(userId, leveledUpTo);

  return leveledUpTo;
};

// Award points for a one-time action
const awardPointsOnce = async (userId, actionKey, onceKey = actionKey) => {
  const amount = POINT_VALUES[actionKey];
  const userRef = db.collection('users').doc(userId);
  let leveledUpTo = null;
  let awarded = false;

  // Read-then-write inside a transaction to bump the points and check for level-up, but only if the onceKey hasn't been awarded yet
  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef);
    if (!doc.exists) return;

    // Check if the onceKey has already been awarded
    const data = doc.data();
    const awardedOnce = data.pointsAwardedOnce || [];
    if (awardedOnce.includes(onceKey)) return;

    const oldPoints = data.points || 0;
    const newPoints = oldPoints + amount;

    const oldLevel = getLevel(oldPoints);
    const newLevel = getLevel(newPoints);
    if (newLevel.level > oldLevel.level) leveledUpTo = newLevel;

    // Update the user's points and mark the onceKey as awarded
    transaction.update(userRef, {
      points: newPoints,
      pointsAwardedOnce: [...awardedOnce, onceKey]
    });
    awarded = true;
  });

  // Notify the user if they leveled up
  if (leveledUpTo) await notifyLevelUp(userId, leveledUpTo);

  return awarded;
};

module.exports = { awardPoints, awardPointsOnce, getLevel };
