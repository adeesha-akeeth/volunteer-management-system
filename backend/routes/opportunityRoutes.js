const {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  getMyOpportunities,
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
router.get('/', getOpportunities);
router.get('/my', protect, getMyOpportunities);  // ← must be before /:id
router.get('/:id', getOpportunityById);
router.post('/', protect, upload.single('bannerImage'), createOpportunity);
router.put('/:id', protect, upload.single('bannerImage'), updateOpportunity);
router.delete('/:id', protect, deleteOpportunity);
module.exports = router;