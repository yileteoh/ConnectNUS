module.exports = function registerProfileRoutes(app, { admin, db }) {
const isValidHttpUrl = (value) => {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// The Real Registration Route (Front-end will call this)
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

// User Profile Routes
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

/**
   * @route   POST /api/profile/feedback
   * @desc    Submit system improvement feedback and store in Firestore
   * @access  Public
   */
  app.post('/api/profile/feedback', async (req, res) => {
    try {
      const { userId, message } = req.body;

      // Check if message content is empty
      if (!message || !message.trim()) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'Feedback message cannot be empty.' 
        });
      }

      // Create a new record in the 'feedbacks' collection
      await db.collection('feedbacks').add({
        userId: userId || 'Anonymous',
        message: message.trim(),
        createdAt: admin.firestore.FieldValue.serverTimestamp() // Auto-generated server time
      });

      return res.status(201).json({ 
        status: 'success', 
        message: 'Thank you! Feedback submitted successfully.' 
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Internal server error.' 
      });
    }
  });

  /**
   * @route   DELETE /api/profile/:userId
   * @desc    Permanently wipe user data from Firestore and delete Auth credentials
   * @access  Public
   */
  app.delete('/api/profile/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      // 1. Permanently delete the user's profile document from Firestore 'users' collection
      await db.collection('users').doc(userId).delete();

      // 2. Permanently delete the user's login account from Firebase Authentication using Admin SDK
      await admin.auth().deleteUser(userId);

      console.log(`Success: Fully wiped data and credentials for user UID: ${userId}`);

      return res.status(200).json({ 
        status: 'success', 
        message: 'Account and data have been permanently erased.' 
      });
    } catch (error) {
      console.error('Error during account deletion:', error);
      return res.status(500).json({ 
        status: 'error', 
        message: error.message 
      });
    }
  });
};
