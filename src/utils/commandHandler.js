const fs = require('fs');
const path = require('path');
const { Collection, REST, Routes, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const authService = require('./authService');
require('dotenv').config();

// Collection to store all commands
const commands = new Collection();

// Load all command files
async function loadCommands(client) {
  const commandsPath = path.join(__dirname, '../commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  
  const commandsArray = [];
  let loadedCount = 0;
  
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Set a new item in the Collection with the command name as the key
    if ('data' in command && 'execute' in command) {
      commands.set(command.data.name, command);
      commandsArray.push(command.data.toJSON());
      loadedCount++;
    } else {
      console.log(`[WARNING] Command ${file} missing "data" or "execute" property.`);
    }
  }
  
  // Log all loaded commands in one line
  if (loadedCount > 0) {
    console.log(`Loaded ${loadedCount} commands: ${Array.from(commands.keys()).join(', ')}`);
  }
  
  // Attach commands to client
  client.commands = commands;
  
  // Register all commands with Discord API
  try {
    // Construct and prepare an instance of the REST module
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    
    // Deploy commands
    const data = await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandsArray },
    );
    
    console.log(`Registered ${data.length} application commands`);
  } catch (error) {
    console.error(error);
  }
}

// Handle the command interactions
async function handleCommandInteraction(interaction) {
  if (!interaction.isCommand()) return;
  
  const command = commands.get(interaction.commandName);
  
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ 
        content: 'There was an error while executing this command!', 
        ephemeral: true 
      });
    } else {
      await interaction.reply({ 
        content: 'There was an error while executing this command!', 
        ephemeral: true 
      });
    }
  }
}

// Handle button interactions (for /about pagination and auth wall)
async function handleButtonInteraction(interaction) {
  if (!interaction.isButton()) return;
  const customId = interaction.customId;
  
  if (customId.startsWith('about_')) {
    // Route to about.js
    const about = require('../commands/about');
    if (about.handleButton) {
      await about.handleButton(interaction);
    }
  } else if (customId.startsWith('commands_')) {
    // Route to commands.js
    const commands = require('../commands/commands');
    if (commands.handleButton) {
      await commands.handleButton(interaction);
    }
  } else if (customId === 'auth_wall_login') {
    // Handle authentication wall button
    await handleAuthWallButton(interaction);
  }
}

// Handle authentication wall button click - show modal
async function handleAuthWallButton(interaction) {
  try {
    // Get app ID for authorization URL
    const appId = process.env.APP_ID || process.env.SHAPESINC_APP_ID;
    const authUrl = `https://shapes.inc/authorize?app_id=${appId}`;
    
    const modal = new ModalBuilder()
      .setCustomId('auth_token_modal')
      .setTitle('🔐 Shapes Inc Authorization');

    const urlInput = new TextInputBuilder()
      .setCustomId('auth_url_display')
      .setLabel('1. Visit this URL to authorize:')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(authUrl)
      .setRequired(false);

    const codeInput = new TextInputBuilder()
      .setCustomId('one_time_code')
      .setLabel('2. Paste your one-time code here:')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter the code from Shapes Inc')
      .setRequired(true)
      .setMaxLength(200);

    const firstRow = new ActionRowBuilder().addComponents(urlInput);
    const secondRow = new ActionRowBuilder().addComponents(codeInput);

    modal.addComponents(firstRow, secondRow);

    await interaction.showModal(modal);
  } catch (error) {
    console.error('Error showing auth modal:', error);
    await interaction.reply({
      content: '❌ Failed to show authentication form. Please try again.',
      ephemeral: true
    });
  }
}

// Handle modal submissions (auth token input)
async function handleModalSubmission(interaction) {
  if (!interaction.isModalSubmit()) return;
  
  if (interaction.customId === 'auth_token_modal') {
    await handleAuthTokenModal(interaction);
  }
}

// Handle authentication token modal submission
async function handleAuthTokenModal(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });
    
    const oneTimeCode = interaction.fields.getTextInputValue('one_time_code').trim();
    
    if (!oneTimeCode) {
      const appId = process.env.APP_ID || process.env.SHAPESINC_APP_ID;
      const authUrl = `https://shapes.inc/authorize?app_id=${appId}`;
      
      await interaction.editReply({
        content: `**Please provide your one-time code.**\n\n**Get your code:** Visit [Shapes Inc Authorization](${authUrl}) to generate a one-time code and access the free platform.`
      });
      return;
    }
    
    // Authenticate with Shapes Inc (bot's APP_ID used automatically)
    const result = await authService.authenticateUser(oneTimeCode, interaction.user.id);
    
    if (result.success) {
      await interaction.editReply({
        content: result.message + '\n\n**Welcome to the Shapes ecosystem!** You now have unlimited access to this Discord bot and can explore millions of characters at [talk.shapes.inc](https://talk.shapes.inc)'
      });
    } else {
      const appId = process.env.APP_ID || process.env.SHAPESINC_APP_ID;
      const authUrl = `https://shapes.inc/authorize?app_id=${appId}`;
      
      await interaction.editReply({
        content: result.message + `\n\n**Need help getting your code?**\nVisit [Shapes Inc Authorization](${authUrl}) to generate a one-time code and join the free platform.`
      });
    }
  } catch (error) {
    console.error('Error processing auth modal:', error);
    await interaction.editReply({
      content: '❌ An error occurred during authentication. Please try again.'
    });
  }
}

module.exports = {
  loadCommands,
  handleCommandInteraction,
  handleButtonInteraction,
  handleModalSubmission
}; 