const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const durationMap = { s: 1, m: 60, h: 3600, d: 86400 };
function parseDuration(dur) {
  const m = dur.match(/^(\d+)([smhd])$/);
  if (!m) return 600;
  return parseInt(m[1]) * (durationMap[m[2]] || 60);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(o => o.setName('member').setDescription('Member to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({ content: '❌ You need Manage Messages permission!', ephemeral: true });

    const member = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member || member.user.bot) return interaction.reply({ content: '❌ Cannot warn a bot!', ephemeral: true });
    if (member.id === interaction.user.id) return interaction.reply({ content: '❌ Cannot warn yourself!', ephemeral: true });

    bot.db.addWarning(member.id, interaction.guildId, reason, interaction.user.id);
    bot.db.addModlog(interaction.guildId, 'WARN', member.id, interaction.user.id, reason);

    const count = bot.db.getWarningCount(member.id, interaction.guildId);
    if (count >= 3) {
      try {
        await member.ban({ reason: 'Reached 3 warnings' });
        bot.db.addModlog(interaction.guildId, 'BAN', member.id, interaction.user.id, 'Reached 3 warnings');
        return interaction.reply({ content: `✅ ${member} has been banned for reaching 3 warnings.` });
      } catch { return interaction.reply({ content: `⚠️ ${member} has 3 warnings but cannot ban.`, ephemeral: true }); }
    }

    const embed = new EmbedBuilder()
      .setTitle('✅ Member Warned')
      .setDescription(`${member} has been warned\n**Reason:** ${reason}\n**Warnings:** ${count}/3`)
      .setColor(0xFFA500)
      .setFooter({ text: `Moderator: ${interaction.user.tag}` });
    await interaction.reply({ embeds: [embed] });
    try { await member.send({ embeds: [new EmbedBuilder().setTitle('⚠️ Warning').setDescription(`You were warned in ${interaction.guild.name}\n**Reason:** ${reason}`).setColor(0xFFA500)] }); } catch {}
  },
};
