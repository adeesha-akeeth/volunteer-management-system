const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createFeedback, getMyFeedbacks, updateFeedback, deleteFeedback,
  getAllFeedbacks, replyToFeedback
} = require('../controllers/userFeedbackController');

router.post('/', protect, createFeedback);
router.get('/my', protect, getMyFeedbacks);
router.put('/:id', protect, updateFeedback);
router.delete('/:id', protect, deleteFeedback);
router.get('/admin/all', protect, getAllFeedbacks);
router.post('/:id/reply', protect, replyToFeedback);

module.exports = router;
