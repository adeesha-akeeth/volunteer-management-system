const Favourite = require('../models/Favourite');

// Create a new favourites list
const createFavouriteList = async (req, res) => {
  try {
    const { name, description } = req.body;
    const photo = req.file ? req.file.path.replace(/\\/g, '/') : '';

    const favourite = await Favourite.create({
      user: req.user.id,
      name,
      description,
      photo
    });

    res.status(201).json({ message: 'Favourites list created', favourite });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all favourites lists for logged in user
const getMyFavouriteLists = async (req, res) => {
  try {
    const favourites = await Favourite.find({ user: req.user.id })
      .populate('opportunities', 'title organization location date bannerImage')
      .sort({ createdAt: -1 });

    res.status(200).json(favourites);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update a favourites list
const updateFavouriteList = async (req, res) => {
  try {
    const { name, description, removePhoto } = req.body;
    const favourite = await Favourite.findById(req.params.id);

    if (!favourite) return res.status(404).json({ message: 'List not found' });
    if (favourite.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    favourite.name = name || favourite.name;
    favourite.description = description || favourite.description;

    if (removePhoto === 'true') {
      favourite.photo = '';
    } else if (req.file) {
      favourite.photo = req.file.path.replace(/\\/g, '/');
    }

    await favourite.save();
    res.status(200).json(favourite);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a favourites list
const deleteFavouriteList = async (req, res) => {
  try {
    const favourite = await Favourite.findById(req.params.id);
    if (!favourite) return res.status(404).json({ message: 'List not found' });
    if (favourite.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    await Favourite.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'List deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add opportunity to a favourites list
const addOpportunityToList = async (req, res) => {
  try {
    const { opportunityId } = req.body;
    const favourite = await Favourite.findById(req.params.id);

    if (!favourite) return res.status(404).json({ message: 'List not found' });
    if (favourite.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    if (favourite.opportunities.includes(opportunityId)) {
      return res.status(400).json({ message: 'Already in this list' });
    }

    favourite.opportunities.push(opportunityId);
    await favourite.save();

    res.status(200).json({ message: 'Added to favourites', favourite });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove opportunity from a favourites list
const removeOpportunityFromList = async (req, res) => {
  try {
    const favourite = await Favourite.findById(req.params.id);

    if (!favourite) return res.status(404).json({ message: 'List not found' });
    if (favourite.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

    favourite.opportunities = favourite.opportunities.filter(
      op => op.toString() !== req.params.opportunityId
    );

    await favourite.save();
    res.status(200).json({ message: 'Removed from favourites', favourite });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createFavouriteList,
  getMyFavouriteLists,
  updateFavouriteList,
  deleteFavouriteList,
  addOpportunityToList,
  removeOpportunityFromList
};