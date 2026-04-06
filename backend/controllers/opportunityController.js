const Opportunity = require('../models/Opportunity');
const Donation = require('../models/Donation');

// Create a new opportunity (with optional banner image upload)
const createOpportunity = async (req, res) => {
  try {
    const {
      title, description, organization, location,
      startDate, endDate, spotsAvailable, category,
      responsibleName, responsibleEmail, responsiblePhone,
      fundraiserEnabled, fundraiserTarget
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
      fundraiser: {
        enabled: fundraiserEnabled === 'true' || fundraiserEnabled === true,
        targetAmount: fundraiserEnabled === 'true' || fundraiserEnabled === true
          ? (Number(fundraiserTarget) || 0)
          : 0
      },
      createdBy: req.user.id
    });

    res.status(201).json({
      message: 'Opportunity created successfully',
      opportunity
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all opportunities (with optional search by title or category)
const getOpportunities = async (req, res) => {
  try {
    const { search, category } = req.query;

    let filter = {};
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (category) filter.category = category;

    const opportunities = await Opportunity.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Attach confirmed donation totals for opportunities with fundraisers
    const totals = await Donation.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: '$opportunity', collected: { $sum: '$amount' } } }
    ]);
    const totalsMap = {};
    totals.forEach(t => { totalsMap[t._id.toString()] = t.collected; });

    const result = opportunities.map(opp => {
      const obj = opp.toObject();
      if (obj.fundraiser?.enabled) {
        obj.fundraiser.collectedAmount = totalsMap[opp._id.toString()] || 0;
      }
      return obj;
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single opportunity by ID
const getOpportunityById = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    res.status(200).json(opportunity);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update an opportunity (creator only)
const updateOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    if (opportunity.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const {
      title, description, organization, location,
      startDate, endDate, spotsAvailable, category,
      responsibleName, responsibleEmail, responsiblePhone,
      fundraiserEnabled, fundraiserTarget
    } = req.body;

    const updatedData = {
      title, description, organization, location,
      startDate, endDate, spotsAvailable, category,
      responsibleName, responsibleEmail, responsiblePhone
    };

    if (req.file) {
      updatedData.bannerImage = req.file.path;
    }

    updatedData.fundraiser = {
      enabled: fundraiserEnabled === 'true' || fundraiserEnabled === true,
      targetAmount: fundraiserEnabled === 'true' || fundraiserEnabled === true
        ? (Number(fundraiserTarget) || 0)
        : 0
    };

    const updatedOpportunity = await Opportunity.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    res.status(200).json({
      message: 'Opportunity updated successfully',
      opportunity: updatedOpportunity
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getMyOpportunities = async (req, res) => {
  try {
    const opportunities = await Opportunity.find({ createdBy: req.user.id })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.status(200).json(opportunities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete an opportunity (creator only)
const deleteOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    if (opportunity.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Opportunity.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Opportunity deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get opportunities that have a fundraiser enabled, with confirmed donation totals
const getOpportunitiesWithFundraiser = async (req, res) => {
  try {
    const opportunities = await Opportunity.find({ 'fundraiser.enabled': true })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Compute confirmed totals for each opportunity
    const totals = await Donation.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: '$opportunity', collected: { $sum: '$amount' } } }
    ]);

    const totalsMap = {};
    totals.forEach(t => { totalsMap[t._id.toString()] = t.collected; });

    const result = opportunities.map(opp => ({
      ...opp.toObject(),
      fundraiser: {
        ...opp.fundraiser.toObject ? opp.fundraiser.toObject() : opp.fundraiser,
        collectedAmount: totalsMap[opp._id.toString()] || 0
      }
    }));

    res.status(200).json(result);
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
  deleteOpportunity,
  getOpportunitiesWithFundraiser
};
