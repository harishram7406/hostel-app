const User = require('../models/User');
const Post = require('../models/Post');
const jwt = require('jsonwebtoken');

// @desc    Get user profile by username (including posts)
// @route   GET /api/users/profile/:username
// @access  Public (or Private if profiles are restricted)
const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findOne({ username: req.params.username })
                               .select('-password') // Exclude password
                               .populate('friends', 'username profilePicture'); // Optionally populate basic friend info

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        // Find posts by this user
        const posts = await Post.find({ author: user._id })
                                .sort({ createdAt: -1 })
                                .populate('author', 'username profilePicture') // Populate author info in posts
                                .populate('comments'); // Optionally populate comment details or count

        // Combine user profile data and their posts
        const userProfile = {
           ...user.toObject(), // Convert mongoose doc to plain object
           posts: posts
        };

        res.json(userProfile);

    } catch (error) {
        console.error('Get User Profile Error:', error.message);
        next(error); // Use centralized handler
    }
};

// @desc    Get basic user details by ID (internal use or limited public)
// @route   GET /api/users/:id
// @access  Private/Public (depending on use case)
const getUserById = async (req, res, next) => {
     try {
        const user = await User.findById(req.params.id)
                               .select('-password') // Exclude password
                               .populate('friends', 'username'); // Populate friend usernames

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }
        // You might only return limited info here if public
        res.json({ user }); // Adjust response structure if needed

    } catch (error) {
        console.error('Get User By ID Error:', error.message);
         // Check for invalid ObjectId format
        if (error.kind === 'ObjectId') {
            error.statusCode = 400;
        }
        next(error); // Use centralized handler
    }
};

// @desc    Update current logged-in user's profile
// @route   PUT /api/users/me
// @access  Private
const updateUserProfile = async (req, res, next) => {
    const userId = req.user._id; // Use authenticated user ID
    const { username, bio } = req.body; // Get updates from body

    try {
        const user = await User.findById(userId);

        if (!user) {
            // Should be caught by protect middleware, but good practice
            const error = new Error('User not found (authorization issue?)');
            error.statusCode = 404;
            throw error;
        }

        // Check if username is being changed and if it's already taken
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username: username });
            // Check if the user found is not the current user
            if (existingUser && existingUser._id.toString() !== userId.toString()) {
                 const error = new Error('Username already taken');
                 error.statusCode = 400;
                 throw error;
            }
            user.username = username;
        }

        // Update bio if provided
        if (bio !== undefined) { // Allow setting empty bio
            user.bio = bio;
        }

        // Update profile picture if a file was uploaded
        if (req.file) {
            // TODO: Add logic here to delete the OLD profile picture file from storage
            user.profilePicture = req.file.path; // Store the path provided by multer
        }

        const updatedUser = await user.save();

        // Return updated user info (excluding password)
        res.json({
             _id: updatedUser._id,
             username: updatedUser.username,
             bio: updatedUser.bio,
             profilePicture: updatedUser.profilePicture,
             friends: updatedUser.friends,
             // Re-issue token as username might be part of payload in some setups
             token: generateToken(updatedUser._id) // Re-use generateToken if available or import
        });

    } catch (error) {
        console.error('Update User Profile Error:', error.message);
        if (error.name === 'ValidationError') {
            error.statusCode = 400;
            error.message = Object.values(error.errors).map(val => val.message).join('. ');
        }
        next(error); // Use centralized handler
    }
};

// Helper function to generate JWT (copy or import)
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    getUserById
}; 