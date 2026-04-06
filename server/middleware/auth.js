const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Import User model to attach user object

const protect = async (req, res, next) => {
    let token;

    console.log('--- protect middleware --- Authorization header:', req.headers.authorization);

    // Check for token in Authorization header (Bearer TOKEN)
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            console.log('--- protect middleware --- Token extracted:', token);

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('--- protect middleware --- Token decoded:', decoded);

            // Get user from the token (using the id in the payload)
            // Attach user object to the request (excluding password)
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                console.warn('--- protect middleware --- User not found for decoded token ID:', decoded.id);
                // Throw error so it's caught below
                throw new Error('User not found'); 
            }
            
            console.log('--- protect middleware --- User attached to req:', req.user.username);
            next(); // Move to the next middleware/route handler
        } catch (error) {
            // Log the specific JWT error
            console.error('--- protect middleware --- JWT Verification Error:', error.name, error.message);
            res.status(401); // Set status to Unauthorized
            // Pass a more specific error to the error handler
            next(new Error('Not authorized, token failed')); 
        }
    } else {
        console.log('--- protect middleware --- No token found in header.');
        res.status(401);
        next(new Error('Not authorized, no token'));
    }

    // Redundant check, should not be reached if logic above is correct
    // if (!token) {
    //   res.status(401);
    //   next(new Error('Not authorized, no token provided'));
    // }
};

module.exports = { protect }; 