const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { toggleVote } = require('../controllers/voteController');

router.post('/', protect, toggleVote);

module.exports = router;
