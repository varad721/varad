const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show avatar')
    .addUserOption(o => o.setName('member').setDescription('Member').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('member') || interaction.user;
    const url = user.displayAvatarURL({ size: 2048 });
    const embed = new EmbedBuilder().setTitle(`Avatar: ${user.tag}`).setImage(url).setColor(0x5865F2).addFields({ name: 'Link', value: `[Open](${url})` });
    await interaction.reply({ embeds: [embed] });
  },
};
