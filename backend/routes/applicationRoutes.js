const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  applyToOpportunity,
  getApplicationsForOpportunity,
  getMyApplications,
  updateApplicationStatus,
  deleteApplication
} = require('../controllers/applicationController');

// Multer storage configuration for resume uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// File filter - allow images and PDFs (for resumes)
const fileFilter = (req, file, cb) => {
  cb(null, true); // accept all files
};

const upload = multer({ storage, fileFilter });

// Routes
router.post('/', protect, upload.single('resumeFile'), applyToOpportunity);                           // Apply to opportunity
router.get('/my', protect, getMyApplications);                                                         // Get my applications
router.get('/opportunity/:opportunityId', protect, getApplicationsForOpportunity);                     // Get all applications for an opportunity
router.put('/:id/status', protect, updateApplicationStatus);                                           // Approve or reject
router.delete('/:id', protect, deleteApplication);                                                     // Withdraw application

module.exports = router;