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
      const { name, email, password } = userData;

      // Validate input
      if (!email || !password || !name) {
        throw new AppError('Please provide name, email, and password', 400);
      }

      // Check for existing user
      if (await this.User.exists({ email })) {
        throw new AppError('Email already in use', 400);
      }

      // Create user
      const user = await this.User.create({ name, email, password });

      return {
        status: 'success',
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

      return {
        status: 'success',
        token,
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
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
  }
}

module.exports = new AuthService(User);