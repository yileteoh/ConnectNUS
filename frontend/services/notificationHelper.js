// frontend/services/notificationHelper.js
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import * as Device from 'expo-device'; 
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

 if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Permission not granted for push notifications!');
        return null;
      }

      const projectId = 
        Constants.expoConfig?.extra?.eas?.projectId ?? 
        Constants.easConfig?.projectId;
        
      if (!projectId) {
        console.warn('No EAS projectId found. Run `npx eas init` to enable push notifications.');
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log("Push Token:", token);
      
    } catch (e) {
      console.warn("Error getting Push Token:", e.message);
      return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

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

export const sendChatPushNotification = async (receiverId, title, body, conversationId) => {
  try {
    if (!receiverId) return;

    const userDoc = await getDoc(doc(db, 'users', receiverId));
    if (userDoc.exists()) {
      const pushToken = userDoc.data().pushToken;

      if (pushToken) {
        await sendExpoPushNotification(pushToken, title, body, { 
          type: 'chat', 
          referenceId: conversationId 
        });
      }
    }
  } catch (error) {
    console.error('Failed to send chat push notification:', error);
  }
};