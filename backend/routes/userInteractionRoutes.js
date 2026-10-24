const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  toggleFavorite,
  getFavorites,
  reportListing,
  getAdminReports,
  updateReportStatus,
} = require('../controllers/userInteractionController');

// Favorites (Authenticated User)
router.post('/favorites/:boardingHouseId', authenticateToken, toggleFavorite);
router.get('/favorites', authenticateToken, getFavorites);

// Reports (Public or Authenticated)
router.post('/reports', authenticateToken, reportListing);

// Admin Moderation on Reports
router.get('/admin/reports', authenticateToken, authorizeRoles('admin'), getAdminReports);
router.patch('/admin/reports/:id', authenticateToken, authorizeRoles('admin'), updateReportStatus);

module.exports = router;
