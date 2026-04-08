const mongoose = require('mongoose');

const publisherRatingSchema = new mongoose.Schema({
  rater: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publisher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true }
}, { timestamps: true });

publisherRatingSchema.index({ rater: 1, publisher: 1 }, { unique: true });

module.exports = mongoose.model('PublisherRating', publisherRatingSchema);
