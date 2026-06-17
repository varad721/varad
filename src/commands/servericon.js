const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('servericon').setDescription('Show server icon'),
  async execute(interaction) {
    const g = interaction.guild;
    if (!g.iconURL()) return interaction.reply({ content: 'No server icon.', ephemeral: true });
    const embed = new EmbedBuilder().setTitle(`Server Icon: ${g.name}`).setImage(g.iconURL({ size: 2048 })).setColor(0x5865F2).addFields({ name: 'Link', value: `[Open](${g.iconURL({ size: 2048 })})` });
    await interaction.reply({ embeds: [embed] });
  },
};
