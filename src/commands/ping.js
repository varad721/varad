const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Check latency'),
  async execute(interaction) {
    const embed = new EmbedBuilder().setTitle('🏓 Pong!').setDescription(`Latency: ${Math.round(interaction.client.ws.ping)}ms`).setColor(0x57F287);
    await interaction.reply({ embeds: [embed] });
  },
};
