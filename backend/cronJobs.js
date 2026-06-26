// backend/cronJobs.js
const cron = require('node-cron');
const admin = require('firebase-admin');

const db = admin.firestore();

// Sends Push Notification via Expo
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('[CRON] Expo Push Error:', error);
  }
};

// Helper function to create a notification document via Admin SDK
const sendSystemNotification = async (userId, title, body, type, referenceId) => {
  try {
    if (!userId) return;

    // Fetch user's push token and fire the Push Notification
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const pushToken = userDoc.data().pushToken;
      if (pushToken) {
        await sendExpoPushNotification(pushToken, title, body, { type, referenceId });
      }
    }
  } catch (error) {
    console.error(`[CRON] Failed to send notification to ${userId}:`, error);
  }
};

// Alerts attendees if their event starts in exactly 24 hours
const eventReminderJob = cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Running Event 24h Reminder Job...');
  try {
    const now = new Date();
    // Calculate the time window: 23.5 hours to 24.5 hours from now
    const tomorrowStart = new Date(now.getTime() + 23.5 * 60 * 60 * 1000).toISOString();
    const tomorrowEnd = new Date(now.getTime() + 24.5 * 60 * 60 * 1000).toISOString();

    const eventsSnapshot = await db.collection('events')
      .where('time', '>=', tomorrowStart)
      .where('time', '<=', tomorrowEnd)
      .get();

    const reminderTasks = [];

    eventsSnapshot.forEach((doc) => {
      const event = doc.data();
      const attendees = event.attendees || [];
      
      // Notify every attendee
      attendees.forEach((attendee) => {
        const attendeeId = typeof attendee === 'string' ? attendee : attendee.uid;
        reminderTasks.push(sendSystemNotification(
          attendeeId,
          'Event Reminder',
          `Get ready! "${event.title}" starts in 24 hours.`,
          'event',
          doc.id
        ));
      });
      console.log(`[CRON] Sent reminders for event: ${event.title}`);
    });

    await Promise.all(reminderTasks);
  } catch (error) {
    console.error('[CRON] Event Reminder Error:', error);
  }
});

// Reminds users if they have pending buddy requests
const buddyNudgeJob = cron.schedule('0 12 * * *', async () => {
  console.log('[CRON] Running Pending Buddy Nudge Job...');
  try {
    // Look for requests that are still 'pending'
    const requestsSnapshot = await db.collection('buddyRequests')
      .where('status', '==', 'pending')
      .get();

    // Use a Set to avoid sending multiple notifications to the same user 
    // if they have multiple pending requests
    const usersToNotify = new Set();

    requestsSnapshot.forEach((doc) => {
      const req = doc.data();
      usersToNotify.add(req.receiverId);
    });

    await Promise.all(Array.from(usersToNotify).map((userId) =>
      sendSystemNotification(
        userId,
        'Pending Buddy Request',
        'You have a buddy request waiting! ',
        'buddy',
        userId // Can route to their own profile/inbox
      )
    ));
    console.log(`[CRON] Sent buddy nudges to ${usersToNotify.size} users.`);
  } catch (error) {
    console.error('[CRON] Buddy Nudge Error:', error);
  }
});

// Function to start all CRON jobs
const startAllCronJobs = () => {
  eventReminderJob.start();
  buddyNudgeJob.start();
  console.log('[CRON] All CRON jobs have been scheduled and started.');
};

module.exports = { startAllCronJobs };
