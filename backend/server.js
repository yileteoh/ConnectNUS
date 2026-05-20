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
const DEFAULT_PROFILE_PIC_URL = 'https://randomuser.me/api/portraits/lego/1.jpg';

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

// 4. User Profile Routes (Feature 2)
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

    if (!isValidHttpUrl(profilePicUrl) || !isValidHttpUrl(socialLinks)) {
      return res.status(400).json({
        status: 'error',
        message: 'Profile picture and social link must be valid http:// or https:// URLs.'
      });
    }

    // Prepare profile data object
    const profileData = {
      userId,
      name,
      faculty,
      year,
      modules: normalizedModules,
      interests: normalizedInterests,
      bio: bio || '',
      profilePicUrl: profilePicUrl || DEFAULT_PROFILE_PIC_URL,
      socialLinks: socialLinks || '',
      buddyStatus: buddyStatus ?? isBuddy ?? false,
      isBuddy: buddyStatus ?? isBuddy ?? false,
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
        message: 'Profile not found. User may need to set up profile.'
      });
    }

    // Return profile data to frontend
    return res.status(200).json({
      status: 'success',
      data: userDoc.data()
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error.' 
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
