const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { migrateAndSeed } = require('./src/db/initDb');
const authRoutes = require('./src/routes/authRoutes');
const verificationRoutes = require('./src/routes/verificationRoutes');
const listingRoutes = require('./src/routes/listingRoutes');
const userInteractionRoutes = require('./src/routes/userInteractionRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads directory (for documents & boarding house photos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Dapitan City Boarding House Finder API is operational',
    schema: process.env.DB_SCHEMA || 'dapitan_schema',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api', listingRoutes);
app.use('/api', userInteractionRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Bootstrap Server & DB
const startServer = async () => {
  try {
    await migrateAndSeed();

    app.listen(PORT, () => {
      console.log(`🚀 Dapitan Boarding House API running on http://localhost:${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Fatal initialization error:', error.message);
  }
};

startServer();
