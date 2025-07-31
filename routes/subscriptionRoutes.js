const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Purchase Subscription
router.post('/subscribe', authMiddleware.protect, subscriptionController.subscribe);

// Cancel Subscription
router.post('/cancel',  authMiddleware.protect, subscriptionController.cancel);

module.exports = router;