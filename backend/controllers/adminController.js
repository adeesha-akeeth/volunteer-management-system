const mongoose = require('mongoose');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const Contribution = require('../models/Contribution');
const User = require('../models/User');
const Goal = require('../models/Goal');
const UserFeedback = require('../models/UserFeedback');

const getAdminStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7); weekStart.setHours(0, 0, 0, 0);

    const pts = (agg) => Math.floor(agg[0]?.pts || 0);

    const [
      openOpps, totalOpps,
      totalUsers,
      totalApplications, pendingApplications,
      contribToday, contribWeek, contribAll,
      compToday, compWeek, compAll,
      goalToday, goalWeek, goalAll,
      verifiedContributions,
      pendingFeedbacks, totalFeedbacks
    ] = await Promise.all([
      Opportunity.countDocuments({ status: 'open' }),
      Opportunity.countDocuments(),
      User.countDocuments({ role: { $ne: 'admin' } }),
      Application.countDocuments(),
      Application.countDocuments({ status: 'pending' }),

      Contribution.aggregate([{ $match: { status: 'verified', updatedAt: { $gte: todayStart } } }, { $group: { _id: null, pts: { $sum: { $multiply: ['$hours', 10] } } } }]),
      Contribution.aggregate([{ $match: { status: 'verified', updatedAt: { $gte: weekStart } } }, { $group: { _id: null, pts: { $sum: { $multiply: ['$hours', 10] } } } }]),
      Contribution.aggregate([{ $match: { status: 'verified' } }, { $group: { _id: null, pts: { $sum: { $multiply: ['$hours', 10] } } } }]),

      Application.countDocuments({ status: 'completed', updatedAt: { $gte: todayStart } }),
      Application.countDocuments({ status: 'completed', updatedAt: { $gte: weekStart } }),
      Application.countDocuments({ status: 'completed' }),

      Goal.aggregate([{ $match: { status: 'completed', completedAt: { $gte: todayStart } } }, { $group: { _id: null, pts: { $sum: '$bonusPoints' } } }]),
      Goal.aggregate([{ $match: { status: 'completed', completedAt: { $gte: weekStart } } }, { $group: { _id: null, pts: { $sum: '$bonusPoints' } } }]),
      Goal.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, pts: { $sum: '$bonusPoints' } } }]),

      Contribution.countDocuments({ status: 'verified' }),
      UserFeedback.countDocuments({ status: 'pending' }),
      UserFeedback.countDocuments()
    ]);

    res.json({
      opportunities: { open: openOpps, total: totalOpps },
      users: totalUsers,
      applications: { total: totalApplications, pending: pendingApplications },
      contributions: { verified: verifiedContributions },
      feedbacks: { pending: pendingFeedbacks, total: totalFeedbacks },
      points: {
        today: pts(contribToday) + compToday * 300 + pts(goalToday),
        thisWeek: pts(contribWeek) + compWeek * 300 + pts(goalWeek),
        allTime: pts(contribAll) + compAll * 300 + pts(goalAll)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getAdminStats };
