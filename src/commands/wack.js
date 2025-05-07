const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const aiService = require('../utils/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wack')
    .setDescription('Clears the AI message context in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction) {
    try {
      const channelId = interaction.channelId;
      
      // Clear the message context
      const success = aiService.clearMessageContext(channelId);
      
      if (success) {
        return interaction.reply({
          content: 'Message context cleared! I\'ve forgotten our previous conversation.',
          ephemeral: false
        });
      } else {
        return interaction.reply({
          content: 'No message context found for this channel.',
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error executing wack command:', error);
      return interaction.reply({
        content: 'An error occurred while clearing the message context.',
        ephemeral: true
      });
    }
  }
};