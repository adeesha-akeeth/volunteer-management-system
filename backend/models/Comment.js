const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  photo: { type: String, default: '' },
  rating: { type: Number, min: 1, max: 5, default: null },
  isUpdated: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
