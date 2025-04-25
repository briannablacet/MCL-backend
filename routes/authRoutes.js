const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Email/password login
router.post('/login', authController.login);

// Register route (email/password)
router.post('/register', authController.register);

// Update user profile
router.put("/users",authController.updateUserProfile)

router.get('/users', authMiddleware.protect, authController.getAllUsers);

// Get current user (protected route)
router.get('/me', authMiddleware.protect, authController.getMe);

module.exports = router;
