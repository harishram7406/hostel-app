const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        trim: true,
        // Should text be required? Maybe allow sending only media.
        // required: true 
    },
    media: {
        type: String, // Path to uploaded image/video file (optional)
        required: false
    },
    // Add an index for efficient querying of conversations between two users
    // index({ sender: 1, receiver: 1, createdAt: -1 }),
    // index({ receiver: 1, sender: 1, createdAt: -1 })
}, {
    timestamps: true // Adds createdAt and updatedAt fields automatically
});

// Add compound index after schema definition for querying conversations
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 