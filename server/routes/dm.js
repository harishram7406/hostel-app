const express = require('express');
const { getMessages, sendMessage } = require('../controllers/dm');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Get messages with a specific user
// Logged-in user is identified by protect middleware
router.get('/:partnerId', protect, getMessages);

// Send a message to a specific user
// Use upload.single('media') for optional media attachment
router.post('/:recipientId', protect, upload.single('media'), sendMessage);

module.exports = router; 