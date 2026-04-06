const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { // The user who should receive the notification
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    initiator: { // The user who triggered the notification (e.g., liked, commented, sent request)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['like', 'comment', 'friend_request', 'friend_accept']
    },
    relatedPost: { // Optional: Link to the post involved (for likes, comments)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    relatedUser: { // Optional: Link to the user involved (for friend requests)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Add index for querying notifications by user, possibly filtering by read status
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 