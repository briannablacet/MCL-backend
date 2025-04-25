const authService = require('../services/authService');

// Register a new user
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    
    const result = await authService.registerUser({ name, email, password });
    
    res.status(201).json({
      status: result.status,
      message: result.message,
      data: {
        user: result.user
      }
    });
  } catch (err) {
    next(err);
  }
};

// Login with email/password
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const result = await authService.loginUser(email, password);
    
    res.status(200).json({
      status: result.status,
      token: result.token,
      data: {
        user: result.user
      }
    });
  } catch (err) {
    next(err);
  }
};

// Get the current authenticated user
exports.getMe = async (req, res, next) => {
  try {
    const result = await authService.getMe(req.user.id);
    
    res.status(200).json({
      status: result.status,
      data: {
        user: result.user
      }
    });
  } catch (err) {
    next(err);
  }
};