const Opportunity = require('../models/Opportunity');

// Create a new opportunity (with optional banner image upload)
const createOpportunity = async (req, res) => {
  try {
    const { title, description, organization, location, date, spotsAvailable, category } = req.body;

    // If a file was uploaded, save its path. Otherwise save empty string.
    const bannerImage = req.file ? req.file.path : '';

    const opportunity = await Opportunity.create({
      title,
      description,
      organization,
      location,
      date,
      spotsAvailable,
      category,
      bannerImage,
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

    // Build a filter object based on query params
    let filter = {};

    if (search) {
      filter.title = { $regex: search, $options: 'i' }; // case-insensitive search
    }

    if (category) {
      filter.category = category;
    }

    const opportunities = await Opportunity.find(filter)
      .populate('createdBy', 'name email') // fetch user name+email instead of just ID
      .sort({ createdAt: -1 }); // newest first

    res.status(200).json(opportunities);
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

// Update an opportunity
const updateOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Only the creator can update
    if (opportunity.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updatedData = { ...req.body };

    // If a new banner image was uploaded, update it
    if (req.file) {
      updatedData.bannerImage = req.file.path;
    }

    const updatedOpportunity = await Opportunity.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true } // return the updated document
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
// Delete an opportunity
const deleteOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Only the creator can delete
    if (opportunity.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Opportunity.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Opportunity deleted successfully' });
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
  deleteOpportunity
};