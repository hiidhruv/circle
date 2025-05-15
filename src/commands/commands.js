const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const COMMANDS_PER_PAGE = 5;

const COMMANDS = [
  {
    name: 'about',
    description: 'About this bot and its features',
    usage: '/about'
  },
  {
    name: 'username',
    description: 'How to get a shape\'s username',
    usage: '/username'
  },
  {
    name: 'shape',
    description: 'Manage shape settings and configuration',
    usage: '/shape [set|get|setchannel|resetchannel|channelinfo|add|oncreate|showname]'
  },
  {
    name: 'trigger',
    description: 'Manage the trigger word for the bot (owner only)',
    usage: '/trigger [set|get]'
  },
  {
    name: 'owner',
    description: 'Manage bot owners (main owner only)',
    usage: '/owner [add|remove|list]'
  },
  {
    name: 'blacklist',
    description: 'Blacklists a user from using the AI',
    usage: '/blacklist <user>'
  },
  {
    name: 'whitelist',
    description: 'Removes a user from the blacklist',
    usage: '/whitelist <user>'
  },
  {
    name: 'bchannel',
    description: 'Blacklists a channel from using the AI',
    usage: '/bchannel <channel>'
  },
  {
    name: 'wchannel',
    description: 'Removes a channel from the blacklist',
    usage: '/wchannel <channel>'
  },
  {
    name: 'activate',
    description: 'Activates the AI to respond to all messages in this channel',
    usage: '/activate'
  },
  {
    name: 'deactivate',
    description: 'Deactivates the AI from responding to all messages in this channel',
    usage: '/deactivate'
  },
  {
    name: 'api',
    description: 'Check Shapes API information',
    usage: '/api [status|debug]'
  },
  {
    name: 'commands',
    description: 'List all available commands',
    usage: '/commands'
  }
];

function getCommandsEmbed(page = 1) {
  const totalPages = Math.ceil(COMMANDS.length / COMMANDS_PER_PAGE);
  const start = (page - 1) * COMMANDS_PER_PAGE;
  const end = start + COMMANDS_PER_PAGE;
  const pageCommands = COMMANDS.slice(start, end);

  return new EmbedBuilder()
    .setTitle('Available Commands')
    .setDescription(
      pageCommands.map(cmd => 
        `**${cmd.name}**\n${cmd.description}\nUsage: \`${cmd.usage}\`\n`
      ).join('\n') +
      `\nPage ${page}/${totalPages}`
    )
    .setColor(0xFFFF00);
}

function getCommandsButtons(page = 1) {
  const totalPages = Math.ceil(COMMANDS.length / COMMANDS_PER_PAGE);
  const row = new ActionRowBuilder();

  if (page > 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('commands_prev')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (page < totalPages) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId('commands_next')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
    );
  }

  return row;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('commands')
    .setDescription('List all available commands'),
  async execute(interaction) {
    await interaction.reply({
      embeds: [getCommandsEmbed(1)],
      components: [getCommandsButtons(1)],
      ephemeral: false
    });
  },
  async handleButton(interaction) {
    const currentPage = parseInt(interaction.message.embeds[0].description.split('Page ')[1]);
    let newPage = currentPage;

    if (interaction.customId === 'commands_next') {
      newPage++;
    } else if (interaction.customId === 'commands_prev') {
      newPage--;
    }

    await interaction.update({
      embeds: [getCommandsEmbed(newPage)],
      components: [getCommandsButtons(newPage)]
    });
  }
}; 