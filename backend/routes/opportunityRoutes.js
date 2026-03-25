const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  updateOpportunity,
  deleteOpportunity
} = require('../controllers/opportunityController');

// Multer storage configuration for banner image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // save files to uploads folder
  },
  filename: function (req, file, cb) {
    // give each file a unique name: fieldname-timestamp.extension
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  cb(null, true); // accept all files
};

const upload = multer({ storage, fileFilter });

// Routes
router.get('/', getOpportunities);                              // GET all (public)
router.get('/:id', getOpportunityById);                        // GET one (public)
router.get('/my', protect, getMyOpportunities);
router.post('/', protect, upload.single('bannerImage'), createOpportunity);   // POST (protected)
router.put('/:id', protect, upload.single('bannerImage'), updateOpportunity); // PUT (protected)
router.delete('/:id', protect, deleteOpportunity);             // DELETE (protected)

module.exports = router;