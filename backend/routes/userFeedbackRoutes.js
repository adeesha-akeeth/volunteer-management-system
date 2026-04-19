const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  createFeedback, getMyFeedbacks, updateFeedback, deleteFeedback,
  getAllFeedbacks, replyToFeedback
} = require('../controllers/userFeedbackController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `feedback-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/', protect, upload.single('image'), createFeedback);
router.get('/my', protect, getMyFeedbacks);
router.put('/:id', protect, upload.single('image'), updateFeedback);
router.delete('/:id', protect, deleteFeedback);
router.get('/admin/all', protect, getAllFeedbacks);
router.post('/:id/reply', protect, upload.single('image'), replyToFeedback);

module.exports = router;
