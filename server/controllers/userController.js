const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const mongoose = require('mongoose'); // Ensure mongoose is imported

// @desc    Get logged-in user's profile details
// @route   GET /api/users/me
// @access  Private
const getMyProfile = async (req, res, next) => {
    const userId = req.user._id; // Get ID from protect middleware

    try {
        const user = await User.findById(userId)
            .select('-password') // Exclude password
            .populate('friends', 'username profilePictureUrl'); // Populate friends with the virtual URL
            // .populate('friendRequests', 'username profilePicture'); // Only show requests to self?

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            return next(error);
        }

        res.status(200).json(user);

    } catch (error) {
        console.error("Get My Profile Error:", error);
        if (error.name === 'CastError') {
             const castError = new Error('Invalid user ID format in token?');
             castError.statusCode = 400;
             return next(castError);
        }
        next(error);
    }
};

// @desc    Get user profile (posts, details, friends)
// @route   GET /api/users/:username
// @access  Public
const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findOne({ username: req.params.username })
                               .select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find posts authored by this user
        const posts = await Post.find({ author: user._id })
                                .sort({ createdAt: -1 })
                                .populate('author', 'username profilePictureUrl') // Use virtual URL
                                .populate('commentCount'); // Populate comment count

        // Find friends
        const friends = await User.find({ _id: { $in: user.friends } })
                                .select('username profilePictureUrl'); // Use virtual URL

        res.json({ user, posts, friends });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get user details BY ID
// @route   GET /api/users/:id
// @access  Public
const getUserById = async (req, res, next) => {
    const { id } = req.params;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error('Invalid User ID format');
            error.statusCode = 400;
            return next(error);
        }
        
        const user = await User.findById(id)
            .select('-password');

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            return next(error);
        }

        res.status(200).json(user);

    } catch (error) {
        console.error("Get User By ID Error:", error);
        next(error);
    }
};

// @desc    Update logged-in user profile
// @route   PUT /api/users/me
// @access  Private
const updateUserProfile = async (req, res, next) => {
    const userId = req.user._id; // Use ID from protect middleware
    const { username, bio } = req.body;
    const profilePicturePath = req.file ? req.file.path.replace(/\\/g, "/") : null;

    try {
        const user = await User.findById(userId);

        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            return next(error);
        }

        // Check username uniqueness if changed
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                const error = new Error('Username already taken');
                error.statusCode = 400;
                return next(error);
            }
            user.username = username;
        }

        if (bio !== undefined) {
            user.bio = bio;
        }
        if (profilePicturePath) {
            user.profilePicture = profilePicturePath;
        }

        const updatedUser = await user.save();

        // Return updated user without password
        res.status(200).json({
            _id: updatedUser._id,
            username: updatedUser.username,
            profilePicture: updatedUser.profilePicture,
            bio: updatedUser.bio,
            friends: updatedUser.friends,
            createdAt: updatedUser.createdAt
        });

    } catch (error) {
        console.error("Update User Profile Error:", error);
        next(error);
    }
};

// @desc    Send a friend request
// @route   POST /api/users/friend-request/:id
// @access  Private
const sendFriendRequest = async (req, res, next) => {
    const recipientId = req.params.id;
    const senderId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        const error = new Error('Invalid recipient ID format');
        error.statusCode = 400;
        return next(error);
    }

    if (senderId.toString() === recipientId.toString()) {
        const error = new Error('You cannot send a friend request to yourself');
        error.statusCode = 400;
        return next(error);
    }

    try {
        const recipient = await User.findById(recipientId);
        const sender = await User.findById(senderId); // Explicitly find sender

        // Check if both users were found
        if (!recipient || !sender) {
            const error = new Error(!recipient ? 'Recipient user not found' : 'Sender user not found (Internal Error)');
            error.statusCode = 404;
            return next(error);
        }
        
        // Defensive check for friends arrays (should default to [])
        if (!recipient.friends || !sender.friends) {
             console.error("Friends array missing for recipient or sender - Schema issue?", { recipientId, senderId });
             const error = new Error('Server error checking friendship status.');
             error.statusCode = 500;
             return next(error);
        }

        // Check if already friends
        if (recipient.friends.includes(senderId) || sender.friends.includes(recipientId)) {
            const error = new Error('Already friends with this user');
            error.statusCode = 400;
            return next(error);
        }

        // Check if request already sent (either way)
        // Defensive check for friendRequests arrays
        if (!recipient.friendRequests || !sender.friendRequests) {
             console.error("friendRequests array missing for recipient or sender - Schema issue?", { recipientId, senderId });
             const error = new Error('Server error checking friend requests.');
             error.statusCode = 500;
             return next(error);
        }
        if (recipient.friendRequests.includes(senderId)) {
            const error = new Error('Friend request already sent to this user');
            error.statusCode = 400;
            return next(error);
        }
        if (sender.friendRequests.includes(recipientId)) {
            const error = new Error('This user has already sent you a friend request');
            error.statusCode = 400;
            return next(error);
        }

        recipient.friendRequests.push(senderId);
        await recipient.save();

        const notification = await Notification.create({
            recipient: recipientId,
            type: 'friend_request',
            initiator: senderId
        });

        if (req.io && req.userSockets) {
            const recipientSocketId = req.userSockets.get(recipientId.toString());
            if (recipientSocketId) {
                const populatedNotification = await Notification.findById(notification._id)
                                                    .populate('initiator', 'username profilePicture');
                req.io.to(recipientSocketId).emit('newNotification', populatedNotification);
            }
        }

        res.status(200).json({ message: 'Friend request sent successfully' });

    } catch (error) {
        console.error("Send Friend Request Error:", error);
        next(error);
    }
};

// @desc    Accept a friend request
// @route   POST /api/users/accept-request/:id
// @access  Private
const acceptFriendRequest = async (req, res, next) => {
    const senderId = req.params.id; // ID of the user whose request is being accepted
    const recipientId = req.user._id; // The user accepting the request

    // Basic ID validation
    if (!mongoose.Types.ObjectId.isValid(senderId)) {
        const error = new Error('Invalid sender ID format');
        error.statusCode = 400;
        return next(error);
    }

    if (senderId.toString() === recipientId.toString()) {
        const error = new Error('Invalid operation');
        error.statusCode = 400;
        return next(error);
    }

    try {
        const recipient = await User.findById(recipientId);
        const sender = await User.findById(senderId);

        if (!recipient || !sender) {
            const error = new Error('Sender or recipient user not found');
            error.statusCode = 404;
            return next(error);
        }

        const requestIndex = recipient.friendRequests.indexOf(senderId);
        if (requestIndex === -1) {
            const error = new Error('No friend request found from this user');
            error.statusCode = 400;
            return next(error);
        }

        recipient.friendRequests.splice(requestIndex, 1);

        if (!recipient.friends.includes(senderId)) {
            recipient.friends.push(senderId);
        }
        if (!sender.friends.includes(recipientId)) {
            sender.friends.push(recipientId);
        }

        await recipient.save();
        await sender.save();

        // Create notification for the sender that request was accepted
        const notification = await Notification.create({
            recipient: senderId, // Notify the original sender
            type: 'friend_accept',
            initiator: recipientId // The user who accepted
        });

        // Emit socket event
        if (req.io && req.userSockets) {
            const senderSocketId = req.userSockets.get(senderId.toString());
            if (senderSocketId) {
                const populatedNotification = await Notification.findById(notification._id)
                                                    .populate('initiator', 'username profilePicture');
                req.io.to(senderSocketId).emit('newNotification', populatedNotification);
            }
        }

        res.status(200).json({ message: 'Friend request accepted' });

    } catch (error) {
        console.error("Accept Friend Request Error:", error);
        next(error); // Use centralized handler
    }
};

// @desc    Search users by username
// @route   GET /api/users/search
// @access  Private (simulated - requires login to search)
const searchUsers = async (req, res) => {
    const { q } = req.query; // Search query
    // TODO: Replace with actual user ID from auth middleware
    const currentUserId = req.user._id;

    if (!q) {
        return res.status(400).json({ message: 'Search query (q) is required' });
    }
    // if (!currentUserId) {
    //     return res.status(401).json({ message: 'Authentication required to search users (Simulated)' });
    // }

    try {
        const users = await User.find({
            username: { $regex: q, $options: 'i' }, // Case-insensitive search
            _id: { $ne: currentUserId } // Exclude the current user from results (optional)
        })
        .select('username profilePicture bio') // Select fields to return
        .limit(10); // Limit results for performance

        res.status(200).json(users);

    } catch (error) {
        console.error("Search Users Error:", error);
        res.status(500).json({ message: 'Server error searching users' });
    }
};

// @desc    Get user suggestions (simple version: random non-friends)
// @route   GET /api/users/suggestions
// @access  Private (simulated)
const getUserSuggestions = async (req, res) => {
    // TODO: Replace with actual user ID from auth middleware
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 5; // Default to 5 suggestions

    if (!userId) {
         return res.status(401).json({ message: 'Authentication required for suggestions (Simulated)' });
    }

    try {
        const currentUser = await User.findById(userId).select('friends');
        if (!currentUser) {
            return res.status(404).json({ message: 'Current user not found' });
        }

        const friendsAndSelf = [...currentUser.friends, userId]; // Combine friends and self IDs

        // Find users who are NOT the current user and NOT already friends
        const suggestions = await User.find({ _id: { $nin: friendsAndSelf } })
            .select('username profilePicture bio')
            .limit(limit); // Use Mongoose limit
            // For truly random, you might need aggregate with $sample, but this is simpler

        // If fewer suggestions found than limit, that's okay
        res.status(200).json(suggestions);

    } catch (error) {
        console.error("Get User Suggestions Error:", error);
        res.status(500).json({ message: 'Server error getting user suggestions' });
    }
};

module.exports = {
    getMyProfile,
    getUserProfile,
    updateUserProfile,
    getUserById,
    sendFriendRequest,
    acceptFriendRequest,
    searchUsers,
    getUserSuggestions
}; 