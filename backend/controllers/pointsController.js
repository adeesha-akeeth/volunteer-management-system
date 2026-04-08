const mongoose = require('mongoose');
const Contribution = require('../models/Contribution');
const Donation = require('../models/Donation');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const User = require('../models/User');

// Points rules:
// - 10 pts per verified contribution hour
// - 1 pt per LKR 100 donated (confirmed)
// - 100 pts per volunteer you accepted who reaches 'completed' status

const computePointsForUser = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  // Opportunities created by this user
  const myOpps = await Opportunity.find({ createdBy: uid }, '_id');
  const myOppIds = myOpps.map(o => o._id);

  const [contribAgg, donationAgg, completedCount] = await Promise.all([
    Contribution.aggregate([
      { $match: { volunteer: uid, status: 'verified' } },
      { $group: { _id: null, totalHours: { $sum: '$hours' } } }
    ]),
    Donation.aggregate([
      { $match: { donor: uid, status: 'confirmed' } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]),
    Application.countDocuments({
      opportunity: { $in: myOppIds },
      status: 'completed'
    })
  ]);

  const totalHours = contribAgg[0]?.totalHours || 0;
  const totalDonated = donationAgg[0]?.totalAmount || 0;

  const hoursPoints = Math.floor(totalHours * 10);
  const donationPoints = Math.floor(totalDonated / 100);
  const completionPoints = completedCount * 100;
  const total = hoursPoints + donationPoints + completionPoints;

  return {
    total, hoursPoints, donationPoints, completionPoints,
    totalHours, totalDonated,
    opportunitiesCreated: myOpps.length,
    completedVolunteers: completedCount
  };
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
    // Get all users
    const allUsers = await User.find({}, '_id');
    const allIds = allUsers.map(u => u._id);

    // Aggregate contribution hours
    const contribAgg = await Contribution.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: '$volunteer', totalHours: { $sum: '$hours' } } }
    ]);

    // Aggregate donations
    const donationAgg = await Donation.aggregate([
      { $match: { status: 'confirmed' } },
      { $group: { _id: '$donor', totalAmount: { $sum: '$amount' } } }
    ]);

    // Aggregate completed volunteers per creator
    const oppsByCreator = await Opportunity.aggregate([
      { $group: { _id: '$createdBy', oppIds: { $push: '$_id' } } }
    ]);
    const creatorOppMap = {};
    oppsByCreator.forEach(o => { creatorOppMap[o._id.toString()] = o.oppIds; });

    const completedByCreator = {};
    if (oppsByCreator.length > 0) {
      const allOppIds = oppsByCreator.flatMap(o => o.oppIds);
      const completedApps = await Application.aggregate([
        { $match: { status: 'completed', opportunity: { $in: allOppIds } } },
        { $lookup: { from: 'opportunities', localField: 'opportunity', foreignField: '_id', as: 'opp' } },
        { $unwind: '$opp' },
        { $group: { _id: '$opp.createdBy', count: { $sum: 1 } } }
      ]);
      completedApps.forEach(c => { completedByCreator[c._id.toString()] = c.count; });
    }

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
    Object.entries(completedByCreator).forEach(([id, count]) => {
      ensure(id); pointsMap[id] += count * 100;
    });

    // Include current user even if they have 0 points
    if (!pointsMap[req.user.id]) pointsMap[req.user.id] = 0;

    const allUserIds = Object.keys(pointsMap);
    const users = await User.find({ _id: { $in: allUserIds } }).select('name');
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
