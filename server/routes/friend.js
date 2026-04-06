const express = require('express');
const {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    getFriendStatus
} = require('../controllers/friend');
const { protect } = require('../middleware/auth'); // Import auth middleware

const router = express.Router();

// All friend routes require authentication
router.post('/request', protect, sendFriendRequest);
router.post('/accept', protect, acceptFriendRequest);
router.post('/reject', protect, rejectFriendRequest);
router.post('/cancel', protect, cancelFriendRequest);
router.post('/remove', protect, removeFriend);
router.get('/status/:targetUserId', protect, getFriendStatus);

module.exports = router; 