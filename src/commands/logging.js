const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// Create a module-level variable to track logging state
// This will be used by other modules too
let loggingEnabled = true;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logging')
    .setDescription('Toggle message response logging in the console')
    .addStringOption(option =>
      option.setName('state')
        .setDescription('Enable or disable logging')
        .setRequired(true)
        .addChoices(
          { name: 'On', value: 'on' },
          { name: 'Off', value: 'off' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  execute: async function(interaction) {
    const newState = interaction.options.getString('state');
    
    if (newState === 'on') {
      loggingEnabled = true;
      await interaction.reply({
        content: '✅ Message response logging has been **enabled**.',
        ephemeral: true
      });
    } else {
      loggingEnabled = false;
      await interaction.reply({
        content: '✅ Message response logging has been **disabled**.',
        ephemeral: true
      });
    }
  },

  // Export the current logging state
  isLoggingEnabled: function() {
    return loggingEnabled;
  }
}; 