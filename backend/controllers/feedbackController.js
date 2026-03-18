const Feedback = require('../models/Feedback');
const Opportunity = require('../models/Opportunity');

// Create feedback for an opportunity
const createFeedback = async (req, res) => {
  try {
    const { opportunityId, rating, comment } = req.body;

    // Check if opportunity exists
    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Check if already submitted feedback
    const existingFeedback = await Feedback.findOne({
      opportunity: opportunityId,
      volunteer: req.user.id
    });
    if (existingFeedback) {
      return res.status(400).json({ message: 'You have already submitted feedback for this opportunity' });
    }

    // If a photo was uploaded, save its path
    const photo = req.file ? req.file.path : '';

    const feedback = await Feedback.create({
      volunteer: req.user.id,
      opportunity: opportunityId,
      rating,
      comment,
      photo
    });

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all feedback for a specific opportunity
const getFeedbackForOpportunity = async (req, res) => {
  try {
    const feedback = await Feedback.find({ opportunity: req.params.opportunityId })
      .populate('volunteer', 'name email')
      .populate('opportunity', 'title organization')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const averageRating = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
      : 0;

    res.status(200).json({
      averageRating: averageRating.toFixed(1),
      totalReviews: feedback.length,
      feedback
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all feedback by the logged in volunteer
const getMyFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({ volunteer: req.user.id })
      .populate('opportunity', 'title organization location date')
      .sort({ createdAt: -1 });

    res.status(200).json(feedback);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update feedback
const updateFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    // Only the volunteer who submitted can update
    if (feedback.volunteer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedData = { ...req.body };

    // If a new photo was uploaded, update it
    if (req.file) {
      updatedData.photo = req.file.path;
    }

    const updatedFeedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    res.status(200).json({
      message: 'Feedback updated successfully',
      feedback: updatedFeedback
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete feedback
const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    // Only the volunteer who submitted can delete
    if (feedback.volunteer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Feedback.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createFeedback,
  getFeedbackForOpportunity,
  getMyFeedback,
  updateFeedback,
  deleteFeedback
};