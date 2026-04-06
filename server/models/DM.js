const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        trim: true
        // Not required if media is present
    },
    media: {
        type: String // Path/URL to optional image/video
    },
    // Index for querying messages between two users efficiently
    participants: {
        type: [mongoose.Schema.Types.ObjectId],
        index: true,
        required: true
    }
}, {
    timestamps: true
});

// Ensure participants array always contains sender and recipient
// and is sorted to make querying consistent regardless of who sent the message.
directMessageSchema.pre('save', function(next) {
    if (this.isNew || this.isModified('sender') || this.isModified('recipient')) {
        const senderId = this.sender.toString();
        const recipientId = this.recipient.toString();
        // Sort IDs to ensure consistency
        this.participants = [senderId, recipientId].sort();
    }
    next();
});

module.exports = mongoose.model('DirectMessage', directMessageSchema); 