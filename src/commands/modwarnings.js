const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View member warnings')
    .addUserOption(o => o.setName('member').setDescription('Member').setRequired(false)),

  async execute(interaction, bot) {
    const member = interaction.options.getMember('member') || interaction.member;
    const warnings = bot.db.getWarnings(member.id, interaction.guildId);

    if (!warnings.length) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ No Warnings').setDescription(`${member} has no warnings`).setColor(0x57F287)] });
    }

    const embed = new EmbedBuilder().setTitle(`⚠️ Warnings for ${member.user.tag}`).setColor(0xFFA500);
    warnings.slice(0, 10).forEach((w, i) => {
      embed.addFields({ name: `Warning #${i + 1}`, value: `**Reason:** ${w.reason}\n**Date:** ${w.warned_at}` });
    });
    embed.setFooter({ text: `Total: ${warnings.length}` });
    await interaction.reply({ embeds: [embed] });
  },
};
