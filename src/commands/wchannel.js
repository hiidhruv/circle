const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../database/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wchannel')
    .setDescription('Removes a channel from the blacklist')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addChannelOption(option => 
      option.setName('channel')
            .setDescription('The channel to whitelist')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)),
  
  async execute(interaction) {
    try {
      const targetChannel = interaction.options.getChannel('channel');
      
      // Check if channel is blacklisted
      const isBlacklisted = await db.isChannelBlacklisted(targetChannel.id);
      if (!isBlacklisted) {
        return interaction.reply({
          content: `<#${targetChannel.id}> is not blacklisted.`,
          ephemeral: true
        });
      }
      
      // Whitelist the channel
      const result = await db.whitelistChannel(targetChannel.id);
      
      if (result.changes > 0) {
        return interaction.reply({
          content: `<#${targetChannel.id}> has been removed from the blacklist.`,
          ephemeral: false
        });
      } else {
        return interaction.reply({
          content: `Failed to whitelist <#${targetChannel.id}>.`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error executing wchannel command:', error);
      return interaction.reply({
        content: 'An error occurred while whitelisting the channel.',
        ephemeral: true
      });
    }
  }
}; 