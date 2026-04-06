const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// Placeholder for user ID retrieval - replace with real auth middleware
const getUserIdFromRequest = (req) => {
    console.warn("Using placeholder user ID retrieval - Needs proper auth middleware!");
    // For GET requests, expect userId in query params. For POST, expect in body.
    return req.method === 'GET' ? req.query.userId : req.body.userId;
}

// @desc    Get messages between logged-in user and another user
// @route   GET /api/dms/:partnerId
// @access  Private
const getDirectMessages = async (req, res, next) => {
    const { partnerId } = req.params;
    const currentUserId = req.user._id; // Use ID from protect middleware

    try {
        // Validate partnerId format (optional but good practice)
        if (!mongoose.Types.ObjectId.isValid(partnerId)) {
            const error = new Error('Invalid partner ID format');
            error.statusCode = 400;
            throw error;
        }

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, receiver: partnerId },
                { sender: partnerId, receiver: currentUserId }
            ]
        })
        .populate('sender', 'username profilePicture')
        .sort({ createdAt: 1 });

        res.status(200).json(messages);

    } catch (error) {
        console.error("Get DMs Error:", error.message);
        next(error); // Use centralized handler
    }
};

// @desc    Send a direct message to another user
// @route   POST /api/dms/:receiverId
// @access  Private
const sendDirectMessage = async (req, res, next) => {
    const { receiverId } = req.params;
    const senderId = req.user._id;

    try {
        // Input validation
        if (!mongoose.Types.ObjectId.isValid(receiverId)) {
            const error = new Error('Invalid receiver ID format');
            error.statusCode = 400;
            throw error;
        }
        if (senderId.toString() === receiverId) {
            const error = new Error('Cannot send direct message to yourself');
            error.statusCode = 400;
            throw error;
        }

        const { text } = req.body;
        const mediaPath = req.file ? `/uploads/${req.file.filename}` : null;

        if (!text && !mediaPath) {
            const error = new Error('Message must include text or media');
            error.statusCode = 400;
            throw error;
        }

        const receiverExists = await User.findById(receiverId);
        if (!receiverExists) {
            const error = new Error('Recipient user not found');
            error.statusCode = 404;
            throw error;
        }

        const newMessage = new Message({
            sender: senderId,
            receiver: receiverId,
            text: text || '',
            media: mediaPath
        });

        const savedMessage = await newMessage.save();
        const messageToSend = await Message.findById(savedMessage._id)
                                         .populate('sender', 'username profilePicture');

        // Emit real-time event
        const io = req.io;
        const userSockets = req.userSockets;
        const receiverSocketId = userSockets[receiverId];

        if (receiverSocketId) {
            console.log(`Emitting newMessage to socket ${receiverSocketId} for user ${receiverId}`);
            io.to(receiverSocketId).emit('newMessage', messageToSend);
        }

        res.status(201).json(messageToSend);

    } catch (error) {
        console.error("Send DM Error:", error.message);
        if (error.name === 'ValidationError') error.statusCode = 400;
        // Add check for ObjectId format errors potentially thrown by User.findById
        if (error.kind === 'ObjectId') error.statusCode = 400;
        next(error); // Use centralized handler
    }
};

module.exports = {
    getDirectMessages,
    sendDirectMessage
}; 