const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
}

const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function connectDb() {
  try {
    // Initialize schema and tables if they do not exist
    await pool.query(`
      create table if not exists blacklisted_users (
        user_id text primary key,
        blacklisted_at timestamptz default now()
      );
      create table if not exists blacklisted_channels (
        channel_id text primary key,
        blacklisted_at timestamptz default now()
      );
      create table if not exists active_channels (
        channel_id text primary key,
        activated_at timestamptz default now()
      );
      create table if not exists config (
        key text primary key,
        value jsonb
      );
      create table if not exists user_stats (
        user_id text primary key,
        message_count integer default 0,
        first_message_at timestamptz default now(),
        last_message_at timestamptz default now()
      );
      create table if not exists user_auth_tokens (
        user_id text primary key,
        auth_token text not null,
        app_id text not null,
        authenticated_at timestamptz default now(),
        last_used_at timestamptz default now()
      );
    `);
    console.log('Connected to Neon (Postgres)');
  } catch (err) {
    console.error('Error connecting to Postgres:', err.message);
  }
}
connectDb();

// Blacklist a user
async function blacklistUser(userId) {
  await pool.query(
    `insert into blacklisted_users (user_id) values ($1)
     on conflict (user_id) do update set blacklisted_at = excluded.blacklisted_at`,
    [userId]
  );
  return { success: true, userId };
}

// Whitelist a user
async function whitelistUser(userId) {
  const res = await pool.query('delete from blacklisted_users where user_id = $1', [userId]);
  return { success: true, userId, changes: res.rowCount };
}

// Check if a user is blacklisted
async function isUserBlacklisted(userId) {
  const { rows } = await pool.query('select 1 from blacklisted_users where user_id = $1 limit 1', [userId]);
  return rows.length > 0;
}

// Blacklist a channel
async function blacklistChannel(channelId) {
  await pool.query(
    `insert into blacklisted_channels (channel_id) values ($1)
     on conflict (channel_id) do update set blacklisted_at = excluded.blacklisted_at`,
    [channelId]
  );
  return { success: true, channelId };
}

// Whitelist a channel
async function whitelistChannel(channelId) {
  const res = await pool.query('delete from blacklisted_channels where channel_id = $1', [channelId]);
  return { success: true, channelId, changes: res.rowCount };
}

// Check if a channel is blacklisted
async function isChannelBlacklisted(channelId) {
  const { rows } = await pool.query('select 1 from blacklisted_channels where channel_id = $1 limit 1', [channelId]);
  return rows.length > 0;
}

// Set a channel as active
async function activateChannel(channelId) {
  await pool.query(
    `insert into active_channels (channel_id) values ($1)
     on conflict (channel_id) do update set activated_at = excluded.activated_at`,
    [channelId]
  );
  return { success: true, channelId };
}

// Deactivate a channel
async function deactivateChannel(channelId) {
  const res = await pool.query('delete from active_channels where channel_id = $1', [channelId]);
  return { success: true, channelId, changes: res.rowCount };
}

// Check if a channel is active
async function isChannelActive(channelId) {
  const { rows } = await pool.query('select 1 from active_channels where channel_id = $1 limit 1', [channelId]);
  return rows.length > 0;
}

// Close database connection
async function closeDatabase() {
  await pool.end();
}

// --- SHAPE USERNAME CONFIG ---

/**
 * (Removed) Shape username configuration – model is hardlocked
 */

/**
 * Get the current shape username
 * @returns {Promise<string|null>}
 */
async function getShapeUsername() { return null; }

/**
 * Get the list of owner IDs (excluding the main owner from env)
 * @returns {Promise<string[]>}
 */
async function getOwners() {
  const { rows } = await pool.query('select value from config where key = $1', ['owners']);
  if (rows.length === 0) return [];
  const value = rows[0].value;
  return Array.isArray(value) ? value : [];
}

/**
 * Add an owner ID
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function addOwner(userId) {
  const owners = await getOwners();
  if (!owners.includes(userId)) owners.push(userId);
  await pool.query(
    `insert into config (key, value) values ($1, $2)
     on conflict (key) do update set value = excluded.value`,
    ['owners', JSON.stringify(owners)]
  );
}

/**
 * Remove an owner ID
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function removeOwner(userId) {
  const owners = await getOwners();
  const next = owners.filter(o => o !== userId);
  await pool.query(
    `insert into config (key, value) values ($1, $2)
     on conflict (key) do update set value = excluded.value`,
    ['owners', JSON.stringify(next)]
  );
}

/**
 * (Removed) Per-channel shape config – not applicable with hardlocked model
 */

// --- USER STATS & MESSAGE COUNTING ---

/**
 * Get user message count
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function getUserMessageCount(userId) {
  const { rows } = await pool.query('select message_count from user_stats where user_id = $1', [userId]);
  return rows.length > 0 ? rows[0].message_count : 0;
}

/**
 * Increment user message count
 * @param {string} userId
 * @returns {Promise<number>} New message count
 */
async function incrementUserMessageCount(userId) {
  const { rows } = await pool.query(
    `insert into user_stats (user_id, message_count, last_message_at) 
     values ($1, 1, now()) 
     on conflict (user_id) 
     do update set message_count = user_stats.message_count + 1, last_message_at = now()
     returning message_count`,
    [userId]
  );
  return rows[0].message_count;
}

/**
 * Reset user message count (for testing)
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function resetUserMessageCount(userId) {
  await pool.query('delete from user_stats where user_id = $1', [userId]);
}

// --- USER AUTHENTICATION TOKENS ---

/**
 * Store user authentication token
 * @param {string} userId
 * @param {string} authToken
 * @param {string} appId
 * @returns {Promise<void>}
 */
async function storeUserAuthToken(userId, authToken, appId) {
  await pool.query(
    `insert into user_auth_tokens (user_id, auth_token, app_id, last_used_at) 
     values ($1, $2, $3, now()) 
     on conflict (user_id) 
     do update set auth_token = excluded.auth_token, app_id = excluded.app_id, last_used_at = now()`,
    [userId, authToken, appId]
  );
}

/**
 * Get user authentication token
 * @param {string} userId
 * @returns {Promise<string|null>}
 */
async function getUserAuthToken(userId) {
  const { rows } = await pool.query('select auth_token from user_auth_tokens where user_id = $1', [userId]);
  return rows.length > 0 ? rows[0].auth_token : null;
}

/**
 * Check if user is authenticated
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function isUserAuthenticated(userId) {
  const { rows } = await pool.query('select 1 from user_auth_tokens where user_id = $1 limit 1', [userId]);
  return rows.length > 0;
}

/**
 * Update last used timestamp for auth token
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function updateAuthTokenLastUsed(userId) {
  await pool.query('update user_auth_tokens set last_used_at = now() where user_id = $1', [userId]);
}

/**
 * Remove user authentication token
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function revokeUserAuthToken(userId) {
  await pool.query('delete from user_auth_tokens where user_id = $1', [userId]);
}

/**
 * Get user auth info (token + app_id)
 * @param {string} userId
 * @returns {Promise<{authToken: string, appId: string}|null>}
 */
async function getUserAuthInfo(userId) {
  const { rows } = await pool.query(
    'select auth_token, app_id from user_auth_tokens where user_id = $1', 
    [userId]
  );
  return rows.length > 0 ? { authToken: rows[0].auth_token, appId: rows[0].app_id } : null;
}

module.exports = {
  client: pool,
  blacklistUser,
  whitelistUser,
  isUserBlacklisted,
  blacklistChannel,
  whitelistChannel,
  isChannelBlacklisted,
  activateChannel,
  deactivateChannel,
  isChannelActive,
  closeDatabase,
  getShapeUsername,
  getOwners,
  addOwner,
  removeOwner,
  // User stats & message counting
  getUserMessageCount,
  incrementUserMessageCount,
  resetUserMessageCount,
  // User authentication tokens
  storeUserAuthToken,
  getUserAuthToken,
  isUserAuthenticated,
  updateAuthTokenLastUsed,
  revokeUserAuthToken,
  getUserAuthInfo
}; 