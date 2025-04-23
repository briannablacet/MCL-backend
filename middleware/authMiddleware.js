const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

// Protect routes by verifying JWT
exports.protect = async (req, res, next) => {
  try {
    // 1. Get token and check if it exists
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1]; // Extract the token from the header
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to get access.',
      });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Decode and verify the token

    // 3. Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // 4. Attach the user to the request object for access in next middleware or route
    req.user = currentUser;
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    logger.error(`Authentication error: ${err.message}`);
    res.status(401).json({
      status: 'fail',
      message: 'Authentication failed. Please log in again.',
    });
  }
};

// Restrict access to certain roles (admin, etc.)
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action',
      });
    }
    next(); // If the user has the required role, proceed
  };
};
