const authService = require('../services/authService');

// Register a new user
exports.register = async (req, res, next) => {
  try {
    const { name, email, password,role } = req.body;
    
    const result = await authService.register({ name, email, password,role });
    
    res.status(201).json({
      status: result.status,
      token: result.token,
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
    
    const result = await authService.login(email, password);
    
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

// Get all users (admin only)
exports.getAllUsers = async (req, res, next) => {
  try {

    
    const result = await authService.getAllUsers();
    
    res.status(200).json({
      status: result.status,
      data: {
        users: result.users
      }
    });
  } catch (err) {
    next(err);
  }
};

// Update user profile
exports.updateUserProfile = async (req, res, next) => {
  try {
    const result = await authService.updateUserProfile();
    
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

// Refresh token endpoint
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    res.status(200).json({
      status: result.status,
      token: result.token,
      refreshToken: result.refreshToken,
      data: { user: result.user }
    });
  } catch (err) {
    next(err);
  }
};

// Reset password endpoint
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    const result = await authService.resetPassword(email, newPassword);
    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
      data: { user: result.user }
    });
  } catch (err) {
    next(err);
  }
};