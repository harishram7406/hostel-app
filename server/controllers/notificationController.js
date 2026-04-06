const Notification = require('../models/Notification');
const mongoose = require('mongoose'); // Import mongoose

// @desc    Get notifications for the logged-in user
// @route   GET /api/notifications/me
// @access  Private
const getMyNotifications = async (req, res, next) => { // Add next
    const userId = req.user._id; // Use ID from protect middleware

    try {
        const onlyUnread = req.query.unread === 'true';
        const filter = { recipient: userId }; // Changed field name to recipient based on model
        if (onlyUnread) {
            filter.isRead = false;
        }

        const notifications = await Notification.find(filter)
            .populate('initiator', 'username profilePictureUrl')
            .populate('relatedPost', 'text')
            .sort({ createdAt: -1 })
            .limit(20);

        const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

        res.status(200).json({ notifications, unreadCount });

    } catch (error) {
        console.error("Get Notifications Error:", error.message);
        next(error); // Use centralized handler
    }
};

// @desc    Mark notifications as read for the logged-in user
// @route   POST /api/notifications/me/read
// @access  Private
const markNotificationsRead = async (req, res, next) => { // Add next
    const userId = req.user._id; // Use ID from protect middleware
    const { notificationIds } = req.body;
    const markAll = !notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0;

    try {
        let updateResult;
        let filter = { recipient: userId }; // Use recipient field

        if (markAll) {
            filter.isRead = false;
            updateResult = await Notification.updateMany(filter, { $set: { isRead: true } });
        } else {
            // Validate ObjectIds
            const validIds = notificationIds.filter(id => mongoose.Types.ObjectId.isValid(id));
            if(validIds.length !== notificationIds.length){
                console.warn('Some invalid notification IDs provided for marking read');
            }
            if(validIds.length === 0) {
                 return res.status(200).json({ message: 'No valid notifications to mark as read', modifiedCount: 0 });
            }
            
            filter._id = { $in: validIds };
            updateResult = await Notification.updateMany(filter, { $set: { isRead: true } });
        }

        res.status(200).json({ message: 'Notifications marked as read', modifiedCount: updateResult.modifiedCount });

    } catch (error) {
        console.error("Mark Notifications Read Error:", error.message);
        next(error); // Use centralized handler
    }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:notificationId/read
// @access  Private
const markSingleNotificationRead = async (req, res, next) => {
    const userId = req.user._id; // Use ID from protect middleware
    const { notificationId } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
             const error = new Error('Invalid Notification ID format');
             error.statusCode = 400;
             throw error;
        }

        const result = await Notification.updateOne(
            { _id: notificationId, recipient: userId }, // Ensure user owns notification
            { $set: { isRead: true } }
        );

        if (result.matchedCount === 0) {
            // Either notification doesn't exist or doesn't belong to user
            const error = new Error('Notification not found or not authorized');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({ message: 'Notification marked as read' });

    } catch (error) {
        console.error("Mark Single Notification Read Error:", error.message);
        next(error);
    }
};

module.exports = {
    getMyNotifications,
    markNotificationsRead,
    markSingleNotificationRead
}; 