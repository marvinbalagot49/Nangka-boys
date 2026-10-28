const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getSystemStats,
  getAllListingsForAdmin,
  updateListingStatus,
} = require('../controllers/adminController');

router.get('/stats', authenticateToken, authorizeRoles('admin'), getSystemStats);
router.get('/listings', authenticateToken, authorizeRoles('admin'), getAllListingsForAdmin);
router.patch('/listings/:id/status', authenticateToken, authorizeRoles('admin'), updateListingStatus);

module.exports = router;
