const db = require('../config/db');

// Toggle Favorite (Add if not present, remove if already present)
const toggleFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { boardingHouseId } = req.params;

    // Check if listing exists
    const bh = await db.query('SELECT id FROM boarding_houses WHERE id = $1', [boardingHouseId]);
    if (bh.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Boarding house listing not found.' });
    }

    const check = await db.query(
      'SELECT 1 FROM favorites WHERE user_id = $1 AND boarding_house_id = $2',
      [userId, boardingHouseId]
    );

    if (check.rows.length > 0) {
      // Remove favorite
      await db.query(
        'DELETE FROM favorites WHERE user_id = $1 AND boarding_house_id = $2',
        [userId, boardingHouseId]
      );
      return res.json({ success: true, is_favorite: false, message: 'Removed from favorites.' });
    } else {
      // Add favorite
      await db.query(
        'INSERT INTO favorites (user_id, boarding_house_id) VALUES ($1, $2)',
        [userId, boardingHouseId]
      );
      return res.json({ success: true, is_favorite: true, message: 'Added to favorites.' });
    }
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing favorite.' });
  }
};

// Get User's Favorites
const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(`
      SELECT 
        bh.*,
        u.full_name AS owner_name,
        u.email AS owner_email,
        (SELECT photo_url FROM listing_photos lp WHERE lp.boarding_house_id = bh.id AND lp.is_cover_photo = TRUE LIMIT 1) AS cover_photo,
        (SELECT MIN(monthly_rate) FROM rooms r WHERE r.boarding_house_id = bh.id) AS min_rate,
        (SELECT MAX(monthly_rate) FROM rooms r WHERE r.boarding_house_id = bh.id) AS max_rate,
        f.saved_at
      FROM favorites f
      JOIN boarding_houses bh ON f.boarding_house_id = bh.id
      JOIN users u ON bh.owner_id = u.id
      WHERE f.user_id = $1
      ORDER BY f.saved_at DESC;
    `, [userId]);

    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get favorites error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving favorites.' });
  }
};

// Report an Inappropriate or Inaccurate Listing
const reportListing = async (req, res) => {
  try {
    const reporterId = req.user ? req.user.id : null;
    const { boarding_house_id, reason } = req.body;

    if (!boarding_house_id || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Boarding house ID and report reason are required.',
      });
    }

    const bh = await db.query('SELECT id FROM boarding_houses WHERE id = $1', [boarding_house_id]);
    if (bh.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Listing does not exist.' });
    }

    const result = await db.query(`
      INSERT INTO listing_reports (reporter_id, boarding_house_id, reason, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *;
    `, [reporterId, boarding_house_id, reason]);

    return res.status(201).json({
      success: true,
      message: 'Report submitted. System administrators will investigate this listing.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Report listing error:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting report.' });
  }
};

// List Reports (Admin only)
const getAdminReports = async (req, res) => {
  try {
    const { status } = req.query; // pending, investigated, dismissed, action_taken
    let query = `
      SELECT 
        lr.*,
        bh.title AS listing_title,
        bh.barangay,
        bh.status AS listing_status,
        u.full_name AS reporter_name,
        u.email AS reporter_email
      FROM listing_reports lr
      JOIN boarding_houses bh ON lr.boarding_house_id = bh.id
      LEFT JOIN users u ON lr.reporter_id = u.id
    `;
    const params = [];

    if (status) {
      query += ` WHERE lr.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY lr.reported_at DESC;`;

    const result = await db.query(query, params);
    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get admin reports error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving reports.' });
  }
};

// Resolve/Update Report (Admin only)
const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_remarks } = req.body;

    if (!['pending', 'investigated', 'dismissed', 'action_taken'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid report status.' });
    }

    const result = await db.query(`
      UPDATE listing_reports
      SET status = $1, admin_remarks = $2
      WHERE id = $3
      RETURNING *;
    `, [status, admin_remarks || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    return res.json({
      success: true,
      message: 'Report updated.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update report error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating report.' });
  }
};

module.exports = {
  toggleFavorite,
  getFavorites,
  reportListing,
  getAdminReports,
  updateReportStatus,
};
