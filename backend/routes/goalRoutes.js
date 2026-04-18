const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createGoal, getMyGoals, updateGoal, deleteGoal } = require('../controllers/goalController');

router.post('/', protect, createGoal);
router.get('/my', protect, getMyGoals);
router.put('/:id', protect, updateGoal);
router.delete('/:id', protect, deleteGoal);

module.exports = router;
