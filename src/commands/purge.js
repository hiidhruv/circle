const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete multiple messages at once')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option => 
      option.setName('amount')
            .setDescription('Number of messages to delete (1-99)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(99))
    .addUserOption(option =>
      option.setName('user')
            .setDescription('Only delete messages from this user')
            .setRequired(false)),
  
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const amount = interaction.options.getInteger('amount');
      const user = interaction.options.getUser('user');
      
      // Fetch messages
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      
      // Filter messages based on criteria
      let messagesToDelete = messages;
      
      // If deleting from a specific user
      if (user) {
        messagesToDelete = messages.filter(m => m.author.id === user.id);
      }
      
      // Limit to requested amount and only messages younger than 14 days
      // (Discord API restriction)
      const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
      messagesToDelete = messagesToDelete
        .filter(m => m.createdTimestamp > twoWeeksAgo)
        .first(amount);
      
      // Check if there are messages to delete
      if (messagesToDelete.length === 0) {
        return interaction.editReply({
          content: user 
            ? `No recent messages found from ${user.username} to delete.`
            : 'No messages found to delete.',
          ephemeral: true
        });
      }
      
      // Perform bulk delete
      await interaction.channel.bulkDelete(messagesToDelete);
      
      // Send confirmation
      return interaction.editReply({
        content: user 
          ? `Successfully deleted ${messagesToDelete.length} messages from ${user.username}.`
          : `Successfully deleted ${messagesToDelete.length} messages.`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error executing purge command:', error);
      
      if (error.code === 10008) {
        return interaction.editReply({ 
          content: 'Failed to delete messages. Some messages may be older than 14 days.',
          ephemeral: true 
        });
      }
      
      return interaction.editReply({ 
        content: 'An error occurred while purging messages.',
        ephemeral: true 
      });
    }
  }
}; 