const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { getComments, addComment, editComment, deleteComment } = require('../controllers/commentController');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/opportunity/:opportunityId', optionalProtect, getComments);
router.post('/', protect, upload.single('photo'), addComment);
router.put('/:id', protect, upload.single('photo'), editComment);
router.delete('/:id', protect, deleteComment);

module.exports = router;
