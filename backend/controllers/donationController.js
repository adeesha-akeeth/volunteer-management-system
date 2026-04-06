const Donation = require('../models/Donation');
const Opportunity = require('../models/Opportunity');

// Create a donation (donor submits with receipt)
const createDonation = async (req, res) => {
  try {
    const { opportunityId, amount, message, donorName, donorPhone } = req.body;

    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }
    if (!opportunity.fundraiser?.enabled) {
      return res.status(400).json({ message: 'This opportunity does not have a fundraiser' });
    }

    const receiptImage = req.file ? req.file.path : '';

    const donation = await Donation.create({
      donor: req.user.id,
      opportunity: opportunityId,
      amount,
      message,
      donorName: donorName || '',
      donorPhone: donorPhone || '',
      receiptImage
    });

    const populated = await Donation.findById(donation._id).populate('opportunity', 'title fundraiser');

    res.status(201).json({
      message: 'Donation submitted successfully',
      donation: populated
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all donations by the logged-in donor
const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user.id })
      .populate('opportunity', 'title fundraiser')
      .sort({ createdAt: -1 });

    const confirmedTotal = donations
      .filter(d => d.status === 'confirmed')
      .reduce((sum, d) => sum + d.amount, 0);

    res.status(200).json({
      confirmedTotal,
      totalDonations: donations.length,
      donations
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get donations for a specific opportunity (creator only)
const getDonationsByOpportunity = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }
    if (opportunity.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const donations = await Donation.find({ opportunity: req.params.opportunityId })
      .populate('donor', 'name email')
      .sort({ createdAt: -1 });

    const confirmedTotal = donations
      .filter(d => d.status === 'confirmed')
      .reduce((sum, d) => sum + d.amount, 0);

    res.status(200).json({ confirmedTotal, totalDonations: donations.length, donations });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update donation status (opportunity creator only)
const updateDonationStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be confirmed or rejected' });
    }

    const donation = await Donation.findById(req.params.id).populate('opportunity');
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    if (donation.opportunity.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the opportunity creator can accept donations' });
    }

    donation.status = status;
    await donation.save();

    res.status(200).json({ message: `Donation ${status} successfully`, donation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update donation details (donor only, pending only)
const updateDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    if (donation.donor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (donation.status !== 'pending') {
      return res.status(400).json({ message: 'Can only update pending donations' });
    }

    const { amount, message, donorName, donorPhone } = req.body;
    if (amount) donation.amount = amount;
    if (message !== undefined) donation.message = message;
    if (donorName !== undefined) donation.donorName = donorName;
    if (donorPhone !== undefined) donation.donorPhone = donorPhone;
    if (req.file) donation.receiptImage = req.file.path;

    await donation.save();
    const populated = await Donation.findById(donation._id).populate('opportunity', 'title fundraiser');

    res.status(200).json({ message: 'Donation updated successfully', donation: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a donation (donor only, pending only)
const deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) {
      return res.status(404).json({ message: 'Donation not found' });
    }
    if (donation.donor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (donation.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot delete a confirmed or rejected donation' });
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
  getDonationsByOpportunity,
  updateDonationStatus,
  updateDonation,
  deleteDonation
};
