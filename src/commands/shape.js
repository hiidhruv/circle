const { SlashCommandBuilder } = require('discord.js');
const aiService = require('../utils/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shape')
    .setDescription('Manage the current Shape username (owner only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set the Shape username for the bot')
        .addStringOption(option =>
          option.setName('username')
            .setDescription('The new Shape username')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('get')
        .setDescription('Show the current Shape username')
    ),

  async execute(interaction) {
    if (!(await aiService.isOwner(interaction.user.id))) {
      return interaction.reply({ content: 'This command is restricted to bot owners.', ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'set') {
      const username = interaction.options.getString('username');
      aiService.setShapeUsername(username);
      return interaction.reply({
        content: `Shape username updated to: **${username}**`,
        ephemeral: false
      });
    } else if (subcommand === 'get') {
      const username = aiService.getShapeUsername();
      return interaction.reply({
        content: `Current Shape username: **${username}**`,
        ephemeral: false
      });
    }
  }
}; 