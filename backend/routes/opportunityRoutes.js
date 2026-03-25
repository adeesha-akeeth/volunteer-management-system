const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  getMyOpportunities,
  updateOpportunity,
  deleteOpportunity
} = require('../controllers/opportunityController');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  cb(null, true);
};

const upload = multer({ storage, fileFilter });

router.get('/', getOpportunities);
router.get('/my', protect, getMyOpportunities);
router.get('/:id', getOpportunityById);
router.post('/', protect, upload.single('bannerImage'), createOpportunity);
router.put('/:id', protect, upload.single('bannerImage'), updateOpportunity);
router.delete('/:id', protect, deleteOpportunity);

module.exports = router;