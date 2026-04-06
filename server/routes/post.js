const express = require('express');
const {
    createPost,
    getPosts,
    getPostById,
    likePost,
    addComment,
    getComments,
    searchPosts,
    pinPost,
    deletePost
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/posts/search - Reverted: Public
router.get('/search', searchPosts);

// GET /api/posts - Get feed - Reverted: Public
router.get('/', getPosts);

// POST /api/posts - Create post - Protected
router.post('/', protect, upload.single('media'), createPost);

// GET /api/posts/:postId - Get single post - Reverted: Public
router.get('/:postId', getPostById);

// POST /api/posts/:postId/like - Like/unlike post - Protected
router.post('/:postId/like', protect, likePost);

// POST /api/posts/:postId/comments - Add comment - Protected
router.post('/:postId/comments', protect, addComment);

// GET /api/posts/:postId/comments - Get comments for post - Reverted: Public
router.get('/:postId/comments', getComments);

// DELETE /api/posts/:postId - Delete a post - Protected
router.delete('/:postId', protect, deletePost);

// POST /api/posts/:postId/pin - Pin/Unpin post (Needs admin role check)
router.post('/:postId/pin', protect, pinPost);

module.exports = router;