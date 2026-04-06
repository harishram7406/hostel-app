const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const { attachIo } = require('../middleware/attachIo'); // Import io middleware if needed for notifications
const mongoose = require('mongoose'); // Ensure mongoose is imported

// @desc    Get all posts (Reverted: Now public, no hostel filter)
// @route   GET /api/posts
// @access  Public
const getPosts = async (req, res, next) => { 
    const { category } = req.query;
    const filter = {};
    if (category && Post.schema.path('category').enumValues.includes(category)) {
        filter.category = category;
    }
    // Reverted: Removed user/hostel logic

    try {
        // Reverted: Removed hostel filter logic, simpler populate
        const posts = await Post.find(filter)
            .populate('author', 'username profilePictureUrl') // Reverted populate
            .populate('commentCount')                                       
            .sort({ isPinned: -1, createdAt: -1 });                         

        res.status(200).json(posts);
    } catch (error) {
        console.error("Get Posts Error:", error);
        next(error); 
    }
};

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res, next) => {
    const userId = req.user._id;
    const { text, category, eventDate, eventTime } = req.body;
    const mediaPath = req.file ? req.file.path.replace(/\\/g, "/") : null;

    if (!text && !mediaPath) {
        const error = new Error('Post must include text or media.');
        error.statusCode = 400;
        return next(error);
    }
    try {
        const newPost = new Post({
            author: userId,
            text: text || '',
            media: mediaPath ? [mediaPath] : [],
            category,
            eventDate: eventDate || null,
            eventTime: eventTime || null,
        });
        const savedPost = await newPost.save();
        const postToSend = await Post.findById(savedPost._id)
                                   .populate('author', 'username profilePictureUrl')
                                   .populate('commentCount');
        res.status(201).json(postToSend);
    } catch (error) {
        next(error);
    }
};

// @desc    Search posts by text content (Reverted: Now public, no hostel filter)
// @route   GET /api/posts/search
// @access  Public
const searchPosts = async (req, res, next) => { 
    const { q } = req.query;
    // Reverted: Removed user/hostel logic

    if (!q) {
        const error = new Error('Search query (q) is required');
        error.statusCode = 400;
        return next(error);
    }

    try {
        // Reverted: Removed hostel filter logic, simpler populate
        const posts = await Post.find({
                text: { $regex: q, $options: 'i' }, 
            })
            .populate('author', 'username profilePictureUrl') // Reverted populate
            .populate('commentCount')
            .sort({ createdAt: -1 });

        res.status(200).json(posts);
    } catch (error) {
        console.error("Search Posts Error:", error);
        next(error); 
    }
};

// @desc    Like/Unlike a post
// @route   POST /api/posts/:postId/like 
// @access  Private
const likePost = async (req, res, next) => {
    const postId = req.params.postId;
    const userId = req.user._id;

    try {
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            const error = new Error('Invalid Post ID format');
            error.statusCode = 400;
            return next(error);
        }

        const post = await Post.findById(postId);

        if (!post) {
            const error = new Error('Post not found');
            error.statusCode = 404;
            return next(error);
        }

        const isLikedIndex = post.likes.findIndex(likerId => likerId.toString() === userId.toString());

        let updatedPost;
        let notificationCreated = false;
        let notification = null;

        if (isLikedIndex > -1) {
            post.likes.splice(isLikedIndex, 1);
        } else {
            post.likes.push(userId);
            if (post.author.toString() !== userId.toString()) {
                 notification = await Notification.create({
                     recipient: post.author,
                     type: 'like',
                     initiator: userId,
                     relatedPost: postId
                 });
                 notificationCreated = true;
            }
        }
        updatedPost = await post.save();

        if (notification && req.io && req.userSockets) {
            const recipientSocketId = req.userSockets.get(post.author.toString());
            if (recipientSocketId) {
                 const populatedNotification = await Notification.findById(notification._id)
                                                     .populate('initiator', 'username profilePicture');
                 req.io.to(recipientSocketId).emit('newNotification', populatedNotification);
            }
        }

        res.status(200).json({
            likesCount: updatedPost.likes.length,
            isLiked: isLikedIndex === -1,
        });

    } catch (error) {
        console.error("Like Post Error:", error);
        next(error);
    }
};

// @desc    Get comments for a post
// @route   GET /api/posts/:postId/comments
// @access  Public
const getComments = async (req, res, next) => {
    const postId = req.params.postId;
    console.log(`--- getComments: Received request for postId: ${postId} ---`); // Log entry

    try {
         if (!mongoose.Types.ObjectId.isValid(postId)) {
            console.log(`--- getComments: Invalid postId format: ${postId} ---`);
            const error = new Error('Invalid Post ID format');
            error.statusCode = 400;
            return next(error);
        }

        console.log(`--- getComments: Finding post with ID: ${postId} ---`);
        const postExists = await Post.findById(postId);
        
        if (!postExists) {
            console.log(`--- getComments: Post NOT FOUND for ID: ${postId} ---`);
            const error = new Error('Post not found');
            error.statusCode = 404;
            return next(error);
        }
        console.log(`--- getComments: Post FOUND for ID: ${postId}. Fetching comments... ---`);

        const comments = await Comment.find({ post: postId })
            .populate('author', 'username profilePicture')
            .sort({ createdAt: 1 });
            
        console.log(`--- getComments: Found ${comments.length} comments for post ${postId}. Sending 200 response. ---`);
        res.status(200).json(comments);
    } catch (error) {
        console.error("--- getComments: CATCH BLOCK ERROR ---");
        console.error(error);
        next(error); // Use centralized handler
    }
};

// @desc    Add a comment to a post
// @route   POST /api/posts/:postId/comments
// @access  Private
const addComment = async (req, res, next) => {
    const postId = req.params.postId;
    const userId = req.user._id;
    const { text } = req.body;

    if (!text) {
        const error = new Error('Comment text is required');
        error.statusCode = 400;
        return next(error);
    }

    try {
         if (!mongoose.Types.ObjectId.isValid(postId)) {
            const error = new Error('Invalid Post ID format');
            error.statusCode = 400;
            return next(error);
        }
        
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Post not found');
            error.statusCode = 404;
            return next(error);
        }

        const newComment = new Comment({
            author: userId,
            post: postId,
            text
        });

        const savedComment = await newComment.save();
        let notification = null;

        if (post.author.toString() !== userId.toString()) {
            notification = await Notification.create({
                recipient: post.author,
                type: 'comment',
                initiator: userId,
                relatedPost: postId,
                relatedComment: savedComment._id
            });
        }

        const commentToSend = await Comment.findById(savedComment._id)
                                         .populate('author', 'username profilePicture');

        if (notification && req.io && req.userSockets) {
            const recipientSocketId = req.userSockets.get(post.author.toString());
            if (recipientSocketId) {
                 const populatedNotification = await Notification.findById(notification._id)
                                                     .populate('initiator', 'username profilePicture');
                 req.io.to(recipientSocketId).emit('newNotification', populatedNotification);
            }
        }

        res.status(201).json(commentToSend);

    } catch (error) {
        console.error("Add Comment Error:", error);
        next(error);
    }
};

// @desc    Pin/Unpin a post
// @route   POST /api/posts/:postId/pin
// @access  Private (Admin/Mod only - TO IMPLEMENT access control)
const pinPost = async (req, res, next) => {
    const postId = req.params.postId;
    // TODO: Implement admin/moderator check using req.user roles
    // const requestingUserId = req.user._id;
    // const user = await User.findById(requestingUserId);
    // if (!user.isAdmin && !user.isModerator) { ... return 403 ... }

    try {
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            const error = new Error('Invalid Post ID format');
            error.statusCode = 400;
            return next(error);
        }

        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Post not found');
            error.statusCode = 404;
            return next(error);
        }

        // Toggle the isPinned status
        post.isPinned = !post.isPinned;
        const updatedPost = await post.save();

        res.status(200).json({ isPinned: updatedPost.isPinned });

    } catch (error) {
        console.error("Pin Post Error:", error);
        next(error); // Use centralized handler
    }
};

// @desc    Get a single post by ID (Reverted: Now public, no hostel check)
// @route   GET /api/posts/:postId
// @access  Public
const getPostById = async (req, res, next) => {
    const postId = req.params.postId;
    // Reverted: Removed user/hostel logic

    try {
         if (!mongoose.Types.ObjectId.isValid(postId)) {
            const error = new Error('Invalid Post ID format');
            error.statusCode = 400;
            return next(error);
        }
        
        // Reverted: Removed hostel check logic, simpler populate
        const post = await Post.findById(postId)
            .populate('author', 'username profilePictureUrl') // Reverted populate
            .populate('commentCount');

        if (!post) {
            const error = new Error('Post not found');
            error.statusCode = 404;
            return next(error);
        }
        
        res.status(200).json(post);
    } catch (error) {
        console.error("Get Post By ID Error:", error);
        next(error); 
    }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:postId
// @access  Private (Author only)
const deletePost = async (req, res, next) => {
    const postId = req.params.postId;
    const userId = req.user._id; // From protect middleware

    try {
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            const error = new Error('Invalid Post ID format');
            error.statusCode = 400;
            return next(error);
        }

        const post = await Post.findById(postId);

        if (!post) {
            const error = new Error('Post not found');
            error.statusCode = 404;
            return next(error);
        }

        // Check if the logged-in user is the author of the post
        if (post.author.toString() !== userId.toString()) {
            const error = new Error('User not authorized to delete this post');
            error.statusCode = 403; // 403 Forbidden is appropriate here
            return next(error);
        }

        // Proceed with deletion
        await Post.findByIdAndDelete(postId);

        // Optional: Delete associated comments
        await Comment.deleteMany({ post: postId });

        // Optional: Delete associated notifications (can be complex)
        // await Notification.deleteMany({ relatedPost: postId });
        
        // Optional: Delete media files from storage (requires fs module and more logic)

        res.status(200).json({ message: 'Post deleted successfully' });

    } catch (error) {
        console.error("Delete Post Error:", error);
        next(error);
    }
};

module.exports = {
    getPosts, // Reverted
    createPost, 
    searchPosts, // Reverted
    likePost, 
    getComments, 
    addComment, 
    pinPost, 
    getPostById, // Reverted
    deletePost 
}; 