const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option => 
      option.setName('user')
            .setDescription('The user to ban')
            .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
            .setDescription('Reason for banning')
            .setRequired(false))
    .addIntegerOption(option => 
      option.setName('days')
            .setDescription('Number of days of messages to delete (0-7)')
            .setMinValue(0)
            .setMaxValue(7)
            .setRequired(false)),
  
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const days = interaction.options.getInteger('days') || 0;
      
      // Get the member object from the user
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      // Check if the member exists in the guild
      if (targetMember) {
        // Check if the bot can ban the member
        if (!targetMember.bannable) {
          return interaction.reply({
            content: `I cannot ban ${targetUser.username}. They may have higher permissions than me.`,
            ephemeral: true
          });
        }
        
        // Check if the user is trying to ban themselves
        if (targetUser.id === interaction.user.id) {
          return interaction.reply({
            content: 'You cannot ban yourself!',
            ephemeral: true
          });
        }
        
        // Check if the user is trying to ban the bot
        if (targetUser.id === interaction.client.user.id) {
          return interaction.reply({
            content: 'I cannot ban myself!',
            ephemeral: true
          });
        }
      }
      
      // Ban the user
      await interaction.guild.members.ban(targetUser, {
        deleteMessageDays: days,
        reason: reason
      });
      
      // Prepare log message
      const logMessage = `${targetUser.username} was banned by ${interaction.user.username} | Reason: ${reason} | Message history deleted: ${days} days`;
      console.log(logMessage);
      
      // Reply to the interaction
      return interaction.reply({
        content: `${targetUser.username} has been banned. Reason: ${reason}`,
        ephemeral: false
      });
    } catch (error) {
      console.error('Error executing ban command:', error);
      return interaction.reply({
        content: 'An error occurred while trying to ban the user.',
        ephemeral: true
      });
    }
  }
}; 