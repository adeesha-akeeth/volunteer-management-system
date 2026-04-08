const mongoose = require('mongoose');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const PublisherRating = require('../models/PublisherRating');
const PublisherReview = require('../models/PublisherReview');
const Follow = require('../models/Follow');

const ObjectId = mongoose.Types.ObjectId;

// GET /api/publisher/:id
const getPublisherProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid publisher ID' });

    const publisher = await User.findById(id).select('-password');
    if (!publisher) return res.status(404).json({ message: 'Publisher not found' });

    const pid = new ObjectId(id);

    const [opportunities, avgRating, followerCount, isFollowing, myRating] = await Promise.all([
      Opportunity.find({ createdBy: id }).sort({ createdAt: -1 }),
      PublisherRating.aggregate([
        { $match: { publisher: pid } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]),
      Follow.countDocuments({ following: id }),
      req.user ? Follow.findOne({ follower: req.user.id, following: id }) : null,
      req.user ? PublisherRating.findOne({ rater: req.user.id, publisher: id }) : null
    ]);

    const ratingData = avgRating[0] || null;

    res.json({
      publisher: {
        ...publisher.toObject(),
        averageRating: ratingData ? parseFloat(ratingData.avg.toFixed(1)) : null,
        ratingCount: ratingData?.count || 0,
        followerCount
      },
      opportunities,
      isFollowing: !!isFollowing,
      myRating: myRating?.rating || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/publisher/:id/rate
const ratePublisher = async (req, res) => {
  try {
    const { rating } = req.body;
    const { id } = req.params;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    if (req.user.id === id) return res.status(400).json({ message: 'Cannot rate yourself' });

    await PublisherRating.findOneAndUpdate(
      { rater: req.user.id, publisher: id },
      { rating },
      { upsert: true, new: true }
    );

    const [avgData] = await PublisherRating.aggregate([
      { $match: { publisher: new ObjectId(id) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    res.json({
      myRating: rating,
      averageRating: avgData ? parseFloat(avgData.avg.toFixed(1)) : null,
      ratingCount: avgData?.count || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/publisher/:id/rate
const deletePublisherRating = async (req, res) => {
  try {
    await PublisherRating.deleteOne({ rater: req.user.id, publisher: req.params.id });

    const [avgData] = await PublisherRating.aggregate([
      { $match: { publisher: new ObjectId(req.params.id) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    res.json({
      myRating: null,
      averageRating: avgData ? parseFloat(avgData.avg.toFixed(1)) : null,
      ratingCount: avgData?.count || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/publisher/:id/reviews
const getPublisherReviews = async (req, res) => {
  try {
    const reviews = await PublisherReview.find({ publisher: req.params.id })
      .populate('author', 'name profileImage')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/publisher/:id/reviews
const addPublisherReview = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Review text required' });
    if (req.user.id === req.params.id) return res.status(400).json({ message: 'Cannot review yourself' });

    const photo = req.file ? req.file.path : '';
    const review = await PublisherReview.create({
      publisher: req.params.id,
      author: req.user.id,
      text: text.trim(),
      photo
    });
    const populated = await PublisherReview.findById(review._id).populate('author', 'name profileImage');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// PUT /api/publisher/reviews/:reviewId
const editPublisherReview = async (req, res) => {
  try {
    const review = await PublisherReview.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.author.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    if (req.body.text) review.text = req.body.text.trim();
    if (req.file) review.photo = req.file.path;
    review.isUpdated = true;
    await review.save();

    const populated = await PublisherReview.findById(review._id).populate('author', 'name profileImage');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE /api/publisher/reviews/:reviewId
const deletePublisherReview = async (req, res) => {
  try {
    const review = await PublisherReview.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.author.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    await PublisherReview.findByIdAndDelete(req.params.reviewId);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getPublisherProfile,
  ratePublisher,
  deletePublisherRating,
  getPublisherReviews,
  addPublisherReview,
  editPublisherReview,
  deletePublisherReview
};
