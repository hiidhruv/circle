const { SlashCommandBuilder } = require('discord.js');
const messageHandler = require('../utils/messageHandler');
const aiService = require('../utils/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trigger')
    .setDescription('Manage the trigger word for the bot (owner only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set the trigger word for the bot')
        .addStringOption(option =>
          option.setName('word')
            .setDescription('The new trigger word')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('get')
        .setDescription('Show the current trigger word')
    ),

  async execute(interaction) {
    if (!(await aiService.isOwner(interaction.user.id))) {
      return interaction.reply({ content: 'This command is restricted to bot owners.', ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'set') {
      const word = interaction.options.getString('word');
      messageHandler.setTriggerWord(word);
      return interaction.reply({
        content: `Trigger word updated to: **${word}**`,
        ephemeral: false
      });
    } else if (subcommand === 'get') {
      const word = messageHandler.getTriggerWord();
      return interaction.reply({
        content: `Current trigger word: **${word}**`,
        ephemeral: false
      });
    }
  }
}; 