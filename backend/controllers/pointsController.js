const mongoose = require('mongoose');
const Contribution = require('../models/Contribution');
const Donation = require('../models/Donation');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');

// Points rules:
// - 10 pts per verified hour contributed
// - 1 pt per LKR 100 donated (confirmed)
// - 50 pts per opportunity created

const computePointsForUser = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  const [contribAgg, donationAgg, oppCount] = await Promise.all([
    Contribution.aggregate([
      { $match: { volunteer: uid, status: 'verified' } },
      { $group: { _id: null, totalHours: { $sum: '$hours' } } }
    ]),
    Donation.aggregate([
      { $match: { donor: uid, status: 'confirmed' } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]),
    Opportunity.countDocuments({ createdBy: userId })
  ]);

  const totalHours = contribAgg[0]?.totalHours || 0;
  const totalDonated = donationAgg[0]?.totalAmount || 0;

  const hoursPoints = Math.floor(totalHours * 10);
  const donationPoints = Math.floor(totalDonated / 100);
  const opportunityPoints = oppCount * 50;
  const total = hoursPoints + donationPoints + opportunityPoints;

  return { total, hoursPoints, donationPoints, opportunityPoints, totalHours, totalDonated, opportunitiesCreated: oppCount };
};

const getMyPoints = async (req, res) => {
  try {
    const data = await computePointsForUser(req.user.id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    // Aggregate points across all users
    const [contribAgg, donationAgg, oppAgg] = await Promise.all([
      Contribution.aggregate([
        { $match: { status: 'verified' } },
        { $group: { _id: '$volunteer', totalHours: { $sum: '$hours' } } }
      ]),
      Donation.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: '$donor', totalAmount: { $sum: '$amount' } } }
      ]),
      Opportunity.aggregate([
        { $group: { _id: '$createdBy', count: { $sum: 1 } } }
      ])
    ]);

    const pointsMap = {};

    const ensure = (id) => { if (!pointsMap[id]) pointsMap[id] = 0; };

    contribAgg.forEach(c => {
      const id = c._id?.toString(); if (!id) return;
      ensure(id); pointsMap[id] += Math.floor((c.totalHours || 0) * 10);
    });
    donationAgg.forEach(d => {
      const id = d._id?.toString(); if (!id) return;
      ensure(id); pointsMap[id] += Math.floor((d.totalAmount || 0) / 100);
    });
    oppAgg.forEach(o => {
      const id = o._id?.toString(); if (!id) return;
      ensure(id); pointsMap[id] += (o.count || 0) * 50;
    });

    // Include current user even if they have 0 points
    if (!pointsMap[req.user.id]) pointsMap[req.user.id] = 0;

    const allIds = Object.keys(pointsMap);
    const users = await User.find({ _id: { $in: allIds } }).select('name');
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u.name; });

    const ranked = Object.entries(pointsMap)
      .map(([id, points]) => ({ userId: id, name: userMap[id] || 'Unknown', points }))
      .sort((a, b) => b.points - a.points)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    const top5 = ranked.slice(0, 5);
    const myEntry = ranked.find(r => r.userId === req.user.id);

    res.json({
      top5,
      myRank: myEntry?.rank || ranked.length,
      myPoints: myEntry?.points || 0,
      totalUsers: ranked.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getMyPoints, getLeaderboard };
