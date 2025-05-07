const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deactivate')
    .setDescription('Deactivates the AI from responding to all messages in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction) {
    try {
      const channelId = interaction.channelId;
      
      // Check if currently activated
      const isActive = await db.isChannelActive(channelId);
      if (!isActive) {
        return interaction.reply({
          content: 'AI is not activated in this channel.',
          ephemeral: true
        });
      }
      
      // Deactivate the channel
      await db.deactivateChannel(channelId);
      
      return interaction.reply({
        content: 'AI deactivated! I will now only respond randomly or when mentioned.',
        ephemeral: false
      });
    } catch (error) {
      console.error('Error executing deactivate command:', error);
      return interaction.reply({
        content: 'An error occurred while deactivating the AI.',
        ephemeral: true
      });
    }
  }
}; 