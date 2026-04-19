const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const Notification = require('../models/Notification');

// Apply to an opportunity
const applyToOpportunity = async (req, res) => {
  try {
    const { opportunityId, coverLetter, phone, email, applicantName, motivation, expectedHours, hopingToGain, useProfilePhoto } = req.body;

    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Check if opportunity has ended
    if (opportunity.endDate && new Date() > new Date(opportunity.endDate)) {
      return res.status(400).json({ message: 'This opportunity has already ended and is no longer accepting applications' });
    }

    // Check if applications are closed
    if (opportunity.status === 'closed') {
      return res.status(400).json({ message: 'Applications are closed for this opportunity' });
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

    let photo = req.file ? req.file.path : '';
    // If user chose to share their profile photo
    if (!photo && useProfilePhoto === 'true') {
      const User = require('../models/User');
      const userDoc = await User.findById(req.user.id).select('profileImage');
      if (userDoc?.profileImage) photo = userDoc.profileImage;
    }

    const application = await Application.create({
      opportunity: opportunityId,
      volunteer: req.user.id,
      coverLetter,
      phone,
      email,
      photo,
      applicantName: applicantName || '',
      motivation: motivation || '',
      expectedHours: expectedHours ? Number(expectedHours) : null,
      hopingToGain: hopingToGain || ''
    });

    // Notify the opportunity creator
    try {
      await Notification.create({
        recipient: opportunity.createdBy,
        type: 'new_application',
        message: `Application received for "${opportunity.title}"`,
        relatedId: opportunity._id
      });
    } catch {}

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

    // Auto-close opportunity when all slots filled
    if (status === 'approved') {
      try {
        const opp = await Opportunity.findById(application.opportunity);
        if (opp && opp.status === 'open') {
          const approvedCount = await Application.countDocuments({
            opportunity: opp._id,
            status: { $in: ['approved', 'completed'] }
          });
          if (approvedCount >= opp.spotsAvailable) {
            opp.status = 'closed';
            await opp.save();
          }
        }
      } catch {}
    }

    // Notify the volunteer
    try {
      const opp = await Opportunity.findById(application.opportunity).select('title');
      const msgs = {
        approved: `✅ Your application for "${opp?.title}" has been approved! You can now log contribution hours.`,
        rejected: `Your application for "${opp?.title}" was not selected this time.`,
        completed: `🎖️ Your volunteering for "${opp?.title}" has been marked as completed! You earned 300 pts.`
      };
      if (msgs[status]) {
        await Notification.create({
          recipient: application.volunteer,
          type: 'application_status',
          message: msgs[status],
          relatedId: application.opportunity
        });
      }
    } catch {}

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

// Creator removes an accepted volunteer (revoke = set status to rejected)
const revokeAcceptedVolunteer = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('opportunity', 'createdBy title');
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.opportunity.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (!['approved', 'completed'].includes(application.status)) {
      return res.status(400).json({ message: 'Can only remove accepted volunteers' });
    }

    application.status = 'rejected';
    await application.save();

    // Notify the volunteer
    try {
      await Notification.create({
        recipient: application.volunteer,
        type: 'application_status',
        message: `Your participation in "${application.opportunity.title}" has been revoked by the organizer.`,
        relatedId: application.opportunity._id
      });
    } catch {}

    res.json({ message: 'Volunteer removed from opportunity', application });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get ALL applications across all opportunities created by the logged-in user
const getAllApplicationsForCreator = async (req, res) => {
  try {
    const opportunities = await Opportunity.find({ createdBy: req.user.id }).select('_id');
    const oppIds = opportunities.map(o => o._id);
    const applications = await Application.find({ opportunity: { $in: oppIds } })
      .populate('volunteer', 'name email phone profileImage')
      .populate('opportunity', 'title organization')
      .sort({ appliedAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  applyToOpportunity,
  getMyApplications,
  getApplicationsForOpportunity,
  updateApplicationStatus,
  revokeAcceptedVolunteer,
  deleteApplication,
  getAllApplicationsForCreator
};
