const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member')
    .addUserOption(o => o.setName('member').setDescription('Member to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
      return interaction.reply({ content: '❌ Need Administrator permission!', ephemeral: true });

    const member = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member || member.user.bot) return interaction.reply({ content: '❌ Cannot ban a bot!', ephemeral: true });
    if (member.id === interaction.user.id) return interaction.reply({ content: '❌ Cannot ban yourself!', ephemeral: true });

    try {
      await member.ban({ reason });
      bot.db.addModlog(interaction.guildId, 'BAN', member.id, interaction.user.id, reason);
      const embed = new EmbedBuilder().setTitle('✅ Member Banned').setDescription(`${member} has been banned\n**Reason:** ${reason}`).setColor(0xED4245);
      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({ content: '❌ Cannot ban that member!', ephemeral: true });
    }
  },
};
