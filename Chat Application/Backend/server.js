// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Required for cross-origin communication

const app = express();
const server = http.createServer(app);

// Configure CORS to allow your frontend to connect
// IMPORTANT: Replace 'http://localhost:3000' with the actual URL where your frontend is running.
// If you're running the HTML file directly from your file system, you might need to
// set origin to true or '*' during development, but be aware of security implications for production.
// For example, if you open 'index.html' directly, the origin might be 'null' or 'file://'.
// A common development setup for React is 'http://localhost:3000'.
// For the Canvas environment, the origin is a dynamic URL (e.g., https://<some-long-hash>.scf.usercontent.goog)
// For simplicity during local testing, you can set origin to '*' but this is NOT recommended for production.
const io = new Server(server, {
  cors: {
    origin: "*", // Allows all origins for easy local testing. For production, specify your frontend URL.
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001; // Server will run on port 3001

// Simple route for testing if the server is up
app.get('/', (req, res) => {
  res.send('Socket.IO server is running!');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // When a user joins, emit a system message to all clients
  socket.on('user_joined', (username) => {
    console.log(`${username} joined the chat.`);
    // Emit to all clients EXCEPT the sender
    socket.broadcast.emit('system_message', `${username} has joined the chat.`);
  });

  // Listen for 'chat_message' events from clients
  socket.on('chat_message', (msg) => {
    console.log(`Message from ${msg.sender}: ${msg.text}`);
    // Emit the message to all connected clients (including the sender)
    io.emit('chat_message', msg);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // You might want to track usernames to announce who left
    // For simplicity, we'll just log it here.
    socket.broadcast.emit('system_message', `A user has left the chat.`);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Socket.IO server listening on port ${PORT}`);
});

