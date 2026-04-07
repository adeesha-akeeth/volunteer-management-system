const Vote = require('../models/Vote');

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

module.exports = { toggleVote };
