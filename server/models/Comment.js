const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    text: {
        type: String,
        required: [true, 'Comment text is required'],
        trim: true,
        maxlength: [150, 'Comment cannot exceed 150 characters']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
        index: true // Index for faster comment lookups by post
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Comment', commentSchema); 