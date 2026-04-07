const Fundraiser = require('../models/Fundraiser');
const Opportunity = require('../models/Opportunity');
const Donation = require('../models/Donation');

// Create a fundraiser for an opportunity (creator only)
const createFundraiser = async (req, res) => {
  try {
    const { opportunityId, name, targetAmount } = req.body;

    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) return res.status(404).json({ message: 'Opportunity not found' });
    if (opportunity.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the opportunity creator can add fundraisers' });
    }

    const fundraiser = await Fundraiser.create({
      opportunity: opportunityId,
      name,
      targetAmount,
      createdBy: req.user.id
    });

    res.status(201).json({ message: 'Fundraiser created successfully', fundraiser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all fundraisers for an opportunity (public), with confirmed totals
const getFundraisersForOpportunity = async (req, res) => {
  try {
    const fundraisers = await Fundraiser.find({ opportunity: req.params.opportunityId })
      .sort({ createdAt: -1 });

    const ids = fundraisers.map(f => f._id);
    const totals = await Donation.aggregate([
      { $match: { fundraiser: { $in: ids }, status: 'confirmed' } },
      { $group: { _id: '$fundraiser', collected: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalsMap = {};
    totals.forEach(t => { totalsMap[t._id.toString()] = { collected: t.collected, count: t.count }; });

    const result = fundraisers.map(f => ({
      ...f.toObject(),
      collectedAmount: totalsMap[f._id.toString()]?.collected || 0,
      donorCount: totalsMap[f._id.toString()]?.count || 0
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all active (and completed) fundraisers for the discovery list, with search
const getAllFundraisers = async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };

    const fundraisers = await Fundraiser.find(filter)
      .populate('opportunity', 'title organization location bannerImage category')
      .populate('createdBy', 'name')
      .sort({ status: 1, createdAt: -1 }); // active first

    const ids = fundraisers.map(f => f._id);
    const totals = await Donation.aggregate([
      { $match: { fundraiser: { $in: ids }, status: 'confirmed' } },
      { $group: { _id: '$fundraiser', collected: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const totalsMap = {};
    totals.forEach(t => { totalsMap[t._id.toString()] = { collected: t.collected, count: t.count }; });

    const result = fundraisers.map(f => ({
      ...f.toObject(),
      collectedAmount: totalsMap[f._id.toString()]?.collected || 0,
      donorCount: totalsMap[f._id.toString()]?.count || 0
    }));

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark a fundraiser as completed (creator only)
const completeFundraiser = async (req, res) => {
  try {
    const fundraiser = await Fundraiser.findById(req.params.id).populate('opportunity');
    if (!fundraiser) return res.status(404).json({ message: 'Fundraiser not found' });
    if (fundraiser.opportunity.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    fundraiser.status = 'completed';
    fundraiser.completedAt = new Date();
    await fundraiser.save();

    res.status(200).json({ message: 'Fundraiser marked as completed', fundraiser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get ranked donors for a fundraiser (confirmed donations, sorted by amount desc)
const getDonorsForFundraiser = async (req, res) => {
  try {
    const fundraiser = await Fundraiser.findById(req.params.id);
    if (!fundraiser) return res.status(404).json({ message: 'Fundraiser not found' });

    const donations = await Donation.find({ fundraiser: req.params.id, status: 'confirmed' })
      .populate('donor', 'name')
      .sort({ amount: -1 });

    const donors = donations.map((d, i) => ({
      rank: i + 1,
      name: d.donorName || d.donor?.name || 'Anonymous',
      amount: d.amount,
      message: d.message,
      date: d.createdAt
    }));

    res.status(200).json({ fundraiser, donors });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update fundraiser name/target (creator only)
const updateFundraiser = async (req, res) => {
  try {
    const fundraiser = await Fundraiser.findById(req.params.id).populate('opportunity');
    if (!fundraiser) return res.status(404).json({ message: 'Fundraiser not found' });
    if (fundraiser.opportunity.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (fundraiser.status === 'completed') {
      return res.status(400).json({ message: 'Cannot edit a completed fundraiser' });
    }

    const { name, targetAmount } = req.body;
    if (name) fundraiser.name = name;
    if (targetAmount) fundraiser.targetAmount = targetAmount;
    await fundraiser.save();

    res.status(200).json({ message: 'Fundraiser updated', fundraiser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createFundraiser,
  getFundraisersForOpportunity,
  getAllFundraisers,
  completeFundraiser,
  getDonorsForFundraiser,
  updateFundraiser
};
