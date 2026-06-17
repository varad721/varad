const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a user')
    .addUserOption(o => o.setName('member').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)),
  async execute(interaction) {
    const member = interaction.options.getUser('member');
    const reason = interaction.options.getString('reason');
    if (member.id === interaction.user.id) return interaction.reply({ content: '❌ Cannot report yourself!', ephemeral: true });
    console.warn(`Report from ${interaction.user.tag} against ${member.tag}: ${reason}`);
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ Report Submitted').setDescription('Moderation team will review.').setColor(0x57F287)], ephemeral: true });
  },
};
