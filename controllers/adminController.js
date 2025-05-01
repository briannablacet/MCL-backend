const adminService = require('../services/adminService');
const AppError = require('../utils/appError');

// Character Management
exports.manageCharacter = async (req, res, next) => {
  try {
    const character = await adminService.createOrUpdateCharacter(req.body);
    res.status(200).json({
      status: 'success',
      data: {
        character
      }
    });
  } catch (error) {
    next(error);
  }
};

// Preset Management
exports.managePreset = async (req, res, next) => {
  try {
    const preset = await adminService.createOrUpdatePreset(req.body);
    res.status(200).json({
      status: 'success',
      data: {
        preset
      }
    });
  } catch (error) {
    next(error);
  }
};

// Vertical Market Management
exports.manageVertical = async (req, res, next) => {
  try {
    const vertical = await adminService.createOrUpdateVertical(req.body);
    res.status(200).json({
      status: 'success',
      data: {
        vertical
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all characters
exports.getAllCharacters = async (req, res, next) => {
  try {
    const characters = await adminService.getAllCharacters();
    res.status(200).json({
      status: 'success',
      results: characters.length,
      data: {
        characters
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all presets
exports.getAllPresets = async (req, res, next) => {
  try {
    const presets = await adminService.getAllPresets();
    res.status(200).json({
      status: 'success',
      results: presets.length,
      data: {
        presets
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all verticals
exports.getAllVerticals = async (req, res, next) => {
  try {
    const verticals = await adminService.getAllVerticals();
    res.status(200).json({
      status: 'success',
      results: verticals.length,
      data: {
        verticals
      }
    });
  } catch (error) {
    next(error);
  }
};