const db = require('../config/db');

// GET /api/admin/stats
const getSystemStats = async (req, res) => {
  try {
    const totalUsers = await db.query("SELECT COUNT(*) FROM users WHERE role = 'user'");
    const totalOwners = await db.query("SELECT COUNT(*) FROM users WHERE role = 'owner'");
    const pendingVerifications = await db.query("SELECT COUNT(*) FROM owner_verifications WHERE status = 'pending'");
    const totalListings = await db.query("SELECT COUNT(*) FROM boarding_houses");
    const publishedListings = await db.query("SELECT COUNT(*) FROM boarding_houses WHERE status = 'published'");
    const pendingListings = await db.query("SELECT COUNT(*) FROM boarding_houses WHERE status = 'pending_approval'");
    const pendingReports = await db.query("SELECT COUNT(*) FROM listing_reports WHERE status = 'pending'");

    return res.json({
      success: true,
      data: {
        users_count: parseInt(totalUsers.rows[0].count, 10),
        owners_count: parseInt(totalOwners.rows[0].count, 10),
        pending_verifications_count: parseInt(pendingVerifications.rows[0].count, 10),
        total_listings_count: parseInt(totalListings.rows[0].count, 10),
        published_listings_count: parseInt(publishedListings.rows[0].count, 10),
        pending_listings_count: parseInt(pendingListings.rows[0].count, 10),
        pending_reports_count: parseInt(pendingReports.rows[0].count, 10),
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving statistics.' });
  }
};

// GET /api/admin/listings (Admin can see all listings, regardless of status)
const getAllListingsForAdmin = async (req, res) => {
  try {
    const { status } = req.query; // pending_approval, published, rejected, archived
    let query = `
      SELECT 
        bh.*,
        u.full_name AS owner_name,
        u.email AS owner_email,
        u.phone_number AS owner_phone
      FROM boarding_houses bh
      JOIN users u ON bh.owner_id = u.id
    `;
    const params = [];

    if (status) {
      query += ` WHERE bh.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY bh.created_at DESC;`;

    const result = await db.query(query, params);
    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Admin listings error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving admin listings.' });
  }
};

// PATCH /api/admin/listings/:id/status (Approve or Reject listing)
const updateListingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_review_notes } = req.body;

    if (!['published', 'rejected', 'archived', 'pending_approval'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid listing status.' });
    }

    const result = await db.query(`
      UPDATE boarding_houses
      SET status = $1, admin_review_notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `, [status, admin_review_notes || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Boarding house not found.' });
    }

    return res.json({
      success: true,
      message: `Listing status updated to ${status}.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update listing status error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating listing.' });
  }
};

module.exports = {
  getSystemStats,
  getAllListingsForAdmin,
  updateListingStatus,
};
