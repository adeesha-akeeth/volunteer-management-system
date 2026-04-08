const Vote = require('../models/Vote');
const Comment = require('../models/Comment');
const Opportunity = require('../models/Opportunity');

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
    const [votes, comments] = await Promise.all([
      Vote.find({ user: req.user.id, targetType: 'opportunity' })
        .populate({ path: 'targetId', model: 'Opportunity', select: 'title' })
        .sort({ createdAt: -1 }),
      Comment.find({ author: req.user.id })
        .populate('opportunity', 'title')
        .sort({ createdAt: -1 })
    ]);
    res.json({ votes, comments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { toggleVote, getMyActivity };
