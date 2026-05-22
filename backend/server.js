const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
// 1. Load the secret key
const serviceAccount = require("./serviceAccountKey.json");

// 2. Initialize the "Admin" power
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); // Connect to the database
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const isValidHttpUrl = (value) => {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// 3. The Real Registration Route (Front-end will call this)
/** 
 * @route   POST /api/register
 * @desc    Register a new user and create a Firestore document
 * @access  Public (Should be protected via auth token later)
 */
app.post('/api/register', async (req, res) => {
    try {
        const { email, uid } = req.body; // Data sent from React Native

        // Create a user profile document in Firestore
        await db.collection('users').doc(uid).set({
            email: email,
            role: 'student', // Default role
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            setupComplete: false // Placeholder for Feature 2: User Profile
        });

        console.log(`Success: User ${email} synced to Firestore database.`);
        
        res.json({
            success: true,
            message: "User successfully registered and synced to backend!"
        });
    } catch (error) {
        console.error("Integration Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. User Profile Routes
/**
 * @route   PUT /api/profile
 * @desc    Create or update user profile information
 * @access  Public (Should be protected via auth token later)
 */
app.put('/api/profile', async (req, res) => {
  try {
    const {
      userId,
      name,
      faculty,
      year,
      modules,
      interests,
      bio,
      profilePicUrl,
      socialLinks,
      buddyStatus,
      isBuddy
    } = req.body;

    const normalizedModules = Array.isArray(modules) ? modules.filter(Boolean) : [];
    const normalizedInterests = Array.isArray(interests) ? interests.filter(Boolean) : [];

    if (!userId || !name || !faculty || !year || normalizedModules.length === 0 || normalizedInterests.length === 0) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'userId, name, faculty, year, modules, and interests are required fields.' 
      });
    }

    const normalizedSocials = Array.isArray(socialLinks) ? socialLinks.filter(Boolean) : [];

    if (!isValidHttpUrl(profilePicUrl)) {
      return res.status(400).json({
        status: 'error',
        message: 'Profile picture must be a valid http:// or https:// URL.'
      });
    }

    const finalizedAvatarUrl = (profilePicUrl && typeof profilePicUrl === 'string') 
      ? profilePicUrl.trim() 
      : '';

    // Prepare profile data object
    const profileData = {
      userId,
      name,
      faculty,
      year,
      modules: normalizedModules,
      interests: normalizedInterests,
      bio: bio || '',
      profilePicUrl: finalizedAvatarUrl,
      socialLinks: normalizedSocials,
      buddyStatus: buddyStatus ?? isBuddy ?? false,
      setupComplete: true, // Mark profile as complete once saved!
      updatedAt: admin.firestore.FieldValue.serverTimestamp() // Auto-generated server time
    };

    // Save or update document in 'users' collection using userId as Document ID
    // CRITICAL: { merge: true } ensures we don't delete the 'email' and 'createdAt' fields created during /api/register
    await db.collection('users').doc(userId).set(profileData, { merge: true });

    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully!',
      data: profileData
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error.' 
    });
  }
});

/**
 * @route   GET /api/profile/:userId
 * @desc    Fetch profile data for a specific user
 * @access  Public
 */
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch document from 'users' collection by document ID
    const userDoc = await db.collection('users').doc(userId).get();

    // Check if user profile exists
    if (!userDoc.exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found.'
      });
    }

    // Return profile data to frontend
    return res.status(200).json({
      status: 'success',
      data: userDoc.data()
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

// 5. Event Routes
/**
 * @route   POST /api/events
 * @desc    Create a new event/study group post
 * @access  Public (Will be protected later)
 */
app.post('/api/events', async (req, res) => {
  try {
    const { title, category, location, time, capacity, description, creatorId } = req.body;

    // Validate required fields
    if (!title || !category || !location || !time || !capacity || !creatorId) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required event fields.'
      });
    }

    // Prepare the event document blueprint
    const eventData = {
      title: title.trim(),
      category: category,
      location: location.trim(),
      time: time, // Expected to be an ISO string, e.g., "2026-05-22T14:00:00.000Z"
      capacity: Number(capacity),
      description: description ? description.trim() : '',
      creatorId: creatorId,
      attendees: [creatorId], // The creator automatically joins their own event
      status: 'open',         // 'open', 'full', or 'cancelled'
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Add the new event to the 'events' collection
    const eventRef = await db.collection('events').add(eventData);

    return res.status(201).json({
      status: 'success',
      message: 'Event created successfully!',
      data: {
        eventId: eventRef.id,
        ...eventData
      }
    });

  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

/**
 * @route   GET /api/events
 * @desc    Fetch all events (with optional category filter)
 * @access  Public
 */
app.get('/api/events', async (req, res) => {
  try {
    const { category } = req.query; 
    
    const snapshot = await db.collection('events').get();
    let events = [];

    snapshot.forEach(doc => {
      events.push({
        id: doc.id,
        ...doc.data()
      });
    });

    if (category && category !== 'All Events') {
      events = events.filter(event => event.category === category);
    }

    events.sort((a, b) => {
      const timeA = (a.createdAt && typeof a.createdAt.toMillis === 'function') ? a.createdAt.toMillis() : 0;
      const timeB = (b.createdAt && typeof b.createdAt.toMillis === 'function') ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    return res.status(200).json({
      status: 'success',
      data: events
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

/**
 * @route   GET /api/events/:eventId
 * @desc    Fetch details for a specific event by its ID
 * @access  Public
 */
app.get('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const doc = await db.collection('events').doc(eventId).get();
    if (!doc.exists) {
      return res.status(404).json({ status: 'error', message: 'Event not found.' });
    }

    return res.status(200).json({ 
      status: 'success', 
      data: { id: doc.id, ...doc.data() } 
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   PUT /api/events/:eventId/join
 * @desc    RSVP to an event
 * @access  Public
 */
app.put('/api/events/:eventId/join', async (req, res) => {
  const { eventId } = req.params;
  const { userId } = req.body;

  try {
    const eventRef = db.collection('events').doc(eventId);

    // Run a transaction to ensure thread-safe updates
    await db.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists) throw new Error("Event does not exist.");

      const eventData = eventDoc.data();
      const attendees = eventData.attendees || [];

      // Check if user already joined
      if (attendees.includes(userId)) throw new Error("You have already joined this event.");
      
      // Check capacity
      if (attendees.length >= eventData.capacity) throw new Error("Event is full.");

      // Update the event
      transaction.update(eventRef, {
        attendees: admin.firestore.FieldValue.arrayUnion(userId),
        // If full, auto-update status (optional, for convenience)
        status: (attendees.length + 1 >= eventData.capacity) ? 'full' : 'open'
      });
    });

    return res.status(200).json({ status: 'success', message: 'Successfully joined!' });
  } catch (error) {
    return res.status(400).json({ status: 'error', message: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
