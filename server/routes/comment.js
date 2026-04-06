const express = require('express');
const { deleteComment } = require('../controllers/commentController'); // Adjust path if needed
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   DELETE /api/comments/:commentId
// @desc    Delete a comment
// @access  Private (Author only)
router.delete('/:commentId', protect, deleteComment);

module.exports = router; 