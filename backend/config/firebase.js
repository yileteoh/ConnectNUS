const admin = require('firebase-admin');
const serviceAccount = require("../serviceAccountKey.json");

// Initialize Firebase Admin SDK with service account credentials
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Get a Firestore instance
const db = admin.firestore();

module.exports = { admin, db };