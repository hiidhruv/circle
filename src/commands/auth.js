const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const authService = require('../utils/authService');
const db = require('../database/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('auth')
    .setDescription('Manage your Shapes Inc authentication')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check your current authentication status')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('revoke')
        .setDescription('Remove your stored authentication token')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset your message count (for testing)')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    try {
      if (subcommand === 'status') {
        await interaction.deferReply({ ephemeral: true });
        
        const authSummary = await authService.getUserAuthSummary(userId);
        
        const embed = new EmbedBuilder()
          .setTitle('Shapes Inc Connection Status')
          .setColor(authSummary.status === 'authenticated' ? 0x00FF00 : 0xFFAA00)
          .setTimestamp();

        if (authSummary.status === 'authenticated') {
          embed
            .setDescription('✅ **Connected to Shapes Inc**\nYou have unlimited access to this bot and the entire Shapes ecosystem.')
            .addFields(
              { name: 'Status', value: 'Authenticated', inline: true },
              { name: 'Total Messages', value: authSummary.messageCount.toString(), inline: true },
              { name: 'Platform Access', value: 'Full Access', inline: true }
            );
        } else if (authSummary.status === 'auth_required') {
          embed
            .setDescription('**Connect to Shapes Inc**\nYou\'ve reached the anonymous usage limit. Connect for free unlimited access.')
            .addFields(
              { name: 'Status', value: 'Not Connected', inline: true },
              { name: 'Anonymous Uses', value: `${authSummary.messageCount} used`, inline: true },
              { name: 'Action', value: 'Send a message to connect', inline: true }
            );
        } else {
          embed
            .setDescription('**Anonymous Usage**\nYou\'re using anonymous access. Connect to Shapes Inc for unlimited usage.')
            .addFields(
              { name: 'Status', value: 'Anonymous', inline: true },
              { name: 'Messages Used', value: authSummary.messageCount.toString(), inline: true },
              { name: 'Platform', value: 'Limited Access', inline: true }
            );
        }

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'revoke') {
        await interaction.deferReply({ ephemeral: true });
        
        const result = await authService.revokeUserAuth(userId);
        
        const embed = new EmbedBuilder()
          .setTitle('Shapes Inc Connection Removed')
          .setDescription(result.message)
          .setColor(result.success ? 0x00FF00 : 0xFF0000)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

      } else if (subcommand === 'reset') {
        await interaction.deferReply({ ephemeral: true });
        
        // Only allow owners or the user themselves to reset (for testing)
        const isUserAuthenticated = await db.isUserAuthenticated(userId);
        
        if (isUserAuthenticated) {
          await interaction.editReply({
            content: '**You are currently connected to Shapes Inc.** Use `/auth revoke` first if you want to test anonymous usage again.'
          });
          return;
        }
        
        await db.resetUserMessageCount(userId);
        
        const embed = new EmbedBuilder()
          .setTitle('Anonymous Usage Reset')
          .setDescription('✅ Your anonymous usage count has been reset. You can test the bot again before connecting to Shapes Inc.')
          .setColor(0x00FF00)
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Error in auth command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while processing your request. Please try again.')
        .setColor(0xFF0000)
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  }
};
