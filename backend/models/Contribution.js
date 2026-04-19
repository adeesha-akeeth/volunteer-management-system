const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hours: { type: Number, required: true, min: 0.5 },
  description: { type: String, default: '' },
  proofImage: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('Contribution', contributionSchema);
