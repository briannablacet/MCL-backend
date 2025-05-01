const mongoose = require('mongoose');

const characterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  features: [{
    type: String
  }],
  presetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Preset'
  },
  icon: String, // For UI representation
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

module.exports = mongoose.model('Character', characterSchema);