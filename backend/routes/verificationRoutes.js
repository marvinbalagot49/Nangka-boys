const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  submitVerification,
  getMyVerificationStatus,
  listVerifications,
  reviewVerification,
} = require('../controllers/verificationController');

// Owner routes
router.post(
  '/verify',
  authenticateToken,
  authorizeRoles('owner', 'user'),
  upload.fields([
    { name: 'valid_id', maxCount: 1 },
    { name: 'proof_document', maxCount: 1 },
  ]),
  submitVerification
);

router.get(
  '/verification-status',
  authenticateToken,
  getMyVerificationStatus
);

// Admin routes
router.get(
  '/admin/verifications',
  authenticateToken,
  authorizeRoles('admin'),
  listVerifications
);

router.patch(
  '/admin/verifications/:id',
  authenticateToken,
  authorizeRoles('admin'),
  reviewVerification
);

module.exports = router;
