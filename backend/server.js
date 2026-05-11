// Import the necessary modules that we installed earlier
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize the Express application
const app = express();

// Define the port number where our server will listen for requests
const PORT = 3000;

// ==========================================
// MIDDLEWARE CONFIGURATION
// ==========================================

// Enable CORS (Cross-Origin Resource Sharing)
// This is crucial. It allows your React Native frontend to send requests to this backend securely.
app.use(cors());

// Enable built-in middleware to parse incoming JSON requests
// This allows us to read data sent from the frontend (like email and password)
app.use(express.json());

// ==========================================
// API ROUTES (ENDPOINTS)
// ==========================================

// Create a basic GET route to test if our backend is alive and working
app.get('/api/status', (req, res) => {
    // When the frontend hits this endpoint, we send back a success message
    res.json({
        success: true,
        message: "ConnectNUS Backend is running successfully!"
    });
});

// Create a placeholder POST route for future user login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // For now, we just print what the frontend sends us to test the connection
    console.log("Received login attempt for email:", email);
    
    res.json({
        success: true,
        message: "Login endpoint reached! Firebase verification will be added here next."
    });
});

// ==========================================
// START THE SERVER
// ==========================================

// Tell the application to listen on the specified port
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`=========================================`);
});