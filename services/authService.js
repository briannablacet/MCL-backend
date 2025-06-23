const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const AppError = require('../utils/appError');

class AuthService {
  constructor(UserModel) {
    this.User = UserModel;
  }

  async register(userData) {
    try {
      const { name, email, password,role } = userData;

      // Validate input
      if (!email || !password || !name) {
        throw new AppError('Please provide name, email, and password', 400);
      }

      // Check for existing user
      if (await this.User.exists({ email })) {
        throw new AppError('Email already in use', 400);
      }

      // Create user
      const user = await this.User.create({ name, email, password, role });

      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);
      user.refreshToken = refreshToken;
      await user.save();

      return {
        status: 'success',
        token,
        refreshToken,
        message: 'User registered successfully',
        user: user.toObject()
      };
    } catch (err) {
      logger.error(`Registration error: ${err.message}`);
      throw err;
    }
  }

  async login(email, password) {
    try {
      if (!email || !password) {
        throw new AppError('Please provide email and password', 400);
      }
      const user = await this.User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password))) {
        throw new AppError('Incorrect email or password', 401);
      }
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);
      user.refreshToken = refreshToken;
      await user.save();
      return {
        status: 'success',
        token,
        refreshToken,
        user: user.toObject({ virtuals: true })
      };
    } catch (err) {
      logger.error(`Login error: ${err.message}`);
      throw err;
    }
  }

  async getCurrentUser(userId) {
    try {
      const user = await this.User.findById(userId).populate('clients');
      if (!user) {
        throw new AppError('User not found', 404);
      }

      return {
        status: 'success',
        user: user.toObject({ virtuals: true })
      };
    } catch (err) {
      logger.error(`Get user error: ${err.message}`);
      throw err;
    }
  }

async getAllUsers() {
    try {
    const users = await this.User.find().select('-password');
    return {
        status: 'success',
        users: users.map(user => user.toObject())
    };
    } catch (err) {
    logger.error(`Get all users error: ${err.message}`);
    throw err;
    }
}

async updateUserInfo(userData){
    try {
        const { id, name, email } = userData;
        if (!id) {
            throw new AppError('User ID is required', 400);
        }
        const user = await this.User.findByIdAndUpdate(id, { name, email }, { new: true });
        if (!user) {
            throw new AppError('User not found', 404);
        }
        return {
            status: 'success',
            message: 'User updated successfully',
            user: user.toObject()
        };
    } catch (err) {
        logger.error(`Update user error: ${err.message}`);
        throw err;
    }   
}

  generateToken(user) {
    return jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
  }

  async refreshToken(oldRefreshToken) {
    try {
      if (!oldRefreshToken) {
        throw new AppError('Refresh token is required', 400);
      }
      // Verify refresh token
      let decoded;
      try {
        decoded = jwt.verify(
          oldRefreshToken,
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
        );
      } catch (err) {
        throw new AppError('Invalid refresh token', 401);
      }
      // Find user and check stored refresh token
      const user = await this.User.findById(decoded.id);
      if (!user || user.refreshToken !== oldRefreshToken) {
        throw new AppError('Refresh token does not match', 401);
      }
      // Generate new tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);
      user.refreshToken = refreshToken;
      await user.save();
      return {
        status: 'success',
        token,
        refreshToken,
        user: user.toObject({ virtuals: true })
      };
    } catch (err) {
      logger.error(`Refresh token error: ${err.message}`);
      throw err;
    }
  }

  async resetPassword(email, newPassword) {
    try {
      if (!email || !newPassword) {
        throw new AppError('Email and new password are required', 400);
      }
      const user = await this.User.findOne({ email });
      if (!user) {
        throw new AppError('User not found', 404);
      }
      user.password = newPassword;
      await user.save();
      return { user: user.toObject() };
    } catch (err) {
      logger.error(`Reset password error: ${err.message}`);
      throw err;
    }
  }
}

module.exports = new AuthService(User);