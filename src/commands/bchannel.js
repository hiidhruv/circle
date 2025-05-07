const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bchannel')
    .setDescription('Blacklists a channel from using the AI')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption(option => 
      option.setName('channel')
            .setDescription('The channel to blacklist')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)),
  
  async execute(interaction) {
    try {
      const targetChannel = interaction.options.getChannel('channel');
      
      // Check if channel is already blacklisted
      const isBlacklisted = await db.isChannelBlacklisted(targetChannel.id);
      if (isBlacklisted) {
        return interaction.reply({
          content: `<#${targetChannel.id}> is already blacklisted.`,
          ephemeral: true
        });
      }
      
      // If channel is active, deactivate it first
      const isActive = await db.isChannelActive(targetChannel.id);
      if (isActive) {
        await db.deactivateChannel(targetChannel.id);
      }
      
      // Blacklist the channel
      await db.blacklistChannel(targetChannel.id);
      
      return interaction.reply({
        content: `<#${targetChannel.id}> has been blacklisted. AI will not respond in this channel.`,
        ephemeral: false
      });
    } catch (error) {
      console.error('Error executing bchannel command:', error);
      return interaction.reply({
        content: 'An error occurred while blacklisting the channel.',
        ephemeral: true
      });
    }
  }
}; 