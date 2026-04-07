const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createFundraiser,
  getFundraisersForOpportunity,
  getAllFundraisers,
  completeFundraiser,
  getDonorsForFundraiser,
  updateFundraiser
} = require('../controllers/fundraiserController');

router.get('/', getAllFundraisers);                                          // Discovery list (with optional ?search=)
router.post('/', protect, createFundraiser);                                // Create fundraiser
router.get('/opportunity/:opportunityId', getFundraisersForOpportunity);    // All fundraisers for an opportunity
router.get('/:id/donors', getDonorsForFundraiser);                          // Ranked donors for a fundraiser
router.put('/:id', protect, updateFundraiser);                              // Edit name/target
router.put('/:id/complete', protect, completeFundraiser);                   // Mark completed

module.exports = router;
