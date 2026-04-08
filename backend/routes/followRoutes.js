const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { toggleFollow, getMyFollowing, findPublishers } = require('../controllers/followController');

// Static routes must come before dynamic /:publisherId
router.get('/mine', protect, getMyFollowing);
router.get('/publishers', protect, findPublishers);
router.post('/:publisherId', protect, toggleFollow);

module.exports = router;
