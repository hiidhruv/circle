const { SlashCommandBuilder } = require('discord.js');
const aiService = require('../utils/aiService');
const db = require('../database/database');
const axios = require('axios');

async function shapeExistsOnShapesInc(username) {
  // Replace with actual Shapes Inc API endpoint if different
  try {
    const apiKey = process.env.SHAPESINC_API_KEY || process.env.SHAPES_API_KEY;
    const apiUrl = process.env.SHAPES_API_URL || 'https://api.shapes.inc/v1';
    const response = await axios.get(`${apiUrl}/shapes/${username}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.status === 200;
  } catch (e) {
    return false;
  }
}

function getRandomShapeUsername() {
  // Replace with actual logic or API call to get a random shape from Shapes Inc
  const shapes = ['arie', 'tenshi', 'luna', 'nova', 'sol', 'echo', 'zen', 'kai', 'mira', 'sage'];
  return shapes[Math.floor(Math.random() * shapes.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shape')
    .setDescription('Manage shape settings and configuration')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set the global Shape username (owner only)')
        .addStringOption(option =>
          option.setName('username')
            .setDescription('The new Shape username')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('get')
        .setDescription('Show the current global Shape username')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('setchannel')
        .setDescription('Set the Shape username for this channel (admin only)')
        .addStringOption(option =>
          option.setName('username')
            .setDescription('The Shape username for this channel')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('resetchannel')
        .setDescription('Reset this channel to use the global Shape username (admin only)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('channelinfo')
        .setDescription('Show the current shape and AI config for this channel')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add another shape to this channel (admin only)')
        .addStringOption(option =>
          option.setName('username')
            .setDescription('The Shape username to add, or "random" for a random shape')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('oncreate')
        .setDescription('Prompt to set a shape for this channel on creation (admin only)')
        .addStringOption(option =>
          option.setName('mode')
            .setDescription('random or manual')
            .setRequired(true)
            .addChoices(
              { name: 'Random', value: 'random' },
              { name: 'Manual', value: 'manual' }
            )
        )
        .addStringOption(option =>
          option.setName('username')
            .setDescription('Shape username (required if manual)')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('showname')
        .setDescription('Toggle whether to show shape name in responses')
        .addStringOption(option =>
          option.setName('state')
            .setDescription('on or off')
            .setRequired(true)
            .addChoices(
              { name: 'On', value: 'on' },
              { name: 'Off', value: 'off' }
            )
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    
    // Check if user is owner for restricted commands
    if (!(await aiService.isOwner(interaction.user.id)) && 
        !['setchannel', 'resetchannel', 'channelinfo', 'add', 'oncreate'].includes(subcommand)) {
      return interaction.reply({ content: 'This command is restricted to bot owners.', ephemeral: true });
    }
    
    // Handle specific subcommands
    if (subcommand === 'set') {
      const username = interaction.options.getString('username');
      aiService.setShapeUsername(username);
      return interaction.reply({ content: `Shape username updated to: **${username}**`, ephemeral: false });
    } 
    
    else if (subcommand === 'get') {
      const username = aiService.getShapeUsername();
      return interaction.reply({ content: `Currently selected shape: **${username}**`, ephemeral: false });
    } 
    
    else if (subcommand === 'setchannel') {
      if (!interaction.member.permissions.has('ManageChannels')) {
        return interaction.reply({ content: 'You need the Manage Channels permission to set the shape for this channel.', ephemeral: true });
      }
      const username = interaction.options.getString('username');
      if (!(await shapeExistsOnShapesInc(username))) {
        return interaction.reply({ content: `Shape username **${username}** does not exist on Shapes Inc.`, ephemeral: true });
      }
      await db.setChannelShapeConfig(interaction.channel.id, { shape_username: username });
      return interaction.reply({ content: `Shape username for this channel set to: **${username}**`, ephemeral: false });
    } 
    
    else if (subcommand === 'resetchannel') {
      if (!interaction.member.permissions.has('ManageChannels')) {
        return interaction.reply({ content: 'You need the Manage Channels permission to reset the shape for this channel.', ephemeral: true });
      }
      await db.removeChannelShapeConfig(interaction.channel.id);
      return interaction.reply({ content: `Shape username for this channel reset to the global default.`, ephemeral: false });
    } 
    
    else if (subcommand === 'channelinfo') {
      const config = await aiService.getEffectiveChannelConfig(interaction.channel.id);
      return interaction.reply({ 
        content: `Current channel shape: **${config.shape_username}**`, 
        ephemeral: false 
      });
    } 
    
    else if (subcommand === 'add') {
      if (!interaction.member.permissions.has('ManageChannels')) {
        return interaction.reply({ content: 'You need the Manage Channels permission to add a shape to this channel.', ephemeral: true });
      }
      let username = interaction.options.getString('username');
      if (username === 'random') {
        username = getRandomShapeUsername();
        if (!(await shapeExistsOnShapesInc(username))) {
          return interaction.reply({ content: `Randomly selected shape **${username}** does not exist on Shapes Inc. Try again.`, ephemeral: true });
        }
      } else {
        if (!(await shapeExistsOnShapesInc(username))) {
          return interaction.reply({ content: `Shape username **${username}** does not exist on Shapes Inc.`, ephemeral: true });
        }
      }
      // For multi-shape, you could store an array in channel config, here we just overwrite for demo
      await db.setChannelShapeConfig(interaction.channel.id, { shape_username: username });
      return interaction.reply({ content: `Shape **${username}** added to this channel.`, ephemeral: false });
    } 
    
    else if (subcommand === 'oncreate') {
      if (!interaction.member.permissions.has('ManageChannels')) {
        return interaction.reply({ content: 'You need the Manage Channels permission to set a shape for this channel.', ephemeral: true });
      }
      const mode = interaction.options.getString('mode');
      let username = interaction.options.getString('username');
      if (mode === 'random') {
        username = getRandomShapeUsername();
        if (!(await shapeExistsOnShapesInc(username))) {
          return interaction.reply({ content: `Randomly selected shape **${username}** does not exist on Shapes Inc. Try again.`, ephemeral: true });
        }
      } else if (mode === 'manual') {
        if (!username) {
          return interaction.reply({ content: 'You must provide a shape username in manual mode.', ephemeral: true });
        }
        if (!(await shapeExistsOnShapesInc(username))) {
          return interaction.reply({ content: `Shape username **${username}** does not exist on Shapes Inc.`, ephemeral: true });
        }
      }
      await db.setChannelShapeConfig(interaction.channel.id, { shape_username: username });
      return interaction.reply({ content: `Shape username for this channel set to: **${username}**`, ephemeral: false });
    } 
    
    else if (subcommand === 'showname') {
      const state = interaction.options.getString('state');
      aiService.setShowShapeNameInResponses(state === 'on');
      return interaction.reply({ 
        content: `Shape name in responses is now **${state === 'on' ? 'enabled' : 'disabled'}**.\n${state === 'on' ? 'Responses will show as: **[shape_name]** response' : 'Responses will show without shape name prefix.'}`, 
        ephemeral: true 
      });
    }
  }
}; 