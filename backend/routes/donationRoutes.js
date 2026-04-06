const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  createDonation,
  getMyDonations,
  getDonationsByOpportunity,
  updateDonationStatus,
  updateDonation,
  deleteDonation
} = require('../controllers/donationController');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

router.post('/', protect, upload.single('receiptImage'), createDonation);
router.get('/my', protect, getMyDonations);
router.get('/opportunity/:opportunityId', protect, getDonationsByOpportunity);
router.put('/:id/status', protect, updateDonationStatus);
router.put('/:id', protect, upload.single('receiptImage'), updateDonation);
router.delete('/:id', protect, deleteDonation);

module.exports = router;
