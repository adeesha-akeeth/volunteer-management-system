const mongoose = require('mongoose');

const userFeedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'replied'], default: 'pending' },
  adminReply: { type: String, default: '' },
  repliedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('UserFeedback', userFeedbackSchema);
