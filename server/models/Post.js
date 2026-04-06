const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Comment = require('./Comment'); // Need Comment model for count

const postSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to the User who created the post
        required: true
    },
    text: {
        type: String,
        required: [true, 'Post text is required'],
        trim: true,
        maxlength: [280, 'Post cannot exceed 280 characters'] // Example length limit
    },
    media: [{
        type: String // Array of paths/URLs to uploaded images/videos
    }],
    likes: [{
        type: Schema.Types.ObjectId,
        ref: 'User' // Reference to Users who liked the post
    }],
    comments: [{
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    category: {
        type: String,
        enum: ['General', 'Events', 'Lost & Found', 'Announcements', 'Other'], // Example categories
        default: 'General'
    },
    eventDetails: {
        date: Date,
        time: String,
        location: String
    }, // Optional details for 'Events' category
    isPinned: {
        type: Boolean,
        default: false
    }, // For potential admin pinning
    eventDate: {
        type: Date,
        required: false // Only required if category is 'Events'? Add validation if needed.
    },
    eventTime: {
        type: String, // Store time as string for simplicity (e.g., "HH:MM AM/PM")
        required: false,
        trim: true
    }
}, {
    timestamps: true,
    // Enable virtuals
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual property for comment count
postSchema.virtual('commentCount', {
    ref: 'Comment',    // The model to use
    localField: '_id', // Find comments where 'post' field
    foreignField: 'post', // equals the local '_id'
    count: true        // Only get the count
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post; 