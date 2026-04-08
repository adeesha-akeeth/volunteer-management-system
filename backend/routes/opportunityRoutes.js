const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  getMyOpportunities,
  updateOpportunity,
  deleteOpportunity,
  updateOpportunityStatus
} = require('../controllers/opportunityController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/', optionalProtect, getOpportunities);
router.get('/my', protect, getMyOpportunities);
router.get('/:id', optionalProtect, getOpportunityById);
router.post('/', protect, upload.single('bannerImage'), createOpportunity);
router.put('/:id', protect, upload.single('bannerImage'), updateOpportunity);
router.patch('/:id/status', protect, updateOpportunityStatus);
router.delete('/:id', protect, deleteOpportunity);

module.exports = router;
