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
    
    let eventsQuery = db.collection('events').orderBy('createdAt', 'desc');

    // If a specific category is requested, filter the database
    if (category && category !== 'All Events') {
      eventsQuery = eventsQuery.where('category', '==', category);
    }

    const snapshot = await eventsQuery.get();
    const events = [];

    snapshot.forEach(doc => {
      events.push({
        id: doc.id,
        ...doc.data()
      });
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
