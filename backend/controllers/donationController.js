const Donation = require('../models/Donation');
const Fundraiser = require('../models/Fundraiser');
const Opportunity = require('../models/Opportunity');
const Notification = require('../models/Notification');

// Create a donation linked to a fundraiser
const createDonation = async (req, res) => {
  try {
    const { fundraiserId, amount, message, donorName, donorPhone } = req.body;

    const fundraiser = await Fundraiser.findById(fundraiserId).populate('opportunity');
    if (!fundraiser) return res.status(404).json({ message: 'Fundraiser not found' });
    if (fundraiser.status === 'completed') {
      return res.status(400).json({ message: 'This fundraiser has already reached its goal' });
    }
    if (fundraiser.status === 'stopped') {
      return res.status(400).json({ message: 'This fundraiser has been stopped' });
    }

    // Check if goal already reached (confirmed donations)
    const confirmedTotal = await Donation.aggregate([
      { $match: { fundraiser: fundraiser._id, status: 'confirmed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    if ((confirmedTotal[0]?.total || 0) >= fundraiser.targetAmount) {
      return res.status(400).json({ message: 'This fundraiser has already reached its goal' });
    }

    const receiptImage = req.file ? req.file.path : '';

    const donation = await Donation.create({
      donor: req.user.id,
      fundraiser: fundraiserId,
      opportunity: fundraiser.opportunity?._id || undefined,
      amount,
      message: message || '',
      donorName: donorName || '',
      donorPhone: donorPhone || '',
      receiptImage
    });

    const populated = await Donation.findById(donation._id)
      .populate('fundraiser', 'name targetAmount status')
      .populate('opportunity', 'title');

    // Notify opportunity creator (only for opportunity-linked fundraisers)
    if (fundraiser.opportunity) {
      try {
        await Notification.create({
          recipient: fundraiser.opportunity.createdBy,
          type: 'donation_received',
          message: `A new donation of LKR ${amount} was received for "${fundraiser.name}"`,
          relatedId: fundraiser.opportunity._id
        });
      } catch {}
    }

    res.status(201).json({ message: 'Donation submitted successfully', donation: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all donations by the logged-in donor
const getMyDonations = async (req, res) => {
  try {
    const donations = await Donation.find({ donor: req.user.id })
      .populate('fundraiser', 'name targetAmount status')
      .populate('opportunity', 'title')
      .sort({ createdAt: -1 });

    const confirmedTotal = donations
      .filter(d => d.status === 'confirmed')
      .reduce((sum, d) => sum + d.amount, 0);

    res.status(200).json({ confirmedTotal, totalDonations: donations.length, donations });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get donations for a specific fundraiser (creator only)
const getDonationsByFundraiser = async (req, res) => {
  try {
    const fundraiser = await Fundraiser.findById(req.params.fundraiserId);
    if (!fundraiser) return res.status(404).json({ message: 'Fundraiser not found' });
    if (fundraiser.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const donations = await Donation.find({ fundraiser: req.params.fundraiserId })
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

// Update donation status — opportunity creator only
// Also auto-completes the fundraiser if target is reached
const updateDonationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be confirmed or rejected' });
    }

    const donation = await Donation.findById(req.params.id)
      .populate({ path: 'fundraiser', populate: [{ path: 'opportunity' }, { path: 'createdBy' }] });
    if (!donation) return res.status(404).json({ message: 'Donation not found' });

    const fundraiser = donation.fundraiser;
    const isAuthorized = fundraiser.opportunity
      ? fundraiser.opportunity.createdBy.toString() === req.user.id
      : fundraiser.createdBy._id.toString() === req.user.id;
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Only the fundraiser creator can review donations' });
    }

    donation.status = status;
    await donation.save();

    // Notify the donor
    try {
      const statusMsg = status === 'confirmed'
        ? `Your donation to "${fundraiser.name}" has been confirmed. Thank you!`
        : `Your donation to "${fundraiser.name}" was rejected.`;
      await Notification.create({
        recipient: donation.donor,
        type: 'donation_status',
        message: statusMsg,
        relatedId: fundraiser.opportunity?._id || fundraiser._id
      });
    } catch {}

    // Auto-complete fundraiser if confirmed total >= target
    if (status === 'confirmed') {
      const fundraiser = await Fundraiser.findById(donation.fundraiser._id);
      if (fundraiser && fundraiser.status === 'active') {
        const totalConfirmed = await Donation.aggregate([
          { $match: { fundraiser: fundraiser._id, status: 'confirmed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const total = totalConfirmed[0]?.total || 0;
        if (total >= fundraiser.targetAmount) {
          fundraiser.status = 'completed';
          fundraiser.completedAt = new Date();
          await fundraiser.save();
        }
      }
    }

    res.status(200).json({ message: `Donation ${status}`, donation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update donation details (donor only, pending only)
const updateDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });
    if (donation.donor.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    if (donation.status !== 'pending') return res.status(400).json({ message: 'Can only edit pending donations' });

    const { amount, message, donorName, donorPhone } = req.body;
    if (amount) donation.amount = amount;
    if (message !== undefined) donation.message = message;
    if (donorName !== undefined) donation.donorName = donorName;
    if (donorPhone !== undefined) donation.donorPhone = donorPhone;
    if (req.file) donation.receiptImage = req.file.path;

    await donation.save();
    const populated = await Donation.findById(donation._id)
      .populate('fundraiser', 'name targetAmount status')
      .populate('opportunity', 'title');

    res.status(200).json({ message: 'Donation updated', donation: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a donation (donor only, pending only)
const deleteDonation = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id);
    if (!donation) return res.status(404).json({ message: 'Donation not found' });
    if (donation.donor.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    if (donation.status !== 'pending') return res.status(400).json({ message: 'Cannot delete a confirmed/rejected donation' });

    await Donation.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Donation deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all pending donations across the creator's fundraisers
const getMyFundraiserPending = async (req, res) => {
  try {
    const myFundraisers = await Fundraiser.find({ createdBy: req.user.id }).select('_id name');
    if (!myFundraisers.length) return res.json([]);

    const ids = myFundraisers.map(f => f._id);
    const donations = await Donation.find({ fundraiser: { $in: ids }, status: 'pending' })
      .populate('fundraiser', 'name')
      .populate('donor', 'name email')
      .sort({ createdAt: -1 });

    res.json(donations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createDonation,
  getMyDonations,
  getDonationsByFundraiser,
  updateDonationStatus,
  updateDonation,
  deleteDonation,
  getMyFundraiserPending
};
