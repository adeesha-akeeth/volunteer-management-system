const Follow = require('../models/Follow');
const Opportunity = require('../models/Opportunity');
const PublisherRating = require('../models/PublisherRating');
const User = require('../models/User');
const Vote = require('../models/Vote');
const mongoose = require('mongoose');

const getPublisherStats = async (pubId) => {
  const [oppCount, activeOppCount, avgRating] = await Promise.all([
    Opportunity.countDocuments({ createdBy: pubId }),
    Opportunity.countDocuments({ createdBy: pubId, status: 'open' }),
    PublisherRating.aggregate([
      { $match: { publisher: new mongoose.Types.ObjectId(pubId) } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ])
  ]);
  return {
    opportunityCount: oppCount,
    activeOpportunityCount: activeOppCount,
    averageRating: avgRating[0] ? parseFloat(avgRating[0].avg.toFixed(1)) : null
  };
};

// POST /api/follows/:publisherId — toggle follow/unfollow
const toggleFollow = async (req, res) => {
  try {
    const { publisherId } = req.params;
    if (publisherId === req.user.id) return res.status(400).json({ message: 'Cannot follow yourself' });

    const existing = await Follow.findOne({ follower: req.user.id, following: publisherId });
    if (existing) {
      await Follow.deleteOne({ _id: existing._id });
      res.json({ following: false });
    } else {
      await Follow.create({ follower: req.user.id, following: publisherId });
      res.json({ following: true });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/follows/mine — my followed publishers
const getMyFollowing = async (req, res) => {
  try {
    const follows = await Follow.find({ follower: req.user.id })
      .populate('following', 'name profileImage')
      .sort({ createdAt: -1 });

    const result = await Promise.all(follows.map(async (f) => {
      const pub = f.following;
      if (!pub) return null;
      const stats = await getPublisherStats(pub._id);
      return {
        _id: pub._id,
        name: pub.name,
        profileImage: pub.profileImage,
        followedAt: f.createdAt,
        isFollowing: true,
        ...stats
      };
    }));

    res.json(result.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/follows/feed — opportunities from followed publishers
const getFollowFeed = async (req, res) => {
  try {
    const myFollowing = await Follow.find({ follower: req.user.id }).distinct('following');
    if (myFollowing.length === 0) return res.json([]);

    const opportunities = await Opportunity.find({ createdBy: { $in: myFollowing } })
      .populate('createdBy', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(30);

    const oppIds = opportunities.map(o => o._id);

    const [likeAgg, dislikeAgg, myVotes] = await Promise.all([
      Vote.aggregate([
        { $match: { targetType: 'opportunity', targetId: { $in: oppIds }, vote: 'like' } },
        { $group: { _id: '$targetId', count: { $sum: 1 } } }
      ]),
      Vote.aggregate([
        { $match: { targetType: 'opportunity', targetId: { $in: oppIds }, vote: 'dislike' } },
        { $group: { _id: '$targetId', count: { $sum: 1 } } }
      ]),
      Vote.find({ user: req.user.id, targetType: 'opportunity', targetId: { $in: oppIds } })
    ]);

    const likeMap = {};
    likeAgg.forEach(l => { likeMap[l._id.toString()] = l.count; });
    const dislikeMap = {};
    dislikeAgg.forEach(d => { dislikeMap[d._id.toString()] = d.count; });
    const voteMap = {};
    myVotes.forEach(v => { voteMap[v.targetId.toString()] = v.vote; });

    const result = opportunities.map(opp => ({
      ...opp.toObject(),
      likes: likeMap[opp._id.toString()] || 0,
      dislikes: dislikeMap[opp._id.toString()] || 0,
      userVote: voteMap[opp._id.toString()] || null
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/follows/publishers — find all publishers (anyone who posted an opportunity)
const findPublishers = async (req, res) => {
  try {
    const { search } = req.query;

    const creatorIds = await Opportunity.distinct('createdBy');

    let userFilter = { _id: { $in: creatorIds, $ne: req.user.id } };
    if (search) userFilter.name = { $regex: search, $options: 'i' };

    const publishers = await User.find(userFilter).select('name profileImage');

    const myFollowing = await Follow.find({ follower: req.user.id }).distinct('following');
    const myFollowingSet = new Set(myFollowing.map(id => id.toString()));

    const result = await Promise.all(publishers.map(async (pub) => {
      const stats = await getPublisherStats(pub._id);
      const followerCount = await Follow.countDocuments({ following: pub._id });
      return {
        _id: pub._id,
        name: pub.name,
        profileImage: pub.profileImage,
        isFollowing: myFollowingSet.has(pub._id.toString()),
        followerCount,
        ...stats
      };
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { toggleFollow, getMyFollowing, findPublishers, getFollowFeed };
