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
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true); // accept file
  } else {
    cb(new Error('Images only!')); // reject file
  }
};

const upload = multer({ storage, fileFilter });

// Routes
router.get('/', getOpportunities);                              // GET all (public)
router.get('/:id', getOpportunityById);                        // GET one (public)
router.post('/', protect, upload.single('bannerImage'), createOpportunity);   // POST (protected)
router.put('/:id', protect, upload.single('bannerImage'), updateOpportunity); // PUT (protected)
router.delete('/:id', protect, deleteOpportunity);             // DELETE (protected)

module.exports = router;