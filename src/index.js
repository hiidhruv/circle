const { Client, GatewayIntentBits, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Debug token check removed to reduce logs

const commandHandler = require('./utils/commandHandler');
const messageHandler = require('./utils/messageHandler');

// Create necessary directories if they don't exist
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// When the client is ready
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  
  // Set custom status: Watching ur mom
  readyClient.user.setPresence({
    status: 'online',
    activities: [{ name: 'ur mom', type: 3 }] // 3 = Watching
  });

  // Load all commands
  await commandHandler.loadCommands(readyClient);
});

// Handle interactions (slash commands and buttons)
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isCommand()) {
    await commandHandler.handleCommandInteraction(interaction);
  } else if (interaction.isButton()) {
    await commandHandler.handleButtonInteraction(interaction);
  }
});

// Handle messages
client.on(Events.MessageCreate, async (message) => {
  await messageHandler.handleMessage(message, client);
});

// Handle errors
client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN)
  .catch(error => {
    console.error('Error logging in to Discord:', error);
    process.exit(1);
  });

// Handle process termination
process.on('SIGINT', () => {
  console.log('Bot shutting down...');
  // Close the database connection
  const db = require('./database/database');
  db.closeDatabase();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Bot shutting down...');
  // Close the database connection
  const db = require('./database/database');
  db.closeDatabase();
  client.destroy();
  process.exit(0);
}); 