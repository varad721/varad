const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Suggest a feature')
    .addStringOption(o => o.setName('suggestion').setDescription('Your suggestion').setRequired(true)),
  async execute(interaction) {
    const s = interaction.options.getString('suggestion');
    console.log(`Suggestion from ${interaction.user.tag}: ${s}`);
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ Thank You!').setDescription('Your suggestion has been recorded.').setColor(0x57F287)], ephemeral: true });
  },
};
