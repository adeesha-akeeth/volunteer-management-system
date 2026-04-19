const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  image: { type: String, default: '' },
}, { timestamps: true });

const userFeedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  image: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'replied'], default: 'pending' },
  adminReply: { type: String, default: '' },
  repliedAt: { type: Date },
  replies: [replySchema]
}, { timestamps: true });

module.exports = mongoose.model('UserFeedback', userFeedbackSchema);
