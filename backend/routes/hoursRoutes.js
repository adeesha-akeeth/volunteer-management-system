const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  logHours,
  getMyHours,
  getHoursForOpportunity,
  updateHoursStatus,
  deleteHours
} = require('../controllers/hoursController');

// Multer storage configuration for proof image uploads
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
  cb(null, true); // accept all files
};

const upload = multer({ storage, fileFilter });

// Routes
router.post('/', protect, upload.single('proofImage'), logHours);                        // Log hours
router.get('/my', protect, getMyHours);                                                   // Get my hours
router.get('/opportunity/:opportunityId', protect, getHoursForOpportunity);               // Get hours for opportunity
router.put('/:id/status', protect, updateHoursStatus);                                   // Verify or reject
router.delete('/:id', protect, deleteHours);                                             // Delete hours record

module.exports = router;