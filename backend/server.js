const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const routes = require('./routes');
const { saveMessage, setUnreadForParticipants } = require('./controllers/chatController');
const { startAllCronJobs } = require('./cronJobs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', routes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.on('join_room', ({ conversationId }) => {
    socket.join(conversationId);
  });

  socket.on('send_message', async ({ conversationId, senderId, text, type, imageUrl, replyTo }) => {
    try {
      const msg = await saveMessage(conversationId, senderId, text, type, imageUrl, replyTo);
      io.to(conversationId).emit('receive_message', msg);
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Image messages are saved to Firestore by the client directly.
  // This event broadcasts to other room members and marks them as having unread messages.
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

  // Reply-text messages are saved to Firestore by the client directly.
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
  // This event broadcasts to other room members and marks them as having unread messages.
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

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startAllCronJobs();

module.exports = app;
