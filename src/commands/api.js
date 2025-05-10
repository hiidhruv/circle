const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const aiService = require('../utils/aiService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('api')
    .setDescription('Controls which AI API to use primarily')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Sets the primary AI API to use')
        .addStringOption(option => 
          option.setName('provider')
            .setDescription('The AI API provider to use')
            .setRequired(true)
            .addChoices(
              { name: 'Shapes Inc', value: 'shapes' },
              { name: 'Google Gemini', value: 'gemini' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('client')
        .setDescription('Sets the Shapes API client implementation to use')
        .addStringOption(option => 
          option.setName('type')
            .setDescription('The client implementation to use')
            .setRequired(true)
            .addChoices(
              { name: 'OpenAI SDK (recommended)', value: 'openai' },
              { name: 'Axios (legacy)', value: 'axios' }
            )
        )
    )
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
      
      if (subcommand === 'set') {
        const provider = interaction.options.getString('provider');
        const result = aiService.setPrimaryApi(provider);
        
        return interaction.reply({
          content: result,
          ephemeral: false
        });
      } 
      else if (subcommand === 'client') {
        const clientType = interaction.options.getString('type');
        const result = aiService.setShapesClient(clientType);
        
        return interaction.reply({
          content: result,
          ephemeral: false
        });
      }
      else if (subcommand === 'status') {
        const currentApi = aiService.getPrimaryApi();
        const apiDisplay = currentApi === 'shapes' ? 'Shapes Inc' : 'Google Gemini';
        
        // Get client type if available in the service
        let clientDisplay = '';
        if (typeof aiService.getShapesClient === 'function') {
          const currentClient = aiService.getShapesClient();
          clientDisplay = `\nCurrent Shapes client: **${currentClient === 'openai' ? 'OpenAI SDK' : 'Axios'}**`;
        }
        
        return interaction.reply({
          content: `Current primary AI API: **${apiDisplay}**${clientDisplay}`,
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
        const shapesUsername = process.env.SHAPESINC_SHAPE_USERNAME || 'Not configured';
        const geminiKeyStatus = process.env.GEMINI_API_KEY ? 'Available' : 'Missing';
        
        // Check if OpenAI SDK client is initialized
        const openaiSdkStatus = aiService.isOpenAiSdkAvailable ? 'Working' : 'Not available';
        
        return interaction.reply({
          content: `## API Configuration Check
- Shapes API Key: **${shapesKeyStatus}**
- Shape Username: **${shapesUsername}**
- Gemini API Key: **${geminiKeyStatus}**
- OpenAI SDK Client: **${openaiSdkStatus}**

If any API keys are missing, please check your .env file.`,
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error executing api command:', error);
      return interaction.reply({
        content: 'An error occurred while managing API settings.',
        ephemeral: true
      });
    }
  }
}; 