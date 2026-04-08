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
  getAllContributionsForCreator
} = require('../controllers/contributionController');

router.post('/', protect, submitContribution);
router.get('/my', protect, getMyContributions);
router.get('/my-opportunities', protect, getMyApprovedOpportunities);
router.get('/my-past', protect, getMyCompletedOpportunities);
router.get('/opportunity/:opportunityId', protect, getContributionsForOpportunity);
router.get('/creator/all', protect, getAllContributionsForCreator);
router.put('/:id/status', protect, updateContributionStatus);

module.exports = router;
