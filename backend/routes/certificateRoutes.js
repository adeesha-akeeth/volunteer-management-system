const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  issueCertificate,
  getMyCertificates,
  getAllCertificates,
  getCertificateById,
  revokeCertificate,
  deleteCertificate
} = require('../controllers/certificateController');

// Multer storage configuration for org logo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// File filter - images only
const fileFilter = (req, file, cb) => {
  console.log('File mimetype:', file.mimetype);
  console.log('File originalname:', file.originalname);
  // Accept all image types
  if (file.mimetype.startsWith('image/')) {
    return cb(null, true);
  } else {
    cb(new Error('Images only!'));
  }
};

const upload = multer({ storage, fileFilter });

// Routes
router.post('/', protect, upload.single('orgLogo'), issueCertificate);      // Issue certificate
router.get('/my', protect, getMyCertificates);                               // Get my certificates
router.get('/all', protect, getAllCertificates);                             // Get all certificates (admin)
router.get('/:id', protect, getCertificateById);                            // Get single certificate
router.put('/:id/revoke', protect, revokeCertificate);                      // Revoke certificate
router.delete('/:id', protect, deleteCertificate);                          // Delete certificate

module.exports = router;