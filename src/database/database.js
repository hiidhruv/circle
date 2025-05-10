const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useUnifiedTopology: true });
let db;

async function connectDb() {
  try {
    await client.connect();
    db = client.db();
    // Ensure indexes for uniqueness
    await db.collection('blacklisted_users').createIndex({ user_id: 1 }, { unique: true });
    await db.collection('blacklisted_channels').createIndex({ channel_id: 1 }, { unique: true });
    await db.collection('active_channels').createIndex({ channel_id: 1 }, { unique: true });
    console.log('Connected to MongoDB database');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
  }
}
connectDb();

// Blacklist a user
async function blacklistUser(userId) {
  await db.collection('blacklisted_users').updateOne(
    { user_id: userId },
    { $set: { user_id: userId, blacklisted_at: new Date() } },
    { upsert: true }
  );
  return { success: true, userId };
}

// Whitelist a user
async function whitelistUser(userId) {
  const res = await db.collection('blacklisted_users').deleteOne({ user_id: userId });
  return { success: true, userId, changes: res.deletedCount };
}

// Check if a user is blacklisted
async function isUserBlacklisted(userId) {
  const user = await db.collection('blacklisted_users').findOne({ user_id: userId });
  return !!user;
}

// Blacklist a channel
async function blacklistChannel(channelId) {
  await db.collection('blacklisted_channels').updateOne(
    { channel_id: channelId },
    { $set: { channel_id: channelId, blacklisted_at: new Date() } },
    { upsert: true }
  );
  return { success: true, channelId };
}

// Whitelist a channel
async function whitelistChannel(channelId) {
  const res = await db.collection('blacklisted_channels').deleteOne({ channel_id: channelId });
  return { success: true, channelId, changes: res.deletedCount };
}

// Check if a channel is blacklisted
async function isChannelBlacklisted(channelId) {
  const channel = await db.collection('blacklisted_channels').findOne({ channel_id: channelId });
  return !!channel;
}

// Set a channel as active
async function activateChannel(channelId) {
  await db.collection('active_channels').updateOne(
    { channel_id: channelId },
    { $set: { channel_id: channelId, activated_at: new Date() } },
    { upsert: true }
  );
  return { success: true, channelId };
}

// Deactivate a channel
async function deactivateChannel(channelId) {
  const res = await db.collection('active_channels').deleteOne({ channel_id: channelId });
  return { success: true, channelId, changes: res.deletedCount };
}

// Check if a channel is active
async function isChannelActive(channelId) {
  const channel = await db.collection('active_channels').findOne({ channel_id: channelId });
  return !!channel;
}

// Close database connection
async function closeDatabase() {
  await client.close();
}

// --- SHAPE USERNAME CONFIG ---

/**
 * Set the current shape username
 * @param {string} username
 * @returns {Promise<void>}
 */
async function setShapeUsername(username) {
  await db.collection('config').updateOne(
    { key: 'shape_username' },
    { $set: { key: 'shape_username', value: username } },
    { upsert: true }
  );
}

/**
 * Get the current shape username
 * @returns {Promise<string|null>}
 */
async function getShapeUsername() {
  const doc = await db.collection('config').findOne({ key: 'shape_username' });
  return doc ? doc.value : null;
}

/**
 * Get the list of owner IDs (excluding the main owner from env)
 * @returns {Promise<string[]>}
 */
async function getOwners() {
  const doc = await db.collection('config').findOne({ key: 'owners' });
  return doc && Array.isArray(doc.value) ? doc.value : [];
}

/**
 * Add an owner ID
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function addOwner(userId) {
  await db.collection('config').updateOne(
    { key: 'owners' },
    { $addToSet: { value: userId } },
    { upsert: true }
  );
}

/**
 * Remove an owner ID
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function removeOwner(userId) {
  await db.collection('config').updateOne(
    { key: 'owners' },
    { $pull: { value: userId } }
  );
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
  closeDatabase,
  setShapeUsername,
  getShapeUsername,
  getOwners,
  addOwner,
  removeOwner
}; 