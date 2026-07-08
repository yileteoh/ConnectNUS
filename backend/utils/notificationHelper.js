const { admin, db } = require('../config/firebase');

// Write an in-app notification doc and fire an Expo push if the user has a token.
// Mirrors the inline pattern used in eventController.deleteEvent, generalized to one user at a time.
const sendNotification = async ({ userId, title, body, type, referenceId }) => {
  await db.collection('notifications').add({
    userId,
    title,
    body,
    type,
    referenceId,
    isRead: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const userDoc = await db.collection('users').doc(userId).get();
  const pushToken = userDoc.exists ? userDoc.data().pushToken : null;
  if (!pushToken) return;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: { type, referenceId },
    }]),
  });
};

module.exports = { sendNotification };
