const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalContent: {
    type: String,
    required: true
  },
  processedContent: {
    type: String
  },
  documentType: {
    type: String,
    enum: ['humanized', 'style-checked', 'repurposed', 'generated'],
    required: true
  },
  metadata: {
    type: Object,
    default: {}
  },
  stats: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
documentSchema.index({ userId: 1, documentType: 1 });

module.exports = mongoose.model('Document', documentSchema);