const express = require('express');
const {
    getMyProfile,
    getUserProfile,
    updateUserProfile,
    getUserById,
    sendFriendRequest,
    acceptFriendRequest,
    searchUsers,
    getUserSuggestions
} = require('../controllers/userController');
const { protect } = require('../middleware/auth'); // Auth middleware
const upload = require('../middleware/upload'); // Multer upload middleware

const router = express.Router();

// Get logged-in user's profile (Protected)
router.get('/me', protect, getMyProfile);

// Get profile by username (Public)
router.get('/profile/:username', getUserProfile);

// Get user details by ID (Public - used for populating author info etc.)
router.get('/:id', getUserById);

// Update logged-in user's profile (Protected)
router.put('/me', protect, upload.single('profilePicture'), updateUserProfile);

// Friend Request Routes (Protected)
router.post('/friend-request/:id', protect, sendFriendRequest);
router.post('/accept-request/:id', protect, acceptFriendRequest);

// Other User Routes
router.get('/search', protect, searchUsers);
router.get('/suggestions', protect, getUserSuggestions);

module.exports = router;