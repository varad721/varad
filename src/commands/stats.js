const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder().setName('stats').setDescription('Bot stats (owner only)'),
  async execute(interaction, bot) {
    if (String(interaction.user.id) !== String(config.ownerId))
      return interaction.reply({ content: '❌ Owner only!', ephemeral: true });

    const totalMembers = interaction.client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    const totalChannels = interaction.client.guilds.cache.reduce((a, g) => a + g.channels.cache.size, 0);
    const embed = new EmbedBuilder()
      .setTitle('📊 Bot Statistics').setColor(0x5865F2)
      .addFields(
        { name: 'Guilds', value: `${interaction.client.guilds.cache.size}`, inline: true },
        { name: 'Total Members', value: `${totalMembers}`, inline: true },
        { name: 'Total Channels', value: `${totalChannels}`, inline: true },
        { name: 'Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true },
      );
    await interaction.reply({ embeds: [embed] });
  },
};
