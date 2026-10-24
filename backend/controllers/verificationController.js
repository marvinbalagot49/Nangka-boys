const db = require('../config/db');

// Submit verification application (Owner)
const submitVerification = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { notes } = req.body;

    if (!req.files || !req.files['valid_id']) {
      return res.status(400).json({ success: false, message: 'Valid Government ID is required for verification.' });
    }

    const validIdUrl = `/uploads/documents/${req.files['valid_id'][0].filename}`;
    const proofUrl = req.files['proof_document']
      ? `/uploads/documents/${req.files['proof_document'][0].filename}`
      : null;

    // Check if there is already a pending or approved application
    const existing = await db.query(
      `SELECT * FROM owner_verifications WHERE owner_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
      [ownerId]
    );

    if (existing.rows.length > 0 && existing.rows[0].status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending verification application under review.'
      });
    }

    if (existing.rows.length > 0 && existing.rows[0].status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Your account is already verified.'
      });
    }

    const result = await db.query(
      `INSERT INTO owner_verifications (owner_id, valid_id_url, business_permit_or_proof_url, notes, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [ownerId, validIdUrl, proofUrl, notes || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Verification submitted successfully. An administrator will review your application.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Submit verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting verification.' });
  }
};

// Check verification status (Owner)
const getMyVerificationStatus = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const result = await db.query(
      `SELECT * FROM owner_verifications WHERE owner_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
      [ownerId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: { status: 'not_submitted', message: 'No verification application submitted yet.' },
      });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Check verification status error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving status.' });
  }
};

// List all verifications (Admin)
const listVerifications = async (req, res) => {
  try {
    const { status } = req.query; // pending, approved, rejected
    let query = `
      SELECT v.*, u.full_name AS owner_name, u.email AS owner_email, u.phone_number AS owner_phone
      FROM owner_verifications v
      JOIN users u ON v.owner_id = u.id
    `;
    const params = [];

    if (status) {
      query += ` WHERE v.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY v.submitted_at DESC`;

    const result = await db.query(query, params);
    return res.json({ success: true, count: result.rows.length, data: result.rows[0] ? result.rows : [] });
  } catch (error) {
    console.error('List verifications error:', error);
    return res.status(500).json({ success: false, message: 'Server error listing verifications.' });
  }
};

// Review verification - Approve or Reject (Admin)
const reviewVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const adminId = req.user.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be either 'approved' or 'rejected'." });
    }

    if (status === 'rejected' && (!rejection_reason || rejection_reason.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required when rejecting an owner.' });
    }

    const verification = await db.query('SELECT * FROM owner_verifications WHERE id = $1', [id]);
    if (verification.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Verification application not found.' });
    }

    const targetVerification = verification.rows[0];

    const result = await db.query(
      `UPDATE owner_verifications 
       SET status = $1, rejection_reason = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, status === 'rejected' ? rejection_reason : null, adminId, id]
    );

    // If approved, make sure the user's role is set to owner
    if (status === 'approved') {
      await db.query(`UPDATE users SET role = 'owner' WHERE id = $1`, [targetVerification.owner_id]);
    }

    return res.json({
      success: true,
      message: `Owner application has been ${status}.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Review verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing review.' });
  }
};

module.exports = {
  submitVerification,
  getMyVerificationStatus,
  listVerifications,
  reviewVerification,
};
