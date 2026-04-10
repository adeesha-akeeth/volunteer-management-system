const mongoose = require('mongoose');
const OpportunityRating = require('../models/OpportunityRating');

const toOid = (id) => mongoose.Types.ObjectId.createFromHexString(id);

const rateOpportunity = async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });

    await OpportunityRating.findOneAndUpdate(
      { rater: req.user.id, opportunity: opportunityId },
      { rating },
      { upsert: true, new: true }
    );

    const agg = await OpportunityRating.aggregate([
      { $match: { opportunity: toOid(opportunityId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    res.json({
      averageRating: agg[0] ? parseFloat(agg[0].avg.toFixed(1)) : 0,
      ratingCount: agg[0]?.count || 0,
      userRating: Number(rating)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteOpportunityRating = async (req, res) => {
  try {
    const { opportunityId } = req.params;
    await OpportunityRating.deleteOne({ rater: req.user.id, opportunity: opportunityId });

    const agg = await OpportunityRating.aggregate([
      { $match: { opportunity: toOid(opportunityId) } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    res.json({
      averageRating: agg[0] ? parseFloat(agg[0].avg.toFixed(1)) : 0,
      ratingCount: agg[0]?.count || 0,
      userRating: null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getOpportunityRating = async (req, res) => {
  try {
    const { opportunityId } = req.params;

    const [agg, userRating] = await Promise.all([
      OpportunityRating.aggregate([
        { $match: { opportunity: toOid(opportunityId) } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]),
      req.user ? OpportunityRating.findOne({ rater: req.user.id, opportunity: opportunityId }) : Promise.resolve(null)
    ]);

    res.json({
      averageRating: agg[0] ? parseFloat(agg[0].avg.toFixed(1)) : 0,
      ratingCount: agg[0]?.count || 0,
      userRating: userRating?.rating || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { rateOpportunity, deleteOpportunityRating, getOpportunityRating };
