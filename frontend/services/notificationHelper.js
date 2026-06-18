// frontend/services/notificationHelper.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

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
    
    console.log(`Notification sent successfully to user: ${receiverId}`);
  } catch (error) {
    console.error('Failed to dispatch notification:', error);
  }
};