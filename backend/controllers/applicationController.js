const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');

// Apply to an opportunity
const applyToOpportunity = async (req, res) => {
  try {
    const { opportunityId, coverLetter } = req.body;

    // Check if opportunity exists
    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      opportunity: opportunityId,
      volunteer: req.user.id
    });
    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied to this opportunity' });
    }

    // If a resume file was uploaded, save its path
    const resumeFile = req.file ? req.file.path : '';

    const application = await Application.create({
      opportunity: opportunityId,
      volunteer: req.user.id,
      coverLetter,
      resumeFile
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all applications for a specific opportunity (for org to review)
const getApplicationsForOpportunity = async (req, res) => {
  try {
    const applications = await Application.find({ opportunity: req.params.opportunityId })
      .populate('volunteer', 'name email')
      .populate('opportunity', 'title organization')
      .sort({ appliedAt: -1 });

    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all applications by the logged in volunteer
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ volunteer: req.user.id })
      .populate('opportunity', 'title organization location date')
      .sort({ appliedAt: -1 });

    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Approve or reject an application
const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status value
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
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

// Delete an application (volunteer withdraws)
const deleteApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Only the volunteer who applied can withdraw
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
  getApplicationsForOpportunity,
  getMyApplications,
  updateApplicationStatus,
  deleteApplication
};