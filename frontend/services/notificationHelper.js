// frontend/services/notificationHelper.js
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Sends a real OS Push Notification to the user's physical device via Expo
const sendExpoPushNotification = async (expoPushToken, title, body, data) => {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Error sending Expo Push Notification:', error);
  }
};

/**
 * Creates a new notification in Firestore.
 * 
 * @param {string} receiverId - The UID of the user who should receive the notification.
 * @param {string} title - The title of the notification.
 * @param {string} body - The main text of the notification.
 * @param {string} type - 'event' | 'forum' | 'buddy'
 * @param {string} referenceId - The ID used for navigation (e.g., postId, eventId, userId).
 */
export const sendNotification = async (receiverId, title, body, type, referenceId) => {
  try {
    // Prevent sending notifications to oneself
    if (!receiverId) return;

    await addDoc(collection(db, 'notifications'), {
      userId: receiverId,
      title: title,
      body: body,
      type: type,
      referenceId: referenceId,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    // Fetch the receiver's Push Token from their profile
    const userDoc = await getDoc(doc(db, 'users', receiverId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const pushToken = userData.pushToken;

      // If they have a token, trigger the physical device push!
      if (pushToken) {
        await sendExpoPushNotification(pushToken, title, body, { type, referenceId });
      }
    }
    
    console.log(`Notification sent successfully to user: ${receiverId}`);
  } catch (error) {
    console.error('Failed to dispatch notification:', error);
  }
};