// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Required for cross-origin communication

const app = express();
const server = http.createServer(app);

// Configure CORS to allow your frontend to connect
// IMPORTANT: Replace 'http://localhost:3000' with the actual URL where your frontend is running.
// For local testing with the provided index.html, '*' is often easiest, but specify for production.
const io = new Server(server, {
  cors: {
    origin: "*", // Allows all origins for easy local testing. For production, specify your frontend URL.
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001; // Server will run on port 3001

// In-memory storage for the document content (for demonstration purposes)
let documentContent = "";
// In-memory storage for active users
const activeUsers = new Map(); // Map<socket.id, { username, id }>

// Helper to get active users list for sending to clients
function getActiveUsersList() {
    return Array.from(activeUsers.values());
}

// Simple route for testing if the server is up
app.get('/', (req, res) => {
  res.send('Socket.IO collaborative editor server is running!');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  const username = socket.handshake.query.username || `Guest-${socket.id.substring(0, 4)}`;
  console.log(`A user connected: ${username} (${socket.id})`);

  // Add new user to active users map
  activeUsers.set(socket.id, { username, id: socket.id });
  // Broadcast updated active users list to all clients
  io.emit('active_users', getActiveUsersList());

  // Send the current document content to the newly connected client
  socket.emit('initial_document_content', documentContent);

  // Listen for document updates from clients
  socket.on('document_update_to_server', (content) => {
    // Update the in-memory document content
    documentContent = content;
    console.log(`Document updated by ${username}: ${content.substring(0, 50)}...`);

    // Broadcast the updated content to all other connected clients
    socket.broadcast.emit('document_update_from_server', documentContent);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${username} (${socket.id})`);
    // Remove user from active users map
    activeUsers.delete(socket.id);
    // Broadcast updated active users list to all clients
    io.emit('active_users', getActiveUsersList());
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Socket.IO server listening on port ${PORT}`);
});
