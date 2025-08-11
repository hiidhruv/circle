const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const aiService = require('../utils/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('api')
    .setDescription('Check Shapes API information')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Shows the current API settings')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('debug')
        .setDescription('Check the status of API keys (admin only)')
    ),
    
  async execute(interaction) {
    if (!(await aiService.isOwner(interaction.user.id))) {
      return interaction.reply({ content: 'This command is restricted to bot owners.', ephemeral: true });
    }
    try {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'status') {
        return interaction.reply({
          content: `Using **Shapes Inc API** with model **shapesinc/openaigpt5**`,
          ephemeral: false
        });
      }
      else if (subcommand === 'debug') {
        // Only allow server owners to check API keys
        if (!interaction.guild || interaction.user.id !== interaction.guild.ownerId) {
          return interaction.reply({
            content: 'This command is restricted to server owners.',
            ephemeral: true
          });
        }
        
        // Get API key status from environment variables
        const shapesKeyStatus = process.env.SHAPESINC_API_KEY ? 'Available' : (process.env.SHAPES_API_KEY ? 'Available (legacy name)' : 'Missing');
        
        return interaction.reply({
          content: `## API Configuration Check
- Shapes API Key: **${shapesKeyStatus}**
- Model: **shapesinc/openaigpt5**

If the API key is missing, please check your .env file.`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error executing api command:', error);
      return interaction.reply({
        content: 'An error occurred while checking API settings.',
        ephemeral: true
      });
    }
  }
}; 