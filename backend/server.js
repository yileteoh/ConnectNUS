// backend/server.js
const http = require('http'); // Import the http module to create a server
const express = require('express'); // Import the express module to create an Express application
const cors = require('cors'); // Import the cors module to handle Cross-Origin Resource Sharing
const { Server } = require('socket.io'); // Import the Server class from the socket.io module to handle WebSocket connections
const routes = require('./routes'); // Import the routes defined in the routes.js file
const { saveMessage, setUnreadForParticipants } = require('./controllers/chatController');
const { startAllCronJobs } = require('./cronJobs'); // Import the startAllCronJobs function from the cronJobs.js file
require('dotenv').config(); // Load environment variables from a .env file into process.env

// Create an Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to handle CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Use the imported routes for any requests to the /api endpoint
app.use('/api', routes);

// Create an HTTP server using the Express application
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Handle WebSocket connections
io.on('connection', (socket) => {
  socket.on('join_room', ({ conversationId }) => {
    socket.join(conversationId);
  });

  // Handle sending messages
  socket.on('send_message', async ({ conversationId, senderId, text, type, imageUrl, replyTo }) => {
    try {
      const msg = await saveMessage(conversationId, senderId, text, type, imageUrl, replyTo);
      io.to(conversationId).emit('receive_message', msg);
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Image messages are saved to Firestore by the client directly
  // This event broadcasts to other room members and marks them as having unread messages
  socket.on('broadcast_image', ({ conversationId, senderId, imageUrl, messageId, timestamp }) => {
    socket.to(conversationId).emit('receive_message', {
      messageId,
      senderId,
      text: '',
      type: 'image',
      imageUrl,
      timestamp,
    });
    setUnreadForParticipants(conversationId, senderId);
  });

  // Reply-text messages are saved to Firestore by the client directly
  // This event broadcasts to other room members and marks them as having unread messages.
  socket.on('broadcast_text', ({ conversationId, senderId, text, messageId, timestamp, replyTo }) => {
    socket.to(conversationId).emit('receive_message', {
      messageId,
      senderId,
      text,
      type: 'text',
      replyTo,
      timestamp,
    });
    setUnreadForParticipants(conversationId, senderId);
  });

  // Document messages are saved to Firestore by the client directly.
  // This event broadcasts to other room members and marks them as having unread messages
  socket.on('broadcast_document', ({ conversationId, senderId, documentUrl, documentName, messageId, timestamp }) => {
    socket.to(conversationId).emit('receive_message', {
      messageId,
      senderId,
      text: '',
      type: 'document',
      documentUrl,
      documentName,
      timestamp,
    });
    setUnreadForParticipants(conversationId, senderId);
  });
});

// Start the server and listen on the specified port
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
  startAllCronJobs();
}

module.exports = app;
