const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `contribution-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Static routes first
router.post('/', protect, upload.single('proofImage'), submitContribution);
router.get('/my', protect, getMyContributions);
router.get('/my-opportunities', protect, getMyApprovedOpportunities);
router.get('/my-past', protect, getMyCompletedOpportunities);
router.get('/creator/all', protect, getAllContributionsForCreator);
router.get('/opportunity/:opportunityId', protect, getContributionsForOpportunity);

// Volunteer edit/delete own pending contribution
router.put('/my/:id', protect, upload.single('proofImage'), updateMyContribution);
router.delete('/my/:id', protect, deleteMyContribution);

// Creator verify/reject
router.put('/:id/status', protect, updateContributionStatus);

module.exports = router;
