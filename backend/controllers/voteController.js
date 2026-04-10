const Vote = require('../models/Vote');
const Comment = require('../models/Comment');
const Opportunity = require('../models/Opportunity');
const Notification = require('../models/Notification');

const toggleVote = async (req, res) => {
  try {
    const { targetId, targetType, vote } = req.body;
    if (!['opportunity', 'comment'].includes(targetType)) return res.status(400).json({ message: 'Invalid targetType' });
    if (!['like', 'dislike'].includes(vote)) return res.status(400).json({ message: 'Invalid vote' });

    const existing = await Vote.findOne({ user: req.user.id, targetId, targetType });
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

    // Notify comment author on new like
    const isNewLike = !existing && vote === 'like';
    const isSwitchToLike = existing && existing.vote !== 'like' && vote === 'like';
    if ((isNewLike || isSwitchToLike) && targetType === 'comment') {
      try {
        const comment = await Comment.findById(targetId).select('author opportunity');
        if (comment && comment.author.toString() !== req.user.id) {
          const opp = await Opportunity.findById(comment.opportunity).select('title');
          await Notification.create({
            recipient: comment.author,
            type: 'comment_like',
            message: `Someone liked your comment on "${opp?.title || 'an opportunity'}"`,
            relatedId: comment.opportunity,
            relatedType: 'opportunity'
          });
        }
      } catch {}
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

// Get current user's votes and comments for the "My Activity" page
const getMyActivity = async (req, res) => {
  try {
    const [opportunityVotes, commentVotes, comments] = await Promise.all([
      Vote.find({ user: req.user.id, targetType: 'opportunity' })
        .populate({ path: 'targetId', model: 'Opportunity', select: 'title _id' })
        .sort({ createdAt: -1 }),
      Vote.find({ user: req.user.id, targetType: 'comment' })
        .populate({ path: 'targetId', model: 'Comment', select: 'text opportunity', populate: { path: 'opportunity', select: 'title _id' } })
        .sort({ createdAt: -1 }),
      Comment.find({ author: req.user.id })
        .populate('opportunity', 'title _id')
        .populate({ path: 'parentCommentId', select: 'text author', populate: { path: 'author', select: 'name' } })
        .sort({ createdAt: -1 })
    ]);
    res.json({ opportunityVotes, commentVotes, comments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { toggleVote, getMyActivity };
