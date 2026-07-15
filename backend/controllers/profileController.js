const { admin, db } = require('../config/firebase');
const pointsService = require('../utils/pointsService');

const isValidHttpUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

// Register a new user and create a Firestore document
exports.registerUser = async (req, res) => {
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
};

// Create or update user profile information
exports.updateProfile = async (req, res) => {
  try {
    const {
      userId, name, faculty, year, modules, interests,
      bio, profilePicUrl, socialLinks, buddyStatus, isBuddy
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
      ? profilePicUrl.trim() : '';

    // Read the prior setupComplete value so we can tell a first-time completion
    // (false/absent -> true) apart from a later edit of an already-complete profile.
    const existingDoc = await db.collection('users').doc(userId).get();
    const wasSetupComplete = existingDoc.exists && existingDoc.data().setupComplete === true;

    // Prepare profile data object
    const profileData = {
      userId, name, faculty, year,
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
    // { merge: true } ensures we don't delete the 'email' and 'createdAt' fields created during /api/register
    await db.collection('users').doc(userId).set(profileData, { merge: true });

    // Award one-time points the first time setup is actually completed (not on later edits)
    if (!wasSetupComplete) {
      try {
        await pointsService.awardPointsOnce(userId, 'profileSetupComplete');
      } catch (e) { console.error('awardPointsOnce (profile setup) failed:', e); }
    }

    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully!',
      data: profileData
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Fetch profile data for a specific user
exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch document from 'users' collection by document ID
    const userDoc = await db.collection('users').doc(userId).get();

    // Check if user profile exists
    if (!userDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'Profile not found.' });
    }

    // Return profile data to frontend
    return res.status(200).json({ status: 'success', data: userDoc.data() });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
};

// Submit system improvement feedback and store in Firestore
exports.submitFeedback = async (req, res) => {
    try {
      const { userId, message } = req.body;

      // Check if message content is empty
      if (!message || !message.trim()) {
        return res.status(400).json({ status: 'error', message: 'Feedback message cannot be empty.' });
      }

      // Create a new record in the 'feedbacks' collection
      await db.collection('feedbacks').add({
        userId: userId || 'Anonymous',
        message: message.trim(),
        createdAt: admin.firestore.FieldValue.serverTimestamp() // Auto-generated server time
      });

      return res.status(201).json({ status: 'success', message: 'Thank you! Feedback submitted successfully.' });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return res.status(500).json({ status: 'error', message: 'Internal server error.' });
    }
};

// Permanently wipe user data from Firestore and delete Auth credentials
exports.deleteProfile = async (req, res) => {
    try {
      const { userId } = req.params;

      // 1. Permanently delete the user's profile document from Firestore 'users' collection
      await db.collection('users').doc(userId).delete();

      // 2. Permanently delete the user's login account from Firebase Authentication using Admin SDK
      await admin.auth().deleteUser(userId);

      console.log(`Success: Fully wiped data and credentials for user UID: ${userId}`);

      return res.status(200).json({ status: 'success', message: 'Account and data have been permanently erased.' });
    } catch (error) {
      console.error('Error during account deletion:', error);
      return res.status(500).json({ status: 'error', message: error.message });
    }
};
