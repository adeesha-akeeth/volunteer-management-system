const Opportunity = require('../models/Opportunity');
const Fundraiser = require('../models/Fundraiser');
const Donation = require('../models/Donation');
const Feedback = require('../models/Feedback');
const Vote = require('../models/Vote');

// Create a new opportunity
const createOpportunity = async (req, res) => {
  try {
    const {
      title, description, organization, location,
      startDate, endDate, spotsAvailable, category,
      responsibleName, responsibleEmail, responsiblePhone
    } = req.body;

    const bannerImage = req.file ? req.file.path : '';

    const opportunity = await Opportunity.create({
      title,
      description,
      organization: organization || '',
      location,
      startDate,
      endDate,
      spotsAvailable,
      category,
      responsibleName: responsibleName || '',
      responsibleEmail: responsibleEmail || '',
      responsiblePhone: responsiblePhone || '',
      bannerImage,
      createdBy: req.user.id
    });

    res.status(201).json({ message: 'Opportunity created successfully', opportunity });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Attach fundraiser info, ratings, and votes to a list of opportunity objects
const attachExtras = async (opportunities, userId = null) => {
  const ids = opportunities.map(o => o._id || o.id);

  // Star ratings
  const ratings = await Feedback.aggregate([
    { $match: { opportunity: { $in: ids } } },
    { $group: { _id: '$opportunity', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const ratingsMap = {};
  ratings.forEach(r => { ratingsMap[r._id.toString()] = { avg: parseFloat(r.avg.toFixed(1)), count: r.count }; });

  // Fundraisers with confirmed totals
  const fundraisers = await Fundraiser.find({ opportunity: { $in: ids } });
  const fIds = fundraisers.map(f => f._id);
  const totals = await Donation.aggregate([
    { $match: { fundraiser: { $in: fIds }, status: 'confirmed' } },
    { $group: { _id: '$fundraiser', collected: { $sum: '$amount' } } }
  ]);
  const totalsMap = {};
  totals.forEach(t => { totalsMap[t._id.toString()] = t.collected; });

  const fundraisersMap = {};
  fundraisers.forEach(f => {
    const oppId = f.opportunity.toString();
    if (!fundraisersMap[oppId]) fundraisersMap[oppId] = [];
    fundraisersMap[oppId].push({
      _id: f._id,
      name: f.name,
      targetAmount: f.targetAmount,
      status: f.status,
      collectedAmount: totalsMap[f._id.toString()] || 0,
      completedAt: f.completedAt,
      createdAt: f.createdAt
    });
  });

  // Votes (likes/dislikes)
  const voteAgg = await Vote.aggregate([
    { $match: { targetId: { $in: ids }, targetType: 'opportunity' } },
    { $group: { _id: { targetId: '$targetId', vote: '$vote' }, count: { $sum: 1 } } }
  ]);
  const votesMap = {};
  voteAgg.forEach(v => {
    const id = v._id.targetId.toString();
    if (!votesMap[id]) votesMap[id] = { likes: 0, dislikes: 0 };
    votesMap[id][v._id.vote === 'like' ? 'likes' : 'dislikes'] = v.count;
  });

  let userVotesMap = {};
  if (userId) {
    const userVotes = await Vote.find({ user: userId, targetId: { $in: ids }, targetType: 'opportunity' });
    userVotes.forEach(v => { userVotesMap[v.targetId.toString()] = v.vote; });
  }

  return opportunities.map(opp => {
    const obj = opp.toObject ? opp.toObject() : opp;
    const oppId = obj._id.toString();
    const ratingData = ratingsMap[oppId];
    const voteData = votesMap[oppId] || { likes: 0, dislikes: 0 };
    return {
      ...obj,
      averageRating: ratingData?.avg || null,
      reviewCount: ratingData?.count || 0,
      fundraisers: fundraisersMap[oppId] || [],
      likes: voteData.likes,
      dislikes: voteData.dislikes,
      userVote: userVotesMap[oppId] || null
    };
  });
};

// Get all opportunities
const getOpportunities = async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    let filter = {};
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (category) filter.category = category;

    // For latest (default) sort by DB; for others we sort after attachExtras
    const dbSort = (sort === 'popular' || sort === 'toprated') ? { createdAt: -1 } : { createdAt: -1 };

    const opportunities = await Opportunity.find(filter)
      .populate('createdBy', 'name email _id')
      .sort(dbSort);

    const userId = req.user?.id || null;
    let result = await attachExtras(opportunities, userId);

    if (sort === 'popular') {
      result = result.sort((a, b) => (b.likes - b.dislikes) - (a.likes - a.dislikes));
    } else if (sort === 'toprated') {
      result = result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single opportunity by ID
const getOpportunityById = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id)
      .populate('createdBy', 'name email _id');

    if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' });

    const userId = req.user?.id || null;
    const [result] = await attachExtras([opportunity], userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update an opportunity (creator only)
const updateOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' });
    if (opportunity.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const {
      title, description, organization, location,
      startDate, endDate, spotsAvailable, category,
      responsibleName, responsibleEmail, responsiblePhone
    } = req.body;

    const updatedData = {
      title, description, organization, location,
      startDate, endDate, spotsAvailable, category,
      responsibleName, responsibleEmail, responsiblePhone
    };
    if (req.file) updatedData.bannerImage = req.file.path;

    const updatedOpportunity = await Opportunity.findByIdAndUpdate(
      req.params.id, updatedData, { new: true }
    );

    res.status(200).json({ message: 'Opportunity updated successfully', opportunity: updatedOpportunity });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyOpportunities = async (req, res) => {
  try {
    const opportunities = await Opportunity.find({ createdBy: req.user.id })
      .populate('createdBy', 'name email _id')
      .sort({ createdAt: -1 });
    const result = await attachExtras(opportunities, req.user.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' });
    if (opportunity.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    await Opportunity.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Opportunity deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  getMyOpportunities,
  updateOpportunity,
  deleteOpportunity
};
