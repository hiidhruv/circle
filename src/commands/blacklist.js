const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklists a user from using the AI')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption(option => 
      option.setName('user')
            .setDescription('The user to blacklist')
            .setRequired(true)),
  
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user');
      
      // Check if user is already blacklisted
      const isBlacklisted = await db.isUserBlacklisted(targetUser.id);
      if (isBlacklisted) {
        return interaction.reply({
          content: `${targetUser.username} is already blacklisted.`,
          ephemeral: true
        });
      }
      
      // Blacklist the user
      await db.blacklistUser(targetUser.id);
      
      return interaction.reply({
        content: `${targetUser.username} has been blacklisted from using the AI.`,
        ephemeral: false
      });
    } catch (error) {
      console.error('Error executing blacklist command:', error);
      return interaction.reply({
        content: 'An error occurred while blacklisting the user.',
        ephemeral: true
      });
    }
  }
}; 