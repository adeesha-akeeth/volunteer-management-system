const Feedback = require('../models/Feedback');
const Opportunity = require('../models/Opportunity');

// Create feedback for an opportunity (accessible to all authenticated users)
const createFeedback = async (req, res) => {
  try {
    const { opportunityId, rating, comment, anonymous } = req.body;

    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    const existingFeedback = await Feedback.findOne({
      opportunity: opportunityId,
      volunteer: req.user.id
    });
    if (existingFeedback) {
      return res.status(400).json({ message: 'You have already submitted feedback for this opportunity' });
    }

    const photo = req.file ? req.file.path : '';

    const feedback = await Feedback.create({
      volunteer: req.user.id,
      opportunity: opportunityId,
      rating,
      comment,
      photo,
      anonymous: anonymous === 'true' || anonymous === true
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
    const feedbackList = await Feedback.find({ opportunity: req.params.opportunityId })
      .populate('volunteer', 'name _id')
      .sort({ createdAt: -1 });

    const averageRating = feedbackList.length > 0
      ? feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length
      : 0;

    // Keep volunteer._id for ownership checks but mask name if anonymous
    const sanitized = feedbackList.map(f => ({
      _id: f._id,
      volunteer: {
        _id: f.volunteer?._id,
        name: f.anonymous ? 'Anonymous User' : f.volunteer?.name
      },
      opportunity: f.opportunity,
      rating: f.rating,
      comment: f.comment,
      photo: f.photo,
      anonymous: f.anonymous,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt
    }));

    res.status(200).json({
      averageRating: averageRating.toFixed(1),
      totalReviews: feedbackList.length,
      feedback: sanitized
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all feedback by the logged in volunteer
const getMyFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find({ volunteer: req.user.id })
      .populate('opportunity', 'title organization location startDate endDate')
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

    if (feedback.volunteer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedData = { ...req.body };
    if (updatedData.anonymous !== undefined) {
      updatedData.anonymous = updatedData.anonymous === 'true' || updatedData.anonymous === true;
    }

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
