const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMyPoints, getLeaderboard } = require('../controllers/pointsController');

router.get('/me', protect, getMyPoints);
router.get('/leaderboard', protect, getLeaderboard);

module.exports = router;
