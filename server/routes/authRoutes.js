const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middleware/validators');
const { protect } = require('../middleware/auth');

// POST /api/auth/register - Register a new user
router.post(
    '/register', 
    registerValidation, 
    registerUser
);

// POST /api/auth/login - Authenticate user & get token
router.post('/login', loginValidation, loginUser);

// GET /api/auth/me - Get logged in user info (requires token)
router.get('/me', protect, getMe);

module.exports = router; 