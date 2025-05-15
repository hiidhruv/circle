const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('username')
    .setDescription("How to get a shape's username"),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('How to get a shape\'s username')
      .setDescription(`Hello <@${interaction.user.id}>!\nTo get a shape's username:\n1. Visit shapes.inc/explore\n2. Find the shape you want\n3. Visit their profile\n4. Copy the username written after @`)
      .setImage('https://i.dhrv.dev/cea7pb.png')
      .setColor(0x5865F2);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Visit shapes.inc')
        .setURL('https://shapes.inc/explore')
        .setStyle(ButtonStyle.Link)
    );

    return interaction.reply({
      embeds: [embed],
      components: [buttons]
    });
  }
}; 