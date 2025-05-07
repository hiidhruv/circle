const fs = require('fs');
const path = require('path');
const { Collection, REST, Routes } = require('discord.js');
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

module.exports = {
  loadCommands,
  handleCommandInteraction
}; 