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
const PORT = 3000;

app.use(cors());
app.use(express.json());

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

// YOUR IP ADDRESS
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Network URL: http://10.18.95.140:${PORT}`);
});