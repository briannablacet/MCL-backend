const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const role  = require('../middleware/role');
const authMiddleware = require('../middleware/authMiddleware');

// Character Management
router.route('/characters')
  .post(authMiddleware.protect, role('admin'),adminController.manageCharacter)
  .get(authMiddleware.protect, role('admin'), adminController.getAllCharacters)

// Preset Management
router.route('/presets')
  .post(authMiddleware.protect, role('admin'),adminController.managePreset)
  .get(authMiddleware.protect, role('admin'),adminController.getAllPresets);

// Vertical Market Management
router.route('/verticals')
  .post(authMiddleware.protect, role('admin'), adminController.manageVertical)
  .get(authMiddleware.protect, role('admin'), adminController.getAllVerticals);

module.exports = router;