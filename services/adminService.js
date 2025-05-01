const Character = require('../models/Character');
const Preset = require('../models/Preset');
const VerticalMarket = require('../models/VerticalMarket');
const AppError = require('../utils/appError');

class AdminService {
  // Character Management
  async createOrUpdateCharacter(characterData) {
    try {
      if (characterData._id) {
        // Update existing character
        const updatedCharacter = await Character.findByIdAndUpdate(
          characterData._id,
          {
            $set: characterData,
            $inc: { version: 1 }
          },
          { new: true, runValidators: true }
        );
        return updatedCharacter;
      } else {
        // Create new character
        const newCharacter = await Character.create(characterData);
        return newCharacter;
      }
    } catch (error) {
      throw new AppError(`Failed to manage character: ${error.message}`, 400);
    }
  }

  // Preset Management
  async createOrUpdatePreset(presetData) {
    try {
      if (presetData._id) {
        // Update existing preset
        const updatedPreset = await Preset.findByIdAndUpdate(
          presetData._id,
          {
            $set: presetData,
            $inc: { version: 1 }
          },
          { new: true, runValidators: true }
        );
        return updatedPreset;
      } else {
        // Create new preset
        const newPreset = await Preset.create(presetData);
        return newPreset;
      }
    } catch (error) {
      throw new AppError(`Failed to manage preset: ${error.message}`, 400);
    }
  }

  // Vertical Market Management
  async createOrUpdateVertical(verticalData) {
    try {
      if (verticalData._id) {
        // Update existing vertical
        const updatedVertical = await VerticalMarket.findByIdAndUpdate(
          verticalData._id,
          {
            $set: verticalData,
            $inc: { version: 1 }
          },
          { new: true, runValidators: true }
        );
        return updatedVertical;
      } else {
        // Create new vertical
        const newVertical = await VerticalMarket.create(verticalData);
        return newVertical;
      }
    } catch (error) {
      throw new AppError(`Failed to manage vertical market: ${error.message}`, 400);
    }
  }

  // Get all characters with optional filtering
  async getAllCharacters(filter = {}) {
    return await Character.find(filter).sort({ name: 1 });
  }

  // Get all presets with optional filtering
  async getAllPresets(filter = {}) {
    return await Preset.find(filter).populate('characterId').sort({ name: 1 });
  }

  // Get all verticals with optional filtering
  async getAllVerticals(filter = {}) {
    return await VerticalMarket.find(filter).sort({ name: 1 });
  }
}

module.exports = new AdminService();