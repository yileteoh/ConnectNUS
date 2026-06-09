const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const registerRoutes = require('./routes/routes');

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

registerRoutes(app, { admin, db });

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the app instance for testing purposes
module.exports = app;
module.exports.db = db;
