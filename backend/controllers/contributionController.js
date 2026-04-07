const Contribution = require('../models/Contribution');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');

// Volunteer submits a contribution for an approved application
const submitContribution = async (req, res) => {
  try {
    const { opportunityId, hours, description } = req.body;
    if (!hours || isNaN(hours) || Number(hours) < 0.5) {
      return res.status(400).json({ message: 'Hours must be at least 0.5' });
    }

    // Must have an approved application
    const application = await Application.findOne({
      opportunity: opportunityId,
      volunteer: req.user.id,
      status: 'approved'
    });
    if (!application) {
      return res.status(403).json({ message: 'You must have an approved application to log a contribution' });
    }

    const contribution = await Contribution.create({
      opportunity: opportunityId,
      volunteer: req.user.id,
      hours: Number(hours),
      description: description || ''
    });

    res.status(201).json({ message: 'Contribution submitted for verification', contribution });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Volunteer gets their own contributions
const getMyContributions = async (req, res) => {
  try {
    const contributions = await Contribution.find({ volunteer: req.user.id })
      .populate('opportunity', 'title organization location')
      .sort({ createdAt: -1 });
    res.json(contributions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Volunteer gets their approved opportunities (for ongoing list)
const getMyApprovedOpportunities = async (req, res) => {
  try {
    const applications = await Application.find({ volunteer: req.user.id, status: 'approved' })
      .populate('opportunity', 'title organization location startDate endDate bannerImage category')
      .sort({ appliedAt: -1 });

    const result = await Promise.all(applications.map(async (app) => {
      const contributions = await Contribution.find({
        opportunity: app.opportunity._id,
        volunteer: req.user.id
      }).sort({ createdAt: -1 });
      return { application: app, opportunity: app.opportunity, contributions };
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Creator gets all contributions for their opportunity (grouped by volunteer)
const getContributionsForOpportunity = async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.opportunityId);
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' });
    if (opp.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const contributions = await Contribution.find({ opportunity: req.params.opportunityId })
      .populate('volunteer', 'name email')
      .sort({ createdAt: -1 });

    res.json(contributions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Creator verifies or rejects a contribution
const updateContributionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be verified or rejected' });
    }

    const contribution = await Contribution.findById(req.params.id).populate('opportunity');
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' });
    if (contribution.opportunity.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    contribution.status = status;
    await contribution.save();
    res.json({ message: `Contribution ${status}`, contribution });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  submitContribution,
  getMyContributions,
  getMyApprovedOpportunities,
  getContributionsForOpportunity,
  updateContributionStatus
};
