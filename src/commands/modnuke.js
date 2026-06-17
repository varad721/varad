const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Recreate and clear this channel'),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({ content: '❌ Need Manage Messages!', ephemeral: true });

    const channel = interaction.channel;
    try {
      const newChannel = await channel.clone({ reason: 'Nuke command' });
      await channel.delete('Nuke command');
      await newChannel.send('💥 Channel nuked.');
      await interaction.reply({ content: '✅ Channel nuked.', ephemeral: true });
    } catch {
      await interaction.reply({ content: '❌ Failed to nuke channel!', ephemeral: true });
    }
  },
};
