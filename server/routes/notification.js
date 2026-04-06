const express = require('express');
const {
    getMyNotifications,
    markNotificationsRead,
    markSingleNotificationRead
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Get notifications for logged-in user
router.get('/me', protect, getMyNotifications);

// Mark all notifications as read
router.post('/me/read', protect, markNotificationsRead);

// Mark a specific notification as read
router.patch('/:notificationId/read', protect, markSingleNotificationRead);

module.exports = router; 