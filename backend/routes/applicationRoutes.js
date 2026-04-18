const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  applyToOpportunity,
  getMyApplications,
  getApplicationsForOpportunity,
  updateApplicationStatus,
  revokeAcceptedVolunteer,
  deleteApplication,
  getAllApplicationsForCreator
} = require('../controllers/applicationController');

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

router.post('/', protect, upload.single('photo'), applyToOpportunity);
router.get('/my', protect, getMyApplications);
router.get('/creator/all', protect, getAllApplicationsForCreator);
router.get('/opportunity/:opportunityId', protect, getApplicationsForOpportunity);
router.put('/:id/status', protect, updateApplicationStatus);
router.put('/:id/revoke', protect, revokeAcceptedVolunteer);
router.delete('/:id', protect, deleteApplication);

module.exports = router;