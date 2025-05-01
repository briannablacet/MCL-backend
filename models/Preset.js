const mongoose = require('mongoose');

const presetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  settings: {
    type: Object,
    required: true
  },
  characterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character'
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  version: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Preset', presetSchema);