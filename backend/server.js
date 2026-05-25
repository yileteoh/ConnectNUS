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

    // Automatically hide events that have already passed
    const currentTimeMs = Date.now();
    events = events.filter(event => {
      if (!event.time) return false; // Hide invalid dates
      const eventTimeMs = new Date(event.time).getTime();
      return eventTimeMs > currentTimeMs; // Only keep future events
    });

    if (category && category !== 'All Events') {
      events = events.filter(event => event.category === category);
    }

    events.sort((a, b) => {
      const timeA = (a.createdAt && typeof a.createdAt.toMillis === 'function') ? a.createdAt.toMillis() : 0;
      const timeB = (b.createdAt && typeof b.createdAt.toMillis === 'function') ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    const hydratedEvents = await Promise.all(events.map(async (event) => {
      try {
        const creatorDoc = await db.collection('users').doc(event.creatorId).get();
        const creatorData = creatorDoc.exists ? creatorDoc.data() : null;
        return { 
          ...event, 
          creatorName: creatorData?.name || 'NUS Student',
          creatorPicUrl: creatorData?.profilePicUrl || '' // Pull user customized avatar URL
        };
      } catch (err) {
        return { ...event, creatorName: 'NUS Student', creatorPicUrl: '' };
      }
    }));

    return res.status(200).json({
      status: 'success',
      data: hydratedEvents
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

    const eventData = doc.data();

    // Loop through attendee UIDs and fetch their actual profiles for frontend interaction
    const hydratedAttendees = await Promise.all((eventData.attendees || []).map(async (uid) => {
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          return {
            uid: uid,
            name: userData.name || 'NUS Student',
            faculty: userData.faculty || 'Unknown Faculty',
            year: userData.year || '',
            profilePicUrl: userData.profilePicUrl || '' // Inject customization image links
          };
        }
        return { uid, name: 'NUS Student', faculty: 'Unknown Faculty', year: '', profilePicUrl: '' };
      } catch (err) {
        return { uid, name: 'NUS Student', faculty: 'Unknown Faculty', year: '', profilePicUrl: '' };
      }
    }));

    return res.status(200).json({ 
      status: 'success', 
      data: { id: doc.id, ...eventData, attendees: hydratedAttendees }
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

/**
 * @route   PUT /api/events/:eventId/leave
 * @desc    Leave logic to safely exit an event roster
 * @access  Public
 */
app.put('/api/events/:eventId/leave', async (req, res) => {
  const { eventId } = req.params;
  const { userId } = req.body; // Passed from frontend storage state

  try {
    const eventRef = db.collection('events').doc(eventId);

    await db.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventRef);
      if (!eventDoc.exists) throw new Error("Target campus event not found.");

      const eventData = eventDoc.data();
      const attendees = eventData.attendees || [];

      // Check if user is actually in the roster
      if (!attendees.includes(userId)) throw new Error("You are not part of this attendee roster.");
      
      // Host shouldn't break the room by leaving
      if (eventData.creatorId === userId) {
        throw new Error("Hosts cannot abandon their own event. Use cancellation instead.");
      }

      // Remove the user from array and force reopen status flag
      transaction.update(eventRef, {
        attendees: admin.firestore.FieldValue.arrayRemove(userId),
        status: 'open' // Freeing up a slot naturally marks the state back to open
      });
    });

    return res.status(200).json({ status: 'success', message: 'Successfully removed from gathering.' });
  } catch (error) {
    return res.status(400).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   DELETE /api/events/:eventId
 * @desc    Permanently delete an event document
 * @access  Public
 */
app.delete('/api/events/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const { userId } = req.body; // Pass current authenticated UID to verify ownership

  try {
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'Gathering records not found.' });
    }

    // Ensure the requesting user is the real creator
    if (eventDoc.data().creatorId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Permission denied. Only hosts can dissolve gatherings.' });
    }

    // Execute absolute document wipeout
    await eventRef.delete();
    return res.status(200).json({ status: 'success', message: 'Event successfully dissolved.' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   PUT /api/events/:eventId
 * @desc    Update an existing campus event properties
 * @access  Public
 */
app.put('/api/events/:eventId', async (req, res) => {
  const { eventId } = req.params;
  // userId is passed to verify ownership, along with the updated form fields
  const { userId, title, category, location, time, capacity, description } = req.body;

  try {
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'Event record not found.' });
    }

    const eventData = eventDoc.data();

    // Ensure only the original creator can edit the details
    if (eventData.creatorId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Permission denied. Only hosts can edit.' });
    }

    const currentAttendeesCount = eventData.attendees?.length || 0;
    const newCapacity = Number(capacity);

    // Prevent lowering capacity below the current room roster count
    if (newCapacity < currentAttendeesCount) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot lower max slots below the current number of checked-in attendees (${currentAttendeesCount} pax).`
      });
    }

    // Assemble the updated patch layout
    const updatedFields = {
      title: title ? title.trim() : eventData.title,
      category: category || eventData.category,
      location: location ? location.trim() : eventData.location,
      time: time || eventData.time,
      capacity: newCapacity,
      description: description !== undefined ? description.trim() : eventData.description,
      // Recalculate status dynamically based on the updated seating threshold
      status: (currentAttendeesCount >= newCapacity) ? 'full' : 'open',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Apply patch changes to Firestore document
    await eventRef.update(updatedFields);

    return res.status(200).json({
      status: 'success',
      message: 'Event parameters updated successfully!',
      data: updatedFields
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// 6. Forum Routes
/**
 * @route   POST /api/forums
 * @desc    Create a new forum discussion thread
 * @access  Public
 */
app.post('/api/forums', async (req, res) => {
  try {
    const { title, content, category, creatorId } = req.body;
    
    const newPost = {
      title,
      content,
      category,
      creatorId,
      likes: [], // Array to track upvote UIDs
      bookmarks: [], // Array to track save/bookmark UIDs
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('forums').add(newPost);
    return res.status(201).json({ status: 'success', data: { id: docRef.id, ...newPost } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   GET /api/forums
 * @desc    Fetch all forum posts populated with author profiles
 * @access  Public
 */
app.get('/api/forums', async (req, res) => {
  try {
    const { category } = req.query; 
    const snapshot = await db.collection('forums').get();
    let forums = [];

    snapshot.forEach(doc => {
      forums.push({ id: doc.id, ...doc.data() });
    });

    if (category && category !== 'All Topics') {
      forums = forums.filter(post => post.category === category);
    }

    // Sort by newest first
    forums.sort((a, b) => {
      const timeA = (a.createdAt && typeof a.createdAt.toMillis === 'function') ? a.createdAt.toMillis() : 0;
      const timeB = (b.createdAt && typeof b.createdAt.toMillis === 'function') ? b.createdAt.toMillis() : 0;
      return timeB - timeA; 
    });

    // Hydrate each post with the creator's real name and avatar
    const hydratedForums = await Promise.all(forums.map(async (post) => {
      try {
        const creatorDoc = await db.collection('users').doc(post.creatorId).get();
        const creatorData = creatorDoc.exists ? creatorDoc.data() : null;
        
        // Fetch comment count for UI metrics
        const commentsSnapshot = await db.collection('forums').doc(post.id).collection('comments').get();

        return { 
          ...post, 
          creatorName: creatorData?.name || 'NUS Student',
          creatorPicUrl: creatorData?.profilePicUrl || '',
          commentCount: commentsSnapshot.size // Number of comments
        };
      } catch (err) {
        return { ...post, creatorName: 'NUS Student', creatorPicUrl: '', commentCount: 0 };
      }
    }));

    return res.status(200).json({ status: 'success', data: hydratedForums });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

/**
 * @route   PUT /api/forums/:postId/toggle-like
 * @desc    Add or remove user from likes array
 * @access  Public
 */
app.put('/api/forums/:postId/toggle-like', async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
    const postRef = db.collection('forums').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) return res.status(404).json({ status: 'error', message: 'Post not found.' });

    const likes = postDoc.data().likes || [];
    const isLiked = likes.includes(userId);

    await postRef.update({
      likes: isLiked 
        ? admin.firestore.FieldValue.arrayRemove(userId)
        : admin.firestore.FieldValue.arrayUnion(userId)
    });

    return res.status(200).json({ status: 'success', message: 'Like toggled' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   PUT /api/forums/:postId/toggle-bookmark
 * @desc    Add or remove user from bookmarks array
 * @access  Public
 */
app.put('/api/forums/:postId/toggle-bookmark', async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
    const postRef = db.collection('forums').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) return res.status(404).json({ status: 'error', message: 'Post not found.' });

    const bookmarks = postDoc.data().bookmarks || [];
    const isBookmarked = bookmarks.includes(userId);

    await postRef.update({
      bookmarks: isBookmarked 
        ? admin.firestore.FieldValue.arrayRemove(userId)
        : admin.firestore.FieldValue.arrayUnion(userId)
    });

    return res.status(200).json({ status: 'success', message: 'Bookmark toggled' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   GET /api/forums/:postId
 * @desc    Fetch details for a single forum post
 * @access  Public
 */
app.get('/api/forums/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const doc = await db.collection('forums').doc(postId).get();
    
    if (!doc.exists) return res.status(404).json({ status: 'error', message: 'Post not found.' });
    
    const postData = doc.data();
    let creatorName = 'NUS Student';
    let creatorPicUrl = '';

    // Hydrate author info
    try {
      const userDoc = await db.collection('users').doc(postData.creatorId).get();
      if (userDoc.exists) {
        creatorName = userDoc.data().name || 'NUS Student';
        creatorPicUrl = userDoc.data().profilePicUrl || '';
      }
    } catch (err) { console.error('Author hydration failed', err); }

    return res.status(200).json({ 
      status: 'success', 
      data: { id: doc.id, ...postData, creatorName, creatorPicUrl } 
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   GET /api/forums/:postId/comments
 * @desc    Fetch all comments for a specific post
 * @access  Public
 */
app.get('/api/forums/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const snapshot = await db.collection('forums').doc(postId).collection('comments')
                             .orderBy('createdAt', 'asc').get(); // Oldest first for comments
    
    let comments = [];
    snapshot.forEach(doc => { comments.push({ id: doc.id, ...doc.data() }); });

    // Hydrate each comment with user details
    const hydratedComments = await Promise.all(comments.map(async (comment) => {
      try {
        const userDoc = await db.collection('users').doc(comment.userId).get();
        return { 
          ...comment, 
          userName: userDoc.exists ? (userDoc.data().name || 'NUS Student') : 'NUS Student',
          userPicUrl: userDoc.exists ? (userDoc.data().profilePicUrl || '') : ''
        };
      } catch (err) { return { ...comment, userName: 'NUS Student', userPicUrl: '' }; }
    }));

    return res.status(200).json({ status: 'success', data: hydratedComments });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * @route   POST /api/forums/:postId/comments
 * @desc    Add a new comment to a post
 * @access  Public
 */
app.post('/api/forums/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, text } = req.body;

    const newComment = {
      userId,
      text,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const commentRef = await db.collection('forums').doc(postId).collection('comments').add(newComment);
    
    return res.status(201).json({ status: 'success', data: { id: commentRef.id, ...newComment } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
