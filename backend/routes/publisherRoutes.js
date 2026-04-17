const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const {
  getPublisherProfile,
  ratePublisher,
  deletePublisherRating,
  getPublisherReviews,
  addPublisherReview,
  editPublisherReview,
  deletePublisherReview
} = require('../controllers/publisherController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Static sub-routes first to avoid conflicts with /:id
router.put('/reviews/:reviewId', protect, upload.single('photo'), editPublisherReview);
router.delete('/reviews/:reviewId', protect, deletePublisherReview);

// Dynamic publisher routes
router.get('/:id', optionalProtect, getPublisherProfile);
router.post('/:id/rate', protect, ratePublisher);
router.delete('/:id/rate', protect, deletePublisherRating);
router.get('/:id/reviews', optionalProtect, getPublisherReviews);
router.post('/:id/reviews', protect, upload.single('photo'), addPublisherReview);

module.exports = router;
