const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const FEATURES = [
  '• Hardlocked model: shapesinc/openaigpt5',
  '• Owner/whitelist/blacklist system',
  '• Customizable trigger word',
  '• Neon (Postgres) backend',
  '• Slash commands for all features',
  '• API integration with shapes.inc',
  '• Open source & extensible'
];

const BANNER_URL = 'https://i.dhrv.dev/5e5qat.png';

const HOW_TO_STEPS = [
  '1. Model is fixed to shapesinc/openaigpt5',
  '2. Use `/activate` in a channel to make the bot respond to all messages',
  '3. Use `/deactivate` to turn off auto-responses',
  '\nAdvanced Features:',
  '• Use `/trigger set <word>` to change the bot\'s trigger word (owner only)',
  '• Use `!imagine <prompt>` to generate images',
  '• Use `/commands` to see all available commands'
];

function getAboutEmbed() {
  return new EmbedBuilder()
    .setTitle('About gpt 5')
    .setDescription(
      'You are talking with an AI bot powered by shapesinc/openaigpt5.\n\n' +
      FEATURES.join('\n') +
      '\n\nUse `/commands` to learn more about all available commands!' +
      '\n\n[Join our support server](https://discord.gg/8qV2h7Sct2)'
    )
    .setImage(BANNER_URL)
    .setColor(0xFFFF00);
}

function getHowToEmbed() {
  return new EmbedBuilder()
    .setTitle('How to Use gpt 5')
    .setDescription(HOW_TO_STEPS.join('\n'))
    .setColor(0xFFFF00);
}

function getAboutButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Visit shapes.inc')
      .setURL('https://shapes.inc')
      .setStyle(ButtonStyle.Link),
    new ButtonBuilder()
      .setLabel('Developer')
      .setURL('https://x.com/hiidhruv')
      .setStyle(ButtonStyle.Link),
    new ButtonBuilder()
      .setCustomId('about_howto')
      .setLabel('How to Use')
      .setStyle(ButtonStyle.Success)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('About this bot and its features'),
  async execute(interaction) {
    await interaction.reply({
      embeds: [getAboutEmbed()],
      components: [getAboutButtons()],
      ephemeral: false
    });
  },
  async handleButton(interaction) {
    if (interaction.customId === 'about_howto') {
      await interaction.update({
        embeds: [getAboutEmbed(), getHowToEmbed()],
        components: [getAboutButtons()]
      });
    }
  }
}; 