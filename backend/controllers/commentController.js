const Comment = require('../models/Comment');
const Vote = require('../models/Vote');

const getComments = async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const allComments = await Comment.find({ opportunity: opportunityId })
      .populate('author', 'name')
      .sort({ createdAt: 1 });

    const commentIds = allComments.map(c => c._id);

    // Aggregate vote counts
    const votes = await Vote.aggregate([
      { $match: { targetId: { $in: commentIds }, targetType: 'comment' } },
      { $group: { _id: { targetId: '$targetId', vote: '$vote' }, count: { $sum: 1 } } }
    ]);
    const votesMap = {};
    votes.forEach(v => {
      const id = v._id.targetId.toString();
      if (!votesMap[id]) votesMap[id] = { likes: 0, dislikes: 0 };
      votesMap[id][v._id.vote === 'like' ? 'likes' : 'dislikes'] = v.count;
    });

    let userVoteMap = {};
    if (req.user) {
      const userVotes = await Vote.find({ user: req.user.id, targetId: { $in: commentIds }, targetType: 'comment' });
      userVotes.forEach(v => { userVoteMap[v.targetId.toString()] = v.vote; });
    }

    const enriched = allComments.map(c => {
      const obj = c.toObject();
      const id = obj._id.toString();
      return { ...obj, likes: votesMap[id]?.likes || 0, dislikes: votesMap[id]?.dislikes || 0, userVote: userVoteMap[id] || null, replies: [] };
    });

    // Build tree
    const topLevel = enriched.filter(c => !c.parentComment);
    const replies = enriched.filter(c => c.parentComment);
    const tree = topLevel.map(c => ({
      ...c,
      replies: replies.filter(r => r.parentComment.toString() === c._id.toString())
    }));

    res.json(tree);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { opportunityId, text, parentCommentId, rating } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text required' });
    const photo = req.file ? req.file.path : '';
    const comment = await Comment.create({
      opportunity: opportunityId,
      author: req.user.id,
      text: text.trim(),
      parentComment: parentCommentId || null,
      photo,
      rating: rating ? Number(rating) : null
    });
    const populated = await Comment.findById(comment._id).populate('author', 'name');
    res.status(201).json({ ...populated.toObject(), likes: 0, dislikes: 0, userVote: null, replies: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const editComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const { text, rating } = req.body;
    if (text) { comment.text = text.trim(); }
    if (rating !== undefined) comment.rating = rating ? Number(rating) : null;
    if (req.file) comment.photo = req.file.path;
    comment.isUpdated = true;
    await comment.save();

    const populated = await Comment.findById(comment._id).populate('author', 'name');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    await Comment.deleteMany({ parentComment: req.params.id });
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getComments, addComment, editComment, deleteComment };
