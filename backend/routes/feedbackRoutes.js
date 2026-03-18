const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  createFeedback,
  getFeedbackForOpportunity,
  getMyFeedback,
  updateFeedback,
  deleteFeedback
} = require('../controllers/feedbackController');

// Multer storage configuration for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// File filter - images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Images only!'));
  }
};

const upload = multer({ storage, fileFilter });

// Routes
router.post('/', protect, upload.single('photo'), createFeedback);                        // Create feedback
router.get('/my', protect, getMyFeedback);                                                // Get my feedback
router.get('/opportunity/:opportunityId', getFeedbackForOpportunity);                     // Get feedback for opportunity (public)
router.put('/:id', protect, upload.single('photo'), updateFeedback);                     // Update feedback
router.delete('/:id', protect, deleteFeedback);                                          // Delete feedback

module.exports = router;