const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Removes a user from the blacklist')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption(option => 
      option.setName('user')
            .setDescription('The user to whitelist')
            .setRequired(true)),
  
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user');
      
      // Check if user is blacklisted
      const isBlacklisted = await db.isUserBlacklisted(targetUser.id);
      if (!isBlacklisted) {
        return interaction.reply({
          content: `${targetUser.username} is not blacklisted.`,
          ephemeral: true
        });
      }
      
      // Whitelist the user
      const result = await db.whitelistUser(targetUser.id);
      
      if (result.changes > 0) {
        return interaction.reply({
          content: `${targetUser.username} has been removed from the blacklist.`,
          ephemeral: false
        });
      } else {
        return interaction.reply({
          content: `Failed to whitelist ${targetUser.username}.`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error executing whitelist command:', error);
      return interaction.reply({
        content: 'An error occurred while whitelisting the user.',
        ephemeral: true
      });
    }
  }
}; 