const DirectMessage = require('../models/DM');
const User = require('../models/User');
const mongoose = require('mongoose'); // Ensure mongoose is imported

// @desc    Get messages between logged-in user and a partner
// @route   GET /api/dms/:partnerId
// @access  Private
const getMessages = async (req, res, next) => { // Added next
    const userId = req.user._id; // Use authenticated user ID
    const { partnerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
        const error = new Error('Invalid Partner ID format');
        error.statusCode = 400;
        return next(error);
    }

    try {
        const messages = await DirectMessage.find({
                $or: [
                    { sender: userId, recipient: partnerId },
                    { sender: partnerId, recipient: userId }
                ]
            })
            .sort({ createdAt: 1 }) // Show oldest messages first
            .populate('sender', 'username profilePicture')
            .populate('recipient', 'username profilePicture'); // Also populate recipient

        res.json(messages);
    } catch (error) {
        console.error('Get Messages Error:', error);
        next(error); // Use centralized handler
    }
};

// @desc    Send a direct message
// @route   POST /api/dms/:recipientId
// @access  Private
const sendMessage = async (req, res, next) => { // Added next
    const senderId = req.user._id; // Use authenticated user ID
    const { text } = req.body; // Only text from body now
    const { recipientId } = req.params;
    const mediaPath = req.file ? req.file.path.replace(/\\/g, "/") : null;

    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        const error = new Error('Invalid Recipient ID format');
        error.statusCode = 400;
        return next(error);
    }

    if (!text && !mediaPath) {
        const error = new Error('Message text or media is required');
        error.statusCode = 400;
        return next(error);
    }

    try {
        // Check if recipient exists and if they are friends with sender
        const recipientUser = await User.findById(recipientId).select('friends');
        const senderUser = await User.findById(senderId).select('friends'); // Need sender for friend check

        if (!recipientUser) {
            const error = new Error('Recipient user not found');
            error.statusCode = 404;
            return next(error);
        }
        if (!senderUser) {
            const error = new Error('Sender user not found (Internal Error)');
            error.statusCode = 404; // Should not happen if protect middleware works
            return next(error);
        }
        
        // Check if users are friends
        if (!recipientUser.friends.includes(senderId) || !senderUser.friends.includes(recipientId)) {
            const error = new Error('You can only message users you are friends with.');
            error.statusCode = 403; // 403 Forbidden
            return next(error);
        }

        const messageData = {
            sender: senderId,
            recipient: recipientId,
            text: text || '',
            media: mediaPath
            // participants array will be set by pre-save hook in DM model
        };

        const message = new DirectMessage(messageData);
        const savedMessage = await message.save();

        // Populate sender details for the response/socket
        const populatedMessage = await DirectMessage.findById(savedMessage._id)
                                                    .populate('sender', 'username profilePicture')
                                                    .populate('recipient', 'username profilePicture'); // Populate recipient too

        // Emit socket event to the recipient
        if (req.io && req.userSockets) {
            const recipientSocketId = req.userSockets.get(recipientId.toString());
            if (recipientSocketId) {
                 req.io.to(recipientSocketId).emit('newMessage', populatedMessage);
            }
        }

        res.status(201).json(populatedMessage);

    } catch (error) {
        console.error('Send DM Error:', error);
        next(error); // Use centralized handler
    }
};

module.exports = {
    getMessages,
    sendMessage,
}; 