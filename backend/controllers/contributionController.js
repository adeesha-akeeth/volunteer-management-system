const Contribution = require('../models/Contribution');
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const Notification = require('../models/Notification');

// Volunteer submits a contribution for an approved application
const submitContribution = async (req, res) => {
  try {
    const { opportunityId, hours, description } = req.body;
    if (!hours || isNaN(hours) || Number(hours) < 0.5) {
      return res.status(400).json({ message: 'Hours must be at least 0.5' });
    }

    const application = await Application.findOne({
      opportunity: opportunityId,
      volunteer: req.user.id,
      status: 'approved'
    });
    if (!application) {
      return res.status(403).json({ message: 'You must have an approved application to log a contribution' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Proof image is required' });
    }
    const proofImage = req.file.path.replace(/\\/g, '/');

    const contribution = await Contribution.create({
      opportunity: opportunityId,
      volunteer: req.user.id,
      hours: Number(hours),
      description: description || '',
      proofImage
    });

    // Notify the creator
    try {
      const opp = await Opportunity.findById(opportunityId).select('title createdBy');
      if (opp) {
        await Notification.create({
          recipient: opp.createdBy,
          type: 'contribution_received',
          message: `A volunteer submitted ${hours} hrs for verification — "${opp.title}"`,
          relatedId: opp._id
        });
      }
    } catch {}

    res.status(201).json({ message: 'Contribution submitted for verification', contribution });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Volunteer updates their own PENDING contribution
const updateMyContribution = async (req, res) => {
  try {
    const { hours, description } = req.body;
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' });
    if (contribution.volunteer.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    if (contribution.status !== 'pending') return res.status(400).json({ message: 'Can only edit pending contributions' });

    if (hours !== undefined) {
      if (isNaN(hours) || Number(hours) < 0.5) return res.status(400).json({ message: 'Hours must be at least 0.5' });
      contribution.hours = Number(hours);
    }
    if (description !== undefined) contribution.description = description;
    if (req.file) {
      contribution.proofImage = req.file.path.replace(/\\/g, '/');
    } else if (req.body.removeProofImage === 'true') {
      contribution.proofImage = '';
    }
    await contribution.save();

    res.json({ message: 'Contribution updated', contribution });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Volunteer deletes their own PENDING contribution
const deleteMyContribution = async (req, res) => {
  try {
    const contribution = await Contribution.findById(req.params.id);
    if (!contribution) return res.status(404).json({ message: 'Contribution not found' });
    if (contribution.volunteer.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    if (contribution.status !== 'pending') return res.status(400).json({ message: 'Can only delete pending contributions' });

    await Contribution.deleteOne({ _id: req.params.id });
    res.json({ message: 'Contribution deleted' });
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

    const validApps = applications.filter(app => app.opportunity != null);

    const result = await Promise.all(validApps.map(async (app) => {
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

// Creator gets all contributions for their opportunity
const getContributionsForOpportunity = async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.opportunityId);
    if (!opp) return res.status(404).json({ message: 'Opportunity not found' });
    if (opp.createdBy.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    const contributions = await Contribution.find({ opportunity: req.params.opportunityId })
      .populate('volunteer', 'name email profileImage')
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

    // Notify the volunteer
    try {
      const pts = status === 'verified' ? Math.floor(contribution.hours * 10) : 0;
      const msg = status === 'verified'
        ? `✅ Your ${contribution.hours} hr contribution for "${contribution.opportunity.title}" was verified! You earned ${pts} pts.`
        : `❌ Your contribution for "${contribution.opportunity.title}" was not verified.`;
      await Notification.create({
        recipient: contribution.volunteer,
        type: 'contribution_status',
        message: msg,
        relatedId: contribution.opportunity._id,
        relatedType: 'opportunity'
      });
    } catch {}

    res.json({ message: `Contribution ${status}`, contribution });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Volunteer gets their completed opportunities (past volunteering)
const getMyCompletedOpportunities = async (req, res) => {
  try {
    const applications = await Application.find({ volunteer: req.user.id, status: 'completed' })
      .populate('opportunity', 'title organization location startDate endDate bannerImage category')
      .sort({ updatedAt: -1 });

    const result = await Promise.all(applications.map(async (app) => {
      const contributions = await Contribution.find({
        opportunity: app.opportunity._id,
        volunteer: req.user.id
      }).sort({ createdAt: -1 });
      const verifiedHours = contributions.filter(c => c.status === 'verified').reduce((s, c) => s + c.hours, 0);
      return { application: app, opportunity: app.opportunity, contributions, verifiedHours };
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Creator gets all contributions across all their opportunities
const getAllContributionsForCreator = async (req, res) => {
  try {
    const myOpps = await Opportunity.find({ createdBy: req.user.id }, '_id title');
    const myOppIds = myOpps.map(o => o._id);

    const contributions = await Contribution.find({ opportunity: { $in: myOppIds } })
      .populate('volunteer', 'name email profileImage')
      .populate('opportunity', 'title')
      .sort({ status: 1, createdAt: -1 });

    res.json(contributions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  submitContribution,
  updateMyContribution,
  deleteMyContribution,
  getMyContributions,
  getMyApprovedOpportunities,
  getMyCompletedOpportunities,
  getContributionsForOpportunity,
  updateContributionStatus,
  getAllContributionsForCreator
};
