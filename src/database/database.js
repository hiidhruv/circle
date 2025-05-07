const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create and initialize the database
const dbPath = path.join(__dirname, '../../data/tenshi.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    // Initialize database tables
    initDb();
  }
});

// Initialize database tables
function initDb() {
  db.serialize(() => {
    // Create blacklisted users table
    db.run(`CREATE TABLE IF NOT EXISTS blacklisted_users (
      user_id TEXT PRIMARY KEY,
      blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create blacklisted channels table
    db.run(`CREATE TABLE IF NOT EXISTS blacklisted_channels (
      channel_id TEXT PRIMARY KEY,
      blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create active channels table (for /activate command)
    db.run(`CREATE TABLE IF NOT EXISTS active_channels (
      channel_id TEXT PRIMARY KEY,
      activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

// Blacklist a user
function blacklistUser(userId) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO blacklisted_users (user_id) VALUES (?)');
    stmt.run(userId, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ success: true, userId });
      }
    });
    stmt.finalize();
  });
}

// Whitelist a user
function whitelistUser(userId) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('DELETE FROM blacklisted_users WHERE user_id = ?');
    stmt.run(userId, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ success: true, userId, changes: this.changes });
      }
    });
    stmt.finalize();
  });
}

// Check if a user is blacklisted
function isUserBlacklisted(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT user_id FROM blacklisted_users WHERE user_id = ?', [userId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

// Blacklist a channel
function blacklistChannel(channelId) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO blacklisted_channels (channel_id) VALUES (?)');
    stmt.run(channelId, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ success: true, channelId });
      }
    });
    stmt.finalize();
  });
}

// Whitelist a channel
function whitelistChannel(channelId) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('DELETE FROM blacklisted_channels WHERE channel_id = ?');
    stmt.run(channelId, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ success: true, channelId, changes: this.changes });
      }
    });
    stmt.finalize();
  });
}

// Check if a channel is blacklisted
function isChannelBlacklisted(channelId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT channel_id FROM blacklisted_channels WHERE channel_id = ?', [channelId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

// Set a channel as active
function activateChannel(channelId) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO active_channels (channel_id) VALUES (?)');
    stmt.run(channelId, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ success: true, channelId });
      }
    });
    stmt.finalize();
  });
}

// Deactivate a channel
function deactivateChannel(channelId) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('DELETE FROM active_channels WHERE channel_id = ?');
    stmt.run(channelId, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ success: true, channelId, changes: this.changes });
      }
    });
    stmt.finalize();
  });
}

// Check if a channel is active
function isChannelActive(channelId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT channel_id FROM active_channels WHERE channel_id = ?', [channelId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(!!row);
      }
    });
  });
}

// Close database connection
function closeDatabase() {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    }
  });
}

module.exports = {
  db,
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