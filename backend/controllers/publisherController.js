const mongoose = require('mongoose');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const PublisherRating = require('../models/PublisherRating');
const PublisherReview = require('../models/PublisherReview');
const Follow = require('../models/Follow');
const Vote = require('../models/Vote');
const Notification = require('../models/Notification');

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

    const isNew = !(await PublisherRating.findOne({ rater: req.user.id, publisher: id }));

    await PublisherRating.findOneAndUpdate(
      { rater: req.user.id, publisher: id },
      { rating },
      { upsert: true, new: true }
    );

    const [avgData] = await PublisherRating.aggregate([
      { $match: { publisher: new ObjectId(id) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    // Notify publisher when someone rates them
    if (isNew) {
      try {
        await Notification.create({
          recipient: id,
          type: 'publisher_rating',
          message: `Someone rated your publisher profile (${rating} star${rating > 1 ? 's' : ''})`,
          relatedId: id,
          relatedType: 'publisher'
        });
      } catch {}
    }

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
    const allReviews = await PublisherReview.find({ publisher: req.params.id })
      .populate('author', 'name profileImage')
      .sort({ createdAt: 1 });

    const reviewIds = allReviews.map(r => r._id);

    // Aggregate vote counts
    const votes = await Vote.aggregate([
      { $match: { targetId: { $in: reviewIds }, targetType: 'publisher_review' } },
      { $group: { _id: { targetId: '$targetId', vote: '$vote' }, count: { $sum: 1 } } }
    ]);
    const votesMap = {};
    votes.forEach(v => {
      const id = v._id.targetId.toString();
      if (!votesMap[id]) votesMap[id] = { likes: 0, dislikes: 0 };
      votesMap[id][v._id.vote === 'like' ? 'likes' : 'dislikes'] = v.count;
    });

    // User's own votes
    let userVoteMap = {};
    if (req.user) {
      const userVotes = await Vote.find({ user: req.user.id, targetId: { $in: reviewIds }, targetType: 'publisher_review' });
      userVotes.forEach(v => { userVoteMap[v.targetId.toString()] = v.vote; });
    }

    const enriched = allReviews.map(r => {
      const obj = r.toObject();
      const id = obj._id.toString();
      return { ...obj, likes: votesMap[id]?.likes || 0, dislikes: votesMap[id]?.dislikes || 0, userVote: userVoteMap[id] || null, replies: [] };
    });

    const topLevel = enriched.filter(r => !r.parentReview);
    const replies = enriched.filter(r => r.parentReview);
    const tree = topLevel.map(r => ({
      ...r,
      replies: replies.filter(rep => rep.parentReview.toString() === r._id.toString())
    }));

    res.json(tree);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/publisher/:id/reviews
const addPublisherReview = async (req, res) => {
  try {
    const { text, parentReviewId } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Review text required' });
    if (req.user.id === req.params.id) return res.status(400).json({ message: 'Cannot review yourself' });

    const photo = req.file ? req.file.path : '';
    const review = await PublisherReview.create({
      publisher: req.params.id,
      author: req.user.id,
      text: text.trim(),
      photo,
      parentReview: parentReviewId || null
    });
    const populated = await PublisherReview.findById(review._id).populate('author', 'name profileImage');

    // Notify publisher of new review/reply
    try {
      if (parentReviewId) {
        // Reply to a review — notify the parent review author
        const parent = await PublisherReview.findById(parentReviewId).select('author publisher');
        if (parent && parent.author.toString() !== req.user.id) {
          await Notification.create({
            recipient: parent.author,
            type: 'publisher_review',
            message: `Someone replied to your comment on a publisher profile`,
            relatedId: req.params.id,
            relatedType: 'publisher'
          });
        }
        // Also notify publisher if different
        if (req.params.id !== req.user.id) {
          await Notification.create({
            recipient: req.params.id,
            type: 'publisher_review',
            message: `Someone replied to a comment on your profile`,
            relatedId: req.params.id,
            relatedType: 'publisher'
          });
        }
      } else {
        // Top-level review — notify publisher
        if (req.params.id !== req.user.id) {
          await Notification.create({
            recipient: req.params.id,
            type: 'publisher_review',
            message: `Someone left a comment on your publisher profile`,
            relatedId: req.params.id,
            relatedType: 'publisher'
          });
        }
      }
    } catch {}

    res.status(201).json({ ...populated.toObject(), likes: 0, dislikes: 0, userVote: null, replies: [] });
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

    // Delete replies too
    await PublisherReview.deleteMany({ parentReview: req.params.reviewId });
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
