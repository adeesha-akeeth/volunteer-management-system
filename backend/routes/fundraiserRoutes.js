const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createFundraiser,
  getFundraisersForOpportunity,
  getAllFundraisers,
  getMyFundraisers,
  getFundraiserById,
  completeFundraiser,
  stopFundraiser,
  getDonorsForFundraiser,
  updateFundraiser,
  deleteFundraiser
} = require('../controllers/fundraiserController');

router.get('/', getAllFundraisers);                                          // Discovery list (with optional ?search=)
router.post('/', protect, createFundraiser);                                // Create fundraiser
router.get('/my', protect, getMyFundraisers);                               // My fundraisers (MUST be before /:id)
router.get('/opportunity/:opportunityId', getFundraisersForOpportunity);    // All fundraisers for an opportunity
router.get('/:id/donors', getDonorsForFundraiser);                          // Ranked donors for a fundraiser
router.get('/:id', getFundraiserById);                                      // Single fundraiser by id
router.put('/:id', protect, updateFundraiser);                              // Edit name/target/description
router.put('/:id/complete', protect, completeFundraiser);                   // Mark completed
router.put('/:id/stop', protect, stopFundraiser);                           // Stop fundraiser
router.delete('/:id', protect, deleteFundraiser);                           // Delete fundraiser

module.exports = router;
