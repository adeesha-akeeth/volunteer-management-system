const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  organization: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  spotsAvailable: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['education', 'environment', 'health', 'community', 'animals', 'other'],
    default: 'other'
  },
  responsibleName: {
    type: String,
    default: ''
  },
  responsibleEmail: {
    type: String,
    default: ''
  },
  responsiblePhone: {
    type: String,
    default: ''
  },
  bannerImage: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'completed'],
    default: 'open'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Opportunity', opportunitySchema);
