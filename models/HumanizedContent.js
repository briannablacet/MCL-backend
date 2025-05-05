const mongoose = require('mongoose');

const humanizedContentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalContent: {
    type: String,
    required: true
  },
  humanizedContent: {
    type: String,
    required: true
  },
  parameters: {
    clicheRemoval: Boolean,
    addContractions: Boolean,
    addPersonality: Boolean,
    formality: String,
    styleGuide: String
  },
  changes: [{
    original: String,
    modified: String,
    reason: String
  }],
  scores: {
    humanity: Number,
    readability: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('HumanizedContent', humanizedContentSchema);