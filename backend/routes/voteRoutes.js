const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { toggleVote, getMyActivity } = require('../controllers/voteController');

router.post('/', protect, toggleVote);
router.get('/my-activity', protect, getMyActivity);

module.exports = router;
