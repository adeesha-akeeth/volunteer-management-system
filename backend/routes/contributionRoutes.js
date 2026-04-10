const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  submitContribution,
  getMyContributions,
  getMyApprovedOpportunities,
  getMyCompletedOpportunities,
  getContributionsForOpportunity,
  updateContributionStatus,
  getAllContributionsForCreator,
  updateMyContribution,
  deleteMyContribution
} = require('../controllers/contributionController');

// Static routes first
router.post('/', protect, submitContribution);
router.get('/my', protect, getMyContributions);
router.get('/my-opportunities', protect, getMyApprovedOpportunities);
router.get('/my-past', protect, getMyCompletedOpportunities);
router.get('/creator/all', protect, getAllContributionsForCreator);
router.get('/opportunity/:opportunityId', protect, getContributionsForOpportunity);

// Volunteer edit/delete own pending contribution
router.put('/my/:id', protect, updateMyContribution);
router.delete('/my/:id', protect, deleteMyContribution);

// Creator verify/reject
router.put('/:id/status', protect, updateContributionStatus);

module.exports = router;
