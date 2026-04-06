const { check, body } = require('express-validator');
const User = require('../models/User');

const registerValidation = [
    // Removed debug logger

    check('username', 'Username is required').not().isEmpty(),
    check('username', 'Username must be at least 3 characters').isLength({ min: 3 }),
    // Custom validator to check if username is unique
    // body('username').custom(async value => {
    //     const user = await User.findOne({ username: value });
    //     if (user) {
    //         return Promise.reject('Username already in use');
    //     }
    // }),
    
    // Reverted: Uncommented email check
    // check('email', 'Please include a valid email').isEmail(), 
    
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
    
    // Reverted: Removed commented out checks for hostel/room
];

// Updated login validation to check username
const loginValidation = [
    check('username', 'Username is required').not().isEmpty(),
    check('password', 'Password is required').exists()
];

const postValidation = [
    check('text', 'Post text cannot be empty').not().isEmpty().trim()
    // Add more validation as needed (e.g., media format/size, category)
];

const commentValidation = [
    check('text', 'Comment text cannot be empty').not().isEmpty().trim()
];

// ... (other validations if needed)

module.exports = {
    registerValidation,
    loginValidation,
    postValidation,
    commentValidation
}; 