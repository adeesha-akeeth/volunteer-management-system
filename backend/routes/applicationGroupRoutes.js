const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getGroupsForOpportunity, createGroup, updateGroup, deleteGroup,
  assignToGroup, removeFromGroup, acceptAllInGroup, rejectAllInGroup
} = require('../controllers/applicationGroupController');

router.get('/opportunity/:opportunityId', protect, getGroupsForOpportunity);
router.post('/', protect, createGroup);
router.put('/:id', protect, updateGroup);
router.delete('/:id', protect, deleteGroup);
router.post('/:id/assign', protect, assignToGroup);
router.delete('/:id/remove/:applicationId', protect, removeFromGroup);
router.post('/:id/accept-all', protect, acceptAllInGroup);
router.post('/:id/reject-all', protect, rejectAllInGroup);

module.exports = router;
