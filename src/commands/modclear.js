const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete messages')
    .addIntegerOption(o => o.setName('amount').setDescription('Messages to delete').setRequired(false)),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({ content: '❌ Need Manage Messages!', ephemeral: true });

    const amount = Math.min(interaction.options.getInteger('amount') || 10, 100);
    const deleted = await interaction.channel.bulkDelete(amount, true);
    const embed = new EmbedBuilder().setTitle('✅ Messages Deleted').setDescription(`Deleted ${deleted.size} messages`).setColor(0x57F287);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
