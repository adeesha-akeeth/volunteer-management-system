const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { getComments, addComment, deleteComment } = require('../controllers/commentController');

router.get('/opportunity/:opportunityId', optionalProtect, getComments);
router.post('/', protect, addComment);
router.delete('/:id', protect, deleteComment);

module.exports = router;
