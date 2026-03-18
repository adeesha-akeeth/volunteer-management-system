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
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
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