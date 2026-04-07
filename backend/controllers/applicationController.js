const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');

// Apply to an opportunity
const applyToOpportunity = async (req, res) => {
  try {
    const { opportunityId, coverLetter, phone, email } = req.body;

    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Check if opportunity has ended
    if (opportunity.endDate && new Date() > new Date(opportunity.endDate)) {
      return res.status(400).json({ message: 'This opportunity has already ended and is no longer accepting applications' });
    }

    // Check if all spots are filled (count approved + completed)
    const filledCount = await Application.countDocuments({
      opportunity: opportunityId,
      status: { $in: ['approved', 'completed'] }
    });
    if (filledCount >= opportunity.spotsAvailable) {
      return res.status(400).json({ message: 'All spots for this opportunity are filled' });
    }

    const existingApplication = await Application.findOne({
      opportunity: opportunityId,
      volunteer: req.user.id
    });
    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied to this opportunity' });
    }

    const photo = req.file ? req.file.path : '';

    const application = await Application.create({
      opportunity: opportunityId,
      volunteer: req.user.id,
      coverLetter,
      phone,
      email,
      photo
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all applications by the logged in volunteer
const getMyApplications = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = { volunteer: req.user.id };
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate('opportunity', 'title organization location startDate endDate bannerImage')
      .sort({ appliedAt: -1 });

    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all applications for a specific opportunity (for creator)
const getApplicationsForOpportunity = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = { opportunity: req.params.opportunityId };
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate('volunteer', 'name email phone')
      .populate('opportunity', 'title organization')
      .sort({ appliedAt: -1 });

    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update application status (creator approves or marks completed)
const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved, rejected, or completed' });
    }

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    application.status = status;
    await application.save();

    res.status(200).json({
      message: `Application ${status} successfully`,
      application
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Withdraw application
const deleteApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.volunteer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Application.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  applyToOpportunity,
  getMyApplications,
  getApplicationsForOpportunity,
  updateApplicationStatus,
  deleteApplication
};
