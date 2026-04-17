const mongoose = require('mongoose');

const fundraiserSchema = new mongoose.Schema({
  opportunity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity',
    required: false
  },
  description: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    required: true
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'stopped'],
    default: 'active'
  },
  completedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Fundraiser', fundraiserSchema);
