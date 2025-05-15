const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/database');
const aiService = require('../utils/aiService');

// Get main owner ID from environment
const mainOwnerId = process.env.OWNER_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('owner')
    .setDescription('Manage bot owners (main owner only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a lower-level owner')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to add as owner')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a lower-level owner')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to remove as owner')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all owners')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // Get main owner IDs (handles multiple IDs separated by commas)
    const mainOwnerIds = mainOwnerId ? mainOwnerId.split(',').map(id => id.trim().replace(/[<@>]/g, '')) : [];
    const isMainOwner = mainOwnerIds.includes(userId);

    // Only main owner can add/remove
    if ((subcommand === 'add' || subcommand === 'remove') && !isMainOwner) {
      return interaction.reply({
        content: 'Only the main owner can add or remove owners.',
        ephemeral: true
      });
    }

    if (subcommand === 'add') {
      const user = interaction.options.getUser('user');
      // Check if user is already a main owner
      if (mainOwnerIds.includes(user.id)) {
        return interaction.reply({ content: 'Main owner is always an owner.', ephemeral: true });
      }
      await db.addOwner(user.id);
      return interaction.reply({ content: `<@${user.id}> added as owner.`, ephemeral: false });
    } else if (subcommand === 'remove') {
      const user = interaction.options.getUser('user');
      // Check if user is a main owner
      if (mainOwnerIds.includes(user.id)) {
        return interaction.reply({ content: 'Cannot remove the main owner.', ephemeral: true });
      }
      await db.removeOwner(user.id);
      return interaction.reply({ content: `<@${user.id}> removed from owners.`, ephemeral: false });
    } else if (subcommand === 'list') {
      const owners = await db.getOwners();
      const allOwners = [...mainOwnerIds, ...owners];
      const uniqueOwners = [...new Set(allOwners)]; // Remove duplicates
      const ownerMentions = uniqueOwners.map(id => `<@${id}>`).join('\n');
      return interaction.reply({ content: `Current owners:\n${ownerMentions}`, ephemeral: false });
    }
  }
}; 