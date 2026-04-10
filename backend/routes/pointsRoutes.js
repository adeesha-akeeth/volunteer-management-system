const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMyPoints, getLeaderboard, getMyPointsHistory, getPointsForUser } = require('../controllers/pointsController');

router.get('/me', protect, getMyPoints);
router.get('/leaderboard', protect, getLeaderboard);
router.get('/history', protect, getMyPointsHistory);
router.get('/user/:userId', getPointsForUser); // public — no auth needed

module.exports = router;
