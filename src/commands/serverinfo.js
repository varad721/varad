const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Get server information'),
  async execute(interaction) {
    const g = interaction.guild;
    const embed = new EmbedBuilder()
      .setTitle(`📊 Server Info: ${g.name}`).setColor(0x5865F2)
      .addFields(
        { name: 'Guild ID', value: `${g.id}`, inline: true },
        { name: 'Owner', value: `${g.ownerId}`, inline: true },
        { name: 'Created', value: g.createdAt.toDateString(), inline: true },
        { name: 'Members', value: `${g.memberCount}`, inline: true },
        { name: 'Text Channels', value: `${g.channels.cache.filter(c => c.isTextBased()).size}`, inline: true },
        { name: 'Voice Channels', value: `${g.channels.cache.filter(c => c.isVoiceBased()).size}`, inline: true },
        { name: 'Roles', value: `${g.roles.cache.size}`, inline: true },
      );
    if (g.iconURL()) embed.setThumbnail(g.iconURL());
    await interaction.reply({ embeds: [embed] });
  },
};
