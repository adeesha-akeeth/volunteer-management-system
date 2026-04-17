const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetType: { type: String, enum: ['opportunity', 'comment', 'publisher_review'], required: true },
  vote: { type: String, enum: ['like', 'dislike'], required: true }
}, { timestamps: true });

voteSchema.index({ user: 1, targetId: 1, targetType: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
