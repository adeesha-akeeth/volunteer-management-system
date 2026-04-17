const Vote = require('../models/Vote');
const Comment = require('../models/Comment');
const Opportunity = require('../models/Opportunity');
const PublisherReview = require('../models/PublisherReview');
const PublisherRating = require('../models/PublisherRating');
const Notification = require('../models/Notification');

const toggleVote = async (req, res) => {
  try {
    const { targetId, targetType, vote } = req.body;
    if (!['opportunity', 'comment', 'publisher_review'].includes(targetType))
      return res.status(400).json({ message: 'Invalid targetType' });
    if (!['like', 'dislike'].includes(vote))
      return res.status(400).json({ message: 'Invalid vote' });

    const existing = await Vote.findOne({ user: req.user.id, targetId, targetType });
    const wasNew = !existing;
    const wasSwitched = existing && existing.vote !== vote;

    if (existing) {
      if (existing.vote === vote) {
        await Vote.deleteOne({ _id: existing._id });
      } else {
        existing.vote = vote;
        await existing.save();
      }
    } else {
      await Vote.create({ user: req.user.id, targetId, targetType, vote });
    }

    // Send notifications only on new vote or vote switch
    if (wasNew || wasSwitched) {
      if (targetType === 'opportunity') {
        try {
          const opp = await Opportunity.findById(targetId).select('createdBy title');
          if (opp && opp.createdBy.toString() !== req.user.id) {
            await Notification.create({
              recipient: opp.createdBy,
              type: 'opportunity_vote',
              message: `Someone ${vote}d your opportunity "${opp.title}"`,
              relatedId: targetId,
              relatedType: 'opportunity'
            });
          }
        } catch {}
      }

      if (targetType === 'comment') {
        try {
          const comment = await Comment.findById(targetId).select('author opportunity');
          if (comment && comment.author.toString() !== req.user.id) {
            const opp = await Opportunity.findById(comment.opportunity).select('title');
            await Notification.create({
              recipient: comment.author,
              type: 'comment_like',
              message: `Someone ${vote}d your comment on "${opp?.title || 'an opportunity'}"`,
              relatedId: comment.opportunity,
              relatedType: 'opportunity'
            });
          }
        } catch {}
      }

      if (targetType === 'publisher_review') {
        try {
          const review = await PublisherReview.findById(targetId).select('author publisher');
          if (review) {
            // Notify review author
            if (review.author.toString() !== req.user.id) {
              await Notification.create({
                recipient: review.author,
                type: 'publisher_vote',
                message: `Someone ${vote}d your review on a publisher profile`,
                relatedId: review.publisher,
                relatedType: 'publisher'
              });
            }
            // Notify publisher (if different from reviewer and voter)
            if (
              review.publisher.toString() !== req.user.id &&
              review.publisher.toString() !== review.author.toString()
            ) {
              await Notification.create({
                recipient: review.publisher,
                type: 'publisher_vote',
                message: `Someone ${vote}d a review on your profile`,
                relatedId: review.publisher,
                relatedType: 'publisher'
              });
            }
          }
        } catch {}
      }
    }

    const [likes, dislikes] = await Promise.all([
      Vote.countDocuments({ targetId, targetType, vote: 'like' }),
      Vote.countDocuments({ targetId, targetType, vote: 'dislike' })
    ]);
    const userVoteDoc = await Vote.findOne({ user: req.user.id, targetId, targetType });

    res.json({ likes, dislikes, userVote: userVoteDoc?.vote || null });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyActivity = async (req, res) => {
  try {
    const [
      opportunityVotes,
      commentVotes,
      publisherReviewVotes,
      comments,
      publisherReviews,
      publisherRatingsMade
    ] = await Promise.all([
      Vote.find({ user: req.user.id, targetType: 'opportunity' })
        .populate({ path: 'targetId', model: 'Opportunity', select: 'title _id' })
        .sort({ createdAt: -1 }),
      Vote.find({ user: req.user.id, targetType: 'comment' })
        .populate({
          path: 'targetId', model: 'Comment', select: 'text opportunity',
          populate: { path: 'opportunity', select: 'title _id' }
        })
        .sort({ createdAt: -1 }),
      Vote.find({ user: req.user.id, targetType: 'publisher_review' })
        .populate({
          path: 'targetId', model: 'PublisherReview', select: 'text publisher',
          populate: { path: 'publisher', select: 'name _id' }
        })
        .sort({ createdAt: -1 }),
      Comment.find({ author: req.user.id })
        .populate('opportunity', 'title _id')
        .populate({
          path: 'parentComment',
          select: 'text author',
          populate: { path: 'author', select: 'name' }
        })
        .sort({ createdAt: -1 }),
      PublisherReview.find({ author: req.user.id })
        .populate('publisher', 'name _id')
        .populate({
          path: 'parentReview',
          select: 'text author',
          populate: { path: 'author', select: 'name' }
        })
        .sort({ createdAt: -1 }),
      PublisherRating.find({ rater: req.user.id })
        .populate('publisher', 'name _id')
        .sort({ createdAt: -1 })
    ]);

    res.json({ opportunityVotes, commentVotes, publisherReviewVotes, comments, publisherReviews, publisherRatingsMade });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { toggleVote, getMyActivity };
