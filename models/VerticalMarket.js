const mongoose = require('mongoose');

const verticalMarketSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  lexicon: [{
    type: String
  }],
  styleGuide: {
    type: String,
    required: true
  },
  complianceNotes: {
    type: String
  },
  features: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
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

module.exports = mongoose.model('VerticalMarket', verticalMarketSchema);