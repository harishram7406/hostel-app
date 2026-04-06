const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

// Helper to generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
        // Check if username exists
        let userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: `Username already exists` });
        }

        // Create new user
        const user = new User({
            username,
            password 
        });

        await user.save();

        // Respond with user data and token (exclude password)
        res.status(201).json({
            _id: user._id,
            username: user.username,
            profilePictureUrl: user.profilePictureUrl,
            bio: user.bio,
            friends: user.friends,
            token: generateToken(user._id),
        });

    } catch (error) {
        console.error(error.message);
        // Pass error to the error handling middleware
        next(error); 
    }
};

// @desc    Authenticate user & get token (Login) - Uses USERNAME now
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
    }

    try {
        // Find user by USERNAME
        console.log(`--- Attempting to find user: ${username}`);
        const user = await User.findOne({ username });
        console.log('--- User found by findOne:', user); // Log the retrieved user object

        // Perform password comparison directly using bcrypt
        let isMatch = false;
        if (user) {
             console.log('--- PRE bcrypt.compare for user:', user.username);
             isMatch = await bcrypt.compare(password, user.password);
             console.log('--- POST bcrypt.compare result:', isMatch);
        } else {
            console.log('--- User not found by username, skipping password check.');
        }

        if (user && isMatch) { // Check the direct comparison result
            // Send success response
            console.log('--- Login successful, sending response for:', user.username);
            res.json({
                _id: user._id,
                username: user.username,
                profilePictureUrl: user.profilePictureUrl,
                bio: user.bio,
                friends: user.friends,
                token: generateToken(user._id),
            });
        } else {
            console.log('--- Invalid username or password combination ---');
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Login Error:', error.message); // Log specific error message
        next(error); 
    }
};

// @desc    Get user data (for verifying token)
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
    try {
        // req.user is attached by the auth middleware
        // We need to re-fetch the user to get latest data and virtuals
        const user = await User.findById(req.user.id).select('-password'); 
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePictureUrl: user.profilePictureUrl,
            bio: user.bio,
            friends: user.friends,
        });
    } catch (error) {
        console.error(error);
        next(error);
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
}; 