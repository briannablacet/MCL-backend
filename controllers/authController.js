const { default: axios } = require('axios');
const authService = require('../services/authService');
const User = require('../models/User');

const headers = {
  Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
  'Content-Type': 'application/json'
}

// Register a new user
exports.register = async (req, res, next) => {
  try {
    const { name, email, password,role } = req.body;
    
    const result = await authService.register({ name, email, password,role });

    const firstName = name.split(' ')[0];
    const lastName = name.split(' ').slice(1).join(' ') || '';

    const inputs = [{
      "idProperty": "email",
      "id": email,
      "properties": {
        "email": email,
        "lastname": lastName,
        "firstname": firstName,
        "db_user_id": result.user._id.toString(),
        "stripe_status": "trailing",
      }
    }];

    const createUserUrl = `https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert`;
    const contacts = await axios.post(createUserUrl,{ inputs },{ headers });

    const first_subscription_date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const properties = {
        "dealname": 'Subscription',
        "pipeline": "default",
        "dealstage": "appointmentscheduled",
        "first_subscription_date": first_subscription_date,
        "stripe_status": "trailing"
    };

    const createDealUrl = `https://api.hubapi.com/crm/v3/objects/deals`;

    const SimplePublicObjectInputForCreate = { associations: [
        {"types":[{"associationCategory":"HUBSPOT_DEFINED","associationTypeId":3}],"to":{"id":contacts?.data?.results[0]?.id}}
    ], properties };

    const dealResponse = await axios.post(createDealUrl, SimplePublicObjectInputForCreate, { headers });

    await User.updateOne(
      { _id: result.user._id },
      { $set: { 
        'hsInfo.hsContactId': contacts?.data?.results[0]?.id,
        'hsInfo.hsDealId': dealResponse?.data?.id,
       } }
    );
    
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