const mongoose = require('mongoose');
const { Schema } = mongoose;

const SubscriptionSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  stripeCustomerId: {
    type: String,
    required: true
  },

  stripeSubscriptionId: {
    type: String,
    required: true,
    unique: true
  },

  stripePriceId: {
    type: String,
    required: true
  },

  planName: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: [
      'active',
      'past_due',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'unpaid'
    ],
    required: true
  },

  currency: {
    type: String,
    required: true
  },

  currentPeriodStart: {
    type: Date,
    required: true
  },

  currentPeriodEnd: {
    type: Date,
    required: true
  },

  cancelAt: {
    type: Date
  },

  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },

  canceledAt: {
    type: Date
  },

  isActive: {
    type: Boolean,
    default: true
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);