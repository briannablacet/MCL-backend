const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Email/password login
router.post('/login', authController.login);

// Register route (email/password)
router.post('/register', authController.register);

// Get current user (protected route)
router.get('/me', authMiddleware.protect, authController.getMe);

module.exports = router;
