const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get user info')
    .addUserOption(o => o.setName('member').setDescription('Member').setRequired(false)),
  async execute(interaction) {
    const member = interaction.options.getMember('member') || interaction.member;
    const embed = new EmbedBuilder()
      .setTitle(`👤 User Info: ${member.user.tag}`).setColor(0x5865F2)
      .addFields(
        { name: 'User ID', value: member.id, inline: true },
        { name: 'Bot', value: member.user.bot ? 'Yes' : 'No', inline: true },
        { name: 'Created', value: member.user.createdAt.toDateString(), inline: true },
        { name: 'Joined', value: member.joinedAt ? member.joinedAt.toDateString() : 'N/A', inline: true },
      );
    if (member.roles.cache.size > 1) {
      embed.addFields({ name: 'Roles', value: member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).slice(0, 5).join(', ') || 'None' });
    }
    if (member.user.displayAvatarURL()) embed.setThumbnail(member.user.displayAvatarURL());
    await interaction.reply({ embeds: [embed] });
  },
};
