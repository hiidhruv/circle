const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activate')
    .setDescription('Activates the AI to respond to all messages in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  async execute(interaction) {
    try {
      const channelId = interaction.channelId;
      
      // Check if already activated
      const isActive = await db.isChannelActive(channelId);
      if (isActive) {
        return interaction.reply({
          content: 'AI is already activated in this channel!',
          ephemeral: true
        });
      }
      
      // Check if the channel is blacklisted
      const isBlacklisted = await db.isChannelBlacklisted(channelId);
      if (isBlacklisted) {
        return interaction.reply({
          content: 'This channel is blacklisted. Remove it from the blacklist first.',
          ephemeral: true
        });
      }
      
      // Activate the channel
      await db.activateChannel(channelId);
      
      return interaction.reply({
        content: 'AI activated! I will now respond to all messages in this channel.',
        ephemeral: false
      });
    } catch (error) {
      console.error('Error executing activate command:', error);
      return interaction.reply({
        content: 'An error occurred while activating the AI.',
        ephemeral: true
      });
    }
  }
}; 