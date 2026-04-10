const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  opportunity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity',
    required: true
  },
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  coverLetter: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  photo: {
    type: String,
    default: ''
  },
  applicantName: {
    type: String,
    default: ''
  },
  motivation: {
    type: String,
    default: ''
  },
  expectedHours: {
    type: Number,
    default: null
  },
  hopingToGain: {
    type: String,
    default: ''
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);