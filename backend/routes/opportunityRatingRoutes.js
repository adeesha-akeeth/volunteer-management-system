const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { rateOpportunity, deleteOpportunityRating, getOpportunityRating } = require('../controllers/opportunityRatingController');

router.get('/:opportunityId', optionalProtect, getOpportunityRating);
router.post('/:opportunityId', protect, rateOpportunity);
router.delete('/:opportunityId', protect, deleteOpportunityRating);

module.exports = router;
