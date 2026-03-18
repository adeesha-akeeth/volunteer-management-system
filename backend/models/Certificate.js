const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  volunteer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  opportunity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity',
    required: true
  },
  issuedBy: {
    type: String,
    required: true
  },
  orgLogo: {
    type: String,
    default: ''
  },
  hoursCompleted: {
    type: Number,
    required: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  certificateFile: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['issued', 'revoked'],
    default: 'issued'
  }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);