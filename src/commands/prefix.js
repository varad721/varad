const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Set prefix (owner only)')
    .addStringOption(o => o.setName('symbol').setDescription('Prefix').setRequired(true)),
  async execute(interaction, bot) {
    if (String(interaction.user.id) !== String(config.ownerId))
      return interaction.reply({ content: '❌ Owner only!', ephemeral: true });

    const symbol = interaction.options.getString('symbol');
    if (symbol.length > 3) return interaction.reply({ content: '❌ Max 3 chars!', ephemeral: true });

    bot.db.setPrefix(interaction.guildId, symbol);
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ Prefix Updated').setDescription(`Prefix is now: \`${symbol}\``).setColor(0x57F287)] });
  },
};
