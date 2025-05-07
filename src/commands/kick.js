const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option => 
      option.setName('user')
            .setDescription('The user to kick')
            .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
            .setDescription('Reason for kicking')
            .setRequired(false)),
  
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      // Get the member object from the user
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      // Check if the member exists in the guild
      if (!targetMember) {
        return interaction.reply({
          content: `Could not find user ${targetUser.username} in this server.`,
          ephemeral: true
        });
      }
      
      // Check if the bot can kick the member
      if (!targetMember.kickable) {
        return interaction.reply({
          content: `I cannot kick ${targetUser.username}. They may have higher permissions than me.`,
          ephemeral: true
        });
      }
      
      // Check if the user is trying to kick themselves
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({
          content: 'You cannot kick yourself!',
          ephemeral: true
        });
      }
      
      // Check if the user is trying to kick the bot
      if (targetUser.id === interaction.client.user.id) {
        return interaction.reply({
          content: 'I cannot kick myself!',
          ephemeral: true
        });
      }
      
      // Kick the member
      await targetMember.kick(reason);
      
      // Prepare log message
      const logMessage = `${targetUser.username} was kicked by ${interaction.user.username} | Reason: ${reason}`;
      console.log(logMessage);
      
      // Reply to the interaction
      return interaction.reply({
        content: `${targetUser.username} has been kicked. Reason: ${reason}`,
        ephemeral: false
      });
    } catch (error) {
      console.error('Error executing kick command:', error);
      return interaction.reply({
        content: 'An error occurred while trying to kick the user.',
        ephemeral: true
      });
    }
  }
}; 