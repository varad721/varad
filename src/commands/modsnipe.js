const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Show last deleted message'),

  async execute(interaction, bot) {
    const sniped = bot.snipeCache.get(interaction.channel.id);
    if (!sniped) return interaction.reply({ content: '❌ Nothing to snipe.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('💬 Sniped Message')
      .setDescription(sniped.content || '(embed or attachment)')
      .setColor(0x5865F2)
      .setTimestamp(sniped.createdAt)
      .setAuthor({ name: sniped.author.tag, iconURL: sniped.author.displayAvatarURL() });

    if (sniped.attachments.length) embed.addFields({ name: 'Attachments', value: sniped.attachments.join('\n') });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
