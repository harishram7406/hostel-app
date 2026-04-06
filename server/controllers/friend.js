const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// Helper function to create notifications
const createNotification = async (io, userSockets, recipientId, initiatorId, type, relatedEntity) => {
    try {
        const notificationData = {
            recipient: recipientId,
            initiator: initiatorId,
            type: type,
            ...(relatedEntity && { [relatedEntity.type]: relatedEntity.id })
        };
        const newNotification = new Notification(notificationData);
        const savedNotification = await newNotification.save();

        // Populate details before emitting
        const populatedNotification = await Notification.findById(savedNotification._id)
            .populate('initiator', 'username profilePicture')
            .populate('recipient', 'username') // Optional: maybe client only needs ID
            // Add other populations if needed based on relatedEntity
            .exec();

        // --- Emit real-time event --- 
        const recipientSocketId = userSockets[recipientId.toString()]; // Ensure ID is string for lookup

        if (recipientSocketId) {
            console.log(`Emitting newNotification to socket ${recipientSocketId} for user ${recipientId}`);
            io.to(recipientSocketId).emit('newNotification', populatedNotification);
        }
        // -----------------------------

    } catch (error) {
        console.error('Error creating/emitting notification:', error);
    }
};

// @desc    Send a friend request
// @route   POST /api/friends/request
// @access  Private
const sendFriendRequest = async (req, res, next) => {
    const requesterId = req.user._id;
    const { friendId: recipientId } = req.body;

    try {
        // Validation
        if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
            const error = new Error('Valid Recipient ID (friendId) is required');
            error.statusCode = 400;
            throw error;
        }
        if (requesterId.toString() === recipientId) { // Ensure comparison works
            const error = new Error('Cannot send friend request to yourself');
            error.statusCode = 400;
            throw error;
        }

        const requester = await User.findById(requesterId);
        const recipient = await User.findById(recipientId);
        if (!requester || !recipient) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        if (requester.friends.includes(recipientId)) {
            const error = new Error('Already friends');
            error.statusCode = 400;
            throw error;
        }

        const existingRequest = await FriendRequest.findOne({
            $or: [
                { requester: requesterId, recipient: recipientId },
                { requester: recipientId, recipient: requesterId }
            ],
            status: 'pending'
        });

        if (existingRequest) {
            const error = new Error('Friend request already pending');
            error.statusCode = 400;
            throw error;
        }

        // Create new request and notification
        const newRequest = new FriendRequest({ requester: requesterId, recipient: recipientId });
        await newRequest.save();
        await createNotification(req.io, req.userSockets, recipientId, requesterId, 'friend_request');

        res.status(201).json({ message: 'Friend request sent' });

    } catch (error) {
        console.error('Send Friend Request Error:', error.message);
        next(error);
    }
};

// @desc    Accept a friend request
// @route   POST /api/friends/accept
// @access  Private
const acceptFriendRequest = async (req, res, next) => {
    const recipientId = req.user._id;
    const { friendId: requesterId } = req.body;

    try {
        // Validation
        if (!requesterId || !mongoose.Types.ObjectId.isValid(requesterId)) {
            const error = new Error('Valid Requester ID (friendId) is required');
            error.statusCode = 400;
            throw error;
        }

        const request = await FriendRequest.findOne({
            requester: requesterId,
            recipient: recipientId,
            status: 'pending'
        });

        if (!request) {
            const error = new Error('Friend request not found or already handled');
            error.statusCode = 404;
            throw error;
        }

        // Update status, friend lists, and notify
        request.status = 'accepted';
        await request.save();
        await User.findByIdAndUpdate(requesterId, { $addToSet: { friends: recipientId } });
        await User.findByIdAndUpdate(recipientId, { $addToSet: { friends: requesterId } });
        await createNotification(req.io, req.userSockets, requesterId, recipientId, 'friend_accept');

        res.status(200).json({ message: 'Friend request accepted' });

    } catch (error) {
        console.error('Accept Friend Request Error:', error.message);
        next(error);
    }
};

// @desc    Reject a friend request
// @route   POST /api/friends/reject
// @access  Private
const rejectFriendRequest = async (req, res, next) => {
    const recipientId = req.user._id;
    const { friendId: requesterId } = req.body;

    try {
        // Validation
        if (!requesterId || !mongoose.Types.ObjectId.isValid(requesterId)) {
            const error = new Error('Valid Requester ID (friendId) is required');
            error.statusCode = 400;
            throw error;
        }

        const request = await FriendRequest.findOne({
            requester: requesterId,
            recipient: recipientId,
            status: 'pending'
        });

        if (!request) {
            const error = new Error('Friend request not found or already handled');
            error.statusCode = 404;
            throw error;
        }

        // Update status (or delete)
        request.status = 'rejected';
        await request.save();
        // await FriendRequest.deleteOne({ _id: request._id }); // Alternative: delete

        res.status(200).json({ message: 'Friend request rejected' });

    } catch (error) {
        console.error('Reject Friend Request Error:', error.message);
        next(error);
    }
};

// @desc    Cancel a sent friend request
// @route   POST /api/friends/cancel
// @access  Private
const cancelFriendRequest = async (req, res, next) => {
    const requesterId = req.user._id;
    const { friendId: recipientId } = req.body;

    try {
        // Validation
        if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
            const error = new Error('Valid Recipient ID (friendId) is required');
            error.statusCode = 400;
            throw error;
        }

        const result = await FriendRequest.deleteOne({
            requester: requesterId,
            recipient: recipientId,
            status: 'pending'
        });

        if (result.deletedCount === 0) {
            const error = new Error('Pending friend request not found');
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({ message: 'Friend request cancelled' });

    } catch (error) {
        console.error('Cancel Friend Request Error:', error.message);
        next(error);
    }
};

// @desc    Remove a friend
// @route   POST /api/friends/remove
// @access  Private
const removeFriend = async (req, res, next) => {
    const userId = req.user._id;
    const { friendId } = req.body;

    try {
        // Validation
        if (!friendId || !mongoose.Types.ObjectId.isValid(friendId)) {
            const error = new Error('Valid Friend ID is required');
            error.statusCode = 400;
            throw error;
        }
        if(userId.toString() === friendId) {
            const error = new Error('Cannot remove yourself as a friend');
            error.statusCode = 400;
            throw error;
        }

        // Remove friend from both lists
        // Check if they were actually friends? Optional.
        await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
        await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });
        await FriendRequest.deleteMany({
             $or: [
                { requester: userId, recipient: friendId },
                { requester: friendId, recipient: userId }
            ]
        });

        res.status(200).json({ message: 'Friend removed' });

    } catch (error) {
        console.error('Remove Friend Error:', error.message);
        next(error);
    }
};

// @desc    Get friend status between logged-in user and another user
// @route   GET /api/friends/status/:targetUserId
// @access  Private
const getFriendStatus = async (req, res, next) => {
    const { targetUserId } = req.params;
    const userId = req.user._id;

    try {
        // Validation
        if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
            const error = new Error('Valid Target User ID parameter is required');
            error.statusCode = 400;
            throw error;
        }
        if (userId.toString() === targetUserId) {
            const error = new Error('Cannot check status with self');
            error.statusCode = 400;
            throw error;
        }

        const currentUser = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);
        if (!currentUser || !targetUser) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        // 1. Check if friends
        if (currentUser.friends.includes(targetUserId)) {
            return res.json({ status: 'friends' });
        }

        // 2. Check for pending requests
        const pendingRequest = await FriendRequest.findOne({
            $or: [
                { requester: userId, recipient: targetUserId, status: 'pending' },
                { requester: targetUserId, recipient: userId, status: 'pending' }
            ]
        });

        if (pendingRequest) {
            if (pendingRequest.requester.toString() === userId) {
                return res.json({ status: 'pending_sent' }); // Logged-in user sent request
            } else {
                return res.json({ status: 'pending_received' }); // Logged-in user received request
            }
        }

        // 3. If none of the above, they are not friends and no pending request
        return res.json({ status: 'none' });

    } catch (error) {
        console.error('Get Friend Status Error:', error.message);
        next(error);
    }
};

module.exports = {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    getFriendStatus
}; 