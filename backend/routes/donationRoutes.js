const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  createDonation,
  getMyDonations,
  getAllDonations,
  updateDonationStatus,
  deleteDonation
} = require('../controllers/donationController');

// Multer storage configuration for receipt image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// File filter - images and PDFs allowed for receipts
const fileFilter = (req, file, cb) => {
  cb(null, true); // accept all files
};

const upload = multer({ storage, fileFilter });

// Routes
router.post('/', protect, upload.single('receiptImage'), createDonation);   // Create donation
router.get('/my', protect, getMyDonations);                                  // Get my donations
router.get('/all', protect, getAllDonations);                                 // Get all donations (admin)
router.put('/:id/status', protect, updateDonationStatus);                   // Confirm or reject
router.delete('/:id', protect, deleteDonation);                             // Delete donation

module.exports = router;