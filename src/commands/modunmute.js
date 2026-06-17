const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from a member')
    .addUserOption(o => o.setName('member').setDescription('Member').setRequired(true)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({ content: '❌ Need Manage Messages!', ephemeral: true });

    const member = interaction.options.getMember('member');
    if (!member) return interaction.reply({ content: 'Member not found.', ephemeral: true });

    try {
      await member.timeout(null);
      bot.db.addModlog(interaction.guildId, 'UNMUTE', member.id, interaction.user.id, 'Timeout removed');
      const embed = new EmbedBuilder().setTitle('✅ Member Unmuted').setDescription(`${member} has been unmuted`).setColor(0x57F287);
      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({ content: '❌ Cannot unmute!', ephemeral: true });
    }
  },
};
