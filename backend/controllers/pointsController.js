const mongoose = require('mongoose');
const Contribution = require('../models/Contribution');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const User = require('../models/User');
const Goal = require('../models/Goal');

// Compute hours + completion points only (no goal bonuses)
// Used by goalController to set pointsAtStart without circular bonus feedback
const computeBasePoints = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);

  const [contribAgg, completedCount, contributionCount] = await Promise.all([
    Contribution.aggregate([
      { $match: { volunteer: uid, status: 'verified' } },
      { $group: { _id: null, totalHours: { $sum: '$hours' } } }
    ]),
    Application.countDocuments({ volunteer: uid, status: 'completed' }),
    Contribution.countDocuments({ volunteer: uid, status: 'verified' })
  ]);

  const totalHours = contribAgg[0]?.totalHours || 0;
  const hoursPoints = Math.floor(totalHours * 10);
  const completionPoints = completedCount * 300;
  const baseTotal = hoursPoints + completionPoints;

  return { hoursPoints, completionPoints, totalHours, completedCount, contributionCount, baseTotal };
};

// Full total including goal bonuses
const computePointsForUser = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const base = await computeBasePoints(userId);

  const goalAgg = await Goal.aggregate([
    { $match: { user: uid, status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$bonusPoints' } } }
  ]);
  const goalBonusPoints = goalAgg[0]?.total || 0;

  return {
    ...base,
    goalBonusPoints,
    total: base.baseTotal + goalBonusPoints
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
    const contribAgg = await Contribution.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: '$volunteer', totalHours: { $sum: '$hours' } } }
    ]);

    const completedAgg = await Application.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$volunteer', count: { $sum: 1 } } }
    ]);

    const goalAgg = await Goal.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$user', bonus: { $sum: '$bonusPoints' } } }
    ]);

    const pointsMap = {};
    const ensure = (id) => { if (!pointsMap[id]) pointsMap[id] = 0; };

    contribAgg.forEach(c => {
      const id = c._id?.toString(); if (!id) return;
      ensure(id); pointsMap[id] += Math.floor((c.totalHours || 0) * 10);
    });
    completedAgg.forEach(c => {
      const id = c._id?.toString(); if (!id) return;
      ensure(id); pointsMap[id] += c.count * 300;
    });
    goalAgg.forEach(g => {
      const id = g._id?.toString(); if (!id) return;
      ensure(id); pointsMap[id] += g.bonus || 0;
    });

    if (!pointsMap[req.user.id]) pointsMap[req.user.id] = 0;

    const allUserIds = Object.keys(pointsMap);
    const users = await User.find({ _id: { $in: allUserIds } }).select('name');
    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u.name; });

    const sorted = Object.entries(pointsMap)
      .map(([id, points]) => ({ userId: id, name: userMap[id] || 'Unknown', points }))
      .sort((a, b) => b.points - a.points);

    let currentRank = 1;
    const ranked = sorted.map((u, i) => {
      if (i > 0 && sorted[i].points < sorted[i - 1].points) currentRank = i + 1;
      return { ...u, rank: currentRank };
    });

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

const getMyPointsHistory = async (req, res) => {
  try {
    const uid = new mongoose.Types.ObjectId(req.user.id);

    const [contributions, completedApps, completedGoals] = await Promise.all([
      Contribution.find({ volunteer: uid, status: 'verified' })
        .populate('opportunity', 'title')
        .sort({ updatedAt: -1 }),
      Application.find({ volunteer: uid, status: 'completed' })
        .populate('opportunity', 'title')
        .sort({ updatedAt: -1 }),
      Goal.find({ user: uid, status: 'completed' }).sort({ completedAt: -1 })
    ]);

    const history = [
      ...contributions.map(c => ({
        type: 'hours',
        icon: '⏱',
        label: `${c.hours} hr${c.hours !== 1 ? 's' : ''} verified — ${c.opportunity?.title || 'Opportunity'}`,
        points: Math.floor(c.hours * 10),
        date: c.updatedAt || c.createdAt
      })),
      ...completedApps.map(a => ({
        type: 'completion',
        icon: '🎖️',
        label: `Marked completed — ${a.opportunity?.title || 'Opportunity'}`,
        points: 300,
        date: a.updatedAt || a.createdAt
      })),
      ...completedGoals.map(g => ({
        type: 'goal_bonus',
        icon: '🎯',
        label: `Goal achieved — "${g.title}"`,
        points: g.bonusPoints,
        date: g.completedAt || g.updatedAt
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPointsForUser = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const data = await computePointsForUser(req.params.userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { computeBasePoints, computePointsForUser, getMyPoints, getLeaderboard, getMyPointsHistory, getPointsForUser };
