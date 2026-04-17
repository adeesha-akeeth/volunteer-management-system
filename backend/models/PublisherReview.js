const mongoose = require('mongoose');

const publisherReviewSchema = new mongoose.Schema({
  publisher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  photo: { type: String, default: '' },
  isUpdated: { type: Boolean, default: false },
  parentReview: { type: mongoose.Schema.Types.ObjectId, ref: 'PublisherReview', default: null }
}, { timestamps: true });

module.exports = mongoose.model('PublisherReview', publisherReviewSchema);
