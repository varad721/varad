const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription('View moderation logs')
    .addIntegerOption(o => o.setName('limit').setDescription('Number of logs').setRequired(false)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({ content: '❌ Need Manage Messages!', ephemeral: true });

    const limit = Math.min(interaction.options.getInteger('limit') || 10, 50);
    const logs = bot.db.getModlogs(interaction.guildId, limit);

    if (!logs.length) {
      return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📋 Moderation Logs').setDescription('No logs found').setColor(0x9CA3AF)], ephemeral: true });
    }

    const embed = new EmbedBuilder().setTitle(`📋 Moderation Logs (Latest ${logs.length})`).setColor(0x5865F2);
    logs.slice(0, 5).forEach(log => {
      embed.addFields({ name: `${log.action} - <@${log.user_id}>`, value: `**Reason:** ${log.reason}\n**Mod:** <@${log.moderator_id}>\n**Date:** ${log.created_at}` });
    });
    await interaction.reply({ embeds: [embed] });
  },
};
