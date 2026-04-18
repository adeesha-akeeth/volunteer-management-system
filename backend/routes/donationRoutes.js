const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  createDonation,
  getMyDonations,
  getDonationsByFundraiser,
  updateDonationStatus,
  updateDonation,
  deleteDonation,
  getMyFundraiserPending
} = require('../controllers/donationController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.post('/', protect, upload.single('receiptImage'), createDonation);
router.get('/my', protect, getMyDonations);
router.get('/my-fundraiser-pending', protect, getMyFundraiserPending);
router.get('/fundraiser/:fundraiserId', protect, getDonationsByFundraiser);
router.put('/:id/status', protect, updateDonationStatus);
router.put('/:id', protect, upload.single('receiptImage'), updateDonation);
router.delete('/:id', protect, deleteDonation);

module.exports = router;
