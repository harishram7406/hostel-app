const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
    requester: { // User who sent the request
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: { // User who received the request
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    }
}, {
    timestamps: true
});

// Index to prevent duplicate requests and find requests quickly
friendRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });

module.exports = mongoose.model('FriendRequest', friendRequestSchema); 