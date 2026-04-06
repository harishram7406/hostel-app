// server/server.js
require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Needed for serving static files
const http = require('http'); // Import Node.js http module
const { Server } = require("socket.io"); // Import Socket.IO Server
const attachIoMiddleware = require('./middleware/attachIo'); // Import the middleware
const userRoutes = require('./routes/user');
const dmRoutes = require('./routes/dm');
const notificationRoutes = require('./routes/notification');
const friendRoutes = require('./routes/friend'); // Import friend routes
const authRoutes = require('./routes/authRoutes'); // Import auth routes
const postRoutes = require('./routes/post'); // Import post routes
const commentRoutes = require('./routes/comment'); // Import comment routes
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler'); // Import error handlers

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000; // Use environment variable or default to 5000

// Create HTTP server from Express app
const server = http.createServer(app);

// Initialize Socket.IO server
// Configure CORS for Socket.IO (adjust origin for production)
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST"]
  }
});

// In-memory store for user sockets { userId: socketId }
const userSockets = {};

// --- Middleware ---
// Enable CORS for all routes and origins (adjust for production later if needed)
app.use(cors()); // Keep CORS for Express routes as well

// Attach io instance to requests
app.use(attachIoMiddleware(io));

// Parse JSON request bodies
app.use(express.json());

// Serve static files from the 'uploads' directory
// This makes files in 'uploads' accessible via URLs like http://localhost:5000/uploads/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// --- MongoDB Connection ---
// Use environment variable for connection string
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('MongoDB URI not found. Please set MONGO_URI in your .env file.');
    process.exit(1); // Exit if DB connection string is missing
}

mongoose.connect(MONGO_URI)
.then(() => console.log('MongoDB Connected Successfully'))
.catch(err => console.error('MongoDB Connection Error:', err));


// --- Basic Routes (Placeholders) ---
app.get('/', (req, res) => {
  res.send('Hostel Social App Backend API is running!');
});

// --- TODO: Import and use API routes (auth, posts, users, etc.) ---
// Example (will be replaced later):
// const authRoutes = require('./routes/auth');
// app.use('/api/auth', authRoutes);

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dms', dmRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/friends', friendRoutes); // Mount friend routes
app.use('/api/comments', commentRoutes); // Mount comment routes


// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Store user ID when they connect (client needs to emit this)
  socket.on('storeUserId', (userId) => {
    if (userId) {
      userSockets[userId] = socket.id;
      console.log(`Stored socket ${socket.id} for user ${userId}`);
      // Optionally emit confirmation or online status update
      // io.emit('userOnline', userId);
    }
  });

  // --- Placeholder Event Listeners ---
  // Example: Listen for a chat message
  // socket.on('chat message', (msg) => {
  //   console.log('message from ' + socket.id + ': ' + msg);
  //   io.emit('chat message', msg); // Broadcast to everyone
  // });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove user from mapping on disconnect
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
        console.log(`Removed socket mapping for user ${userId}`);
        // Optionally emit offline status update
        // io.emit('userOffline', userId);
        break;
      }
    }
  });
});

// Pass userSockets map via middleware as well (alternative to req.io for specific cases)
app.use((req, res, next) => {
  req.userSockets = userSockets;
  next();
});

// --- Error Handling Middleware ---
// Should be AFTER API routes and BEFORE the final error handler
app.use(notFoundHandler);

// The final error handler, MUST be last
app.use(errorHandler);

// --- Start Server ---
// Start the HTTP server (which includes Express and Socket.IO)
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
}); 