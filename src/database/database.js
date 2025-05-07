const { Client } = require('pg');

// Use Railway's DATABASE_URL environment variable
const connectionString = process.env.DATABASE_URL;
const client = new Client({ connectionString });

async function connectDb() {
  try {
    await client.connect();
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS blacklisted_users (
        user_id TEXT PRIMARY KEY,
        blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS blacklisted_channels (
        channel_id TEXT PRIMARY KEY,
        blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS active_channels (
        channel_id TEXT PRIMARY KEY,
        activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Connected to PostgreSQL database');
  } catch (err) {
    console.error('Error connecting to PostgreSQL:', err.message);
  }
}
connectDb();

// Blacklist a user
async function blacklistUser(userId) {
  await client.query(
    'INSERT INTO blacklisted_users (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
    [userId]
  );
  return { success: true, userId };
}

// Whitelist a user
async function whitelistUser(userId) {
  const res = await client.query(
    'DELETE FROM blacklisted_users WHERE user_id = $1',
    [userId]
  );
  return { success: true, userId, changes: res.rowCount };
}

// Check if a user is blacklisted
async function isUserBlacklisted(userId) {
  const res = await client.query(
    'SELECT user_id FROM blacklisted_users WHERE user_id = $1',
    [userId]
  );
  return res.rowCount > 0;
}

// Blacklist a channel
async function blacklistChannel(channelId) {
  await client.query(
    'INSERT INTO blacklisted_channels (channel_id) VALUES ($1) ON CONFLICT (channel_id) DO NOTHING',
    [channelId]
  );
  return { success: true, channelId };
}

// Whitelist a channel
async function whitelistChannel(channelId) {
  const res = await client.query(
    'DELETE FROM blacklisted_channels WHERE channel_id = $1',
    [channelId]
  );
  return { success: true, channelId, changes: res.rowCount };
}

// Check if a channel is blacklisted
async function isChannelBlacklisted(channelId) {
  const res = await client.query(
    'SELECT channel_id FROM blacklisted_channels WHERE channel_id = $1',
    [channelId]
  );
  return res.rowCount > 0;
}

// Set a channel as active
async function activateChannel(channelId) {
  await client.query(
    'INSERT INTO active_channels (channel_id) VALUES ($1) ON CONFLICT (channel_id) DO NOTHING',
    [channelId]
  );
  return { success: true, channelId };
}

// Deactivate a channel
async function deactivateChannel(channelId) {
  const res = await client.query(
    'DELETE FROM active_channels WHERE channel_id = $1',
    [channelId]
  );
  return { success: true, channelId, changes: res.rowCount };
}

// Check if a channel is active
async function isChannelActive(channelId) {
  const res = await client.query(
    'SELECT channel_id FROM active_channels WHERE channel_id = $1',
    [channelId]
  );
  return res.rowCount > 0;
}

// Close database connection
async function closeDatabase() {
  await client.end();
}

module.exports = {
  client,
  blacklistUser,
  whitelistUser,
  isUserBlacklisted,
  blacklistChannel,
  whitelistChannel,
  isChannelBlacklisted,
  activateChannel,
  deactivateChannel,
  isChannelActive,
  closeDatabase
}; 