const { Pool } = require('pg');
require('dotenv').config();

const schema = process.env.DB_SCHEMA || 'dapitan_schema';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'dapitan_boarding_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Automatically set the search_path to our custom schema for every new client connection
pool.on('connect', (client) => {
  client.query(`SET search_path TO "${schema}", public`);
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  schema,
};
