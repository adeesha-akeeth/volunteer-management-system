const Donation = require('../models/Donation');

// Create a donation
const createDonation = async (req, res) => {
  try {
    const { campaign, amount, message } = req.body;

    // If a receipt image was uploaded, save its path
    const receiptImage = req.file ? req.file.path : '';

    const donation = await Donation.create({
      donor: req.user.id,
      campaign,
      amount,
      message,
      receiptImage
    });

    res.status(201).json({
      message: 'Donation submitted successfully',
      donation
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all donations by the logged in donor
const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user.id })
      .sort({ createdAt: -1 });

    // Calculate total amount donated
    const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);

    res.status(200).json({
      totalDonated,
      totalDonations: donations.length,
      donations
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all donations (admin view)
const getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.find()
      .populate('donor', 'name email')
      .sort({ createdAt: -1 });

    // Calculate total amount donated across all donors
    const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);

    res.status(200).json({
      totalDonated,
      totalDonations: donations.length,
      donations
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update donation status (confirm or reject)
const updateDonationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status value
    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be confirmed or rejected' });
    }

    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    donation.status = status;
    await donation.save();

    res.status(200).json({
      message: `Donation ${status} successfully`,
      donation
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a donation
const deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    // Only the donor can delete their own donation
    if (donation.donor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Donation.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Donation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createDonation,
  getMyDonations,
  getAllDonations,
  updateDonationStatus,
  deleteDonation
};