const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const {
  createFavouriteList,
  getMyFavouriteLists,
  updateFavouriteList,
  deleteFavouriteList,
  addOpportunityToList,
  removeOpportunityFromList
} = require('../controllers/favouriteController');

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage, fileFilter: (req, file, cb) => cb(null, true) });

router.get('/', protect, getMyFavouriteLists);
router.post('/', protect, upload.single('photo'), createFavouriteList);
router.put('/:id', protect, upload.single('photo'), updateFavouriteList);
router.delete('/:id', protect, deleteFavouriteList);
router.post('/:id/add', protect, addOpportunityToList);
router.delete('/:id/remove/:opportunityId', protect, removeOpportunityFromList);

module.exports = router;