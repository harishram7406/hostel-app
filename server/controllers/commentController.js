const Comment = require('../models/Comment');
const Post = require('../models/Post'); // May not be needed unless updating post comment counts
const mongoose = require('mongoose');

// @desc    Delete a comment
// @route   DELETE /api/comments/:commentId
// @access  Private (Author only)
const deleteComment = async (req, res, next) => {
    const commentId = req.params.commentId;
    const userId = req.user._id; // From protect middleware

    try {
        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            const error = new Error('Invalid Comment ID format');
            error.statusCode = 400;
            return next(error);
        }

        const comment = await Comment.findById(commentId);

        if (!comment) {
            const error = new Error('Comment not found');
            error.statusCode = 404;
            return next(error);
        }

        // Check if the logged-in user is the author of the comment
        if (comment.author.toString() !== userId.toString()) {
            const error = new Error('User not authorized to delete this comment');
            error.statusCode = 403; // 403 Forbidden
            return next(error);
        }

        // Proceed with deletion
        await Comment.findByIdAndDelete(commentId);

        // Optional: Remove comment ID from Post.comments array if you store it there
        // Optional: Delete associated notifications

        res.status(200).json({ message: 'Comment deleted successfully' });

    } catch (error) {
        console.error("Delete Comment Error:", error);
        next(error);
    }
};

module.exports = {
    deleteComment,
}; 