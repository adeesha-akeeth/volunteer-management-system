const Hours = require('../models/Hours');
const Opportunity = require('../models/Opportunity');

// Log hours for an opportunity
const logHours = async (req, res) => {
  try {
    const { opportunityId, hoursLogged, date, description } = req.body;

    // Check if opportunity exists
    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // If a proof image was uploaded, save its path
    const proofImage = req.file ? req.file.path : '';

    const hours = await Hours.create({
      volunteer: req.user.id,
      opportunity: opportunityId,
      hoursLogged,
      date,
      description,
      proofImage
    });

    res.status(201).json({
      message: 'Hours logged successfully',
      hours
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all hours logged by the logged in volunteer
const getMyHours = async (req, res) => {
  try {
    const hours = await Hours.find({ volunteer: req.user.id })
      .populate('opportunity', 'title organization location date')
      .sort({ date: -1 });

    res.status(200).json(hours);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all hours for a specific opportunity (for org to verify)
const getHoursForOpportunity = async (req, res) => {
  try {
    const hours = await Hours.find({ opportunity: req.params.opportunityId })
      .populate('volunteer', 'name email')
      .populate('opportunity', 'title organization')
      .sort({ date: -1 });

    res.status(200).json(hours);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify or reject logged hours
const updateHoursStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status value
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be verified or rejected' });
    }

    const hours = await Hours.findById(req.params.id);
    if (!hours) {
      return res.status(404).json({ message: 'Hours record not found' });
    }

    hours.status = status;
    await hours.save();

    res.status(200).json({
      message: `Hours ${status} successfully`,
      hours
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a hours record
const deleteHours = async (req, res) => {
  try {
    const hours = await Hours.findById(req.params.id);

    if (!hours) {
      return res.status(404).json({ message: 'Hours record not found' });
    }

    // Only the volunteer who logged the hours can delete
    if (hours.volunteer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Hours.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Hours record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  logHours,
  getMyHours,
  getHoursForOpportunity,
  updateHoursStatus,
  deleteHours
};