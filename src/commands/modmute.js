const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const dMap = { s: 1, m: 60, h: 3600, d: 86400 };
function parseDur(dur) {
  const m = dur.match(/^(\d+)([smhd])$/);
  return m ? parseInt(m[1]) * (dMap[m[2]] || 60) : 600;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member')
    .addUserOption(o => o.setName('member').setDescription('Member').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('10m, 1h, 1d').setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({ content: '❌ Need Manage Messages!', ephemeral: true });

    const member = interaction.options.getMember('member');
    const dur = interaction.options.getString('duration') || '10m';
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!member || member.user.bot) return interaction.reply({ content: '❌ Cannot mute a bot!', ephemeral: true });

    try {
      await member.timeout(parseDur(dur) * 1000, reason);
      bot.db.addModlog(interaction.guildId, 'MUTE', member.id, interaction.user.id, reason);
      const embed = new EmbedBuilder().setTitle('✅ Member Muted').setDescription(`${member} muted for ${dur}\n**Reason:** ${reason}`).setColor(0xFFA500);
      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({ content: '❌ Cannot mute that member!', ephemeral: true });
    }
  },
};
