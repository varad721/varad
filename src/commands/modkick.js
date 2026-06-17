const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member')
    .addUserOption(o => o.setName('member').setDescription('Member to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({ content: '❌ Need Manage Messages permission!', ephemeral: true });

    const member = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member || member.user.bot) return interaction.reply({ content: '❌ Cannot kick a bot!', ephemeral: true });
    if (member.id === interaction.user.id) return interaction.reply({ content: '❌ Cannot kick yourself!', ephemeral: true });

    try {
      await member.kick(reason);
      bot.db.addModlog(interaction.guildId, 'KICK', member.id, interaction.user.id, reason);
      const embed = new EmbedBuilder().setTitle('✅ Member Kicked').setDescription(`${member} has been kicked\n**Reason:** ${reason}`).setColor(0xFFA500);
      await interaction.reply({ embeds: [embed] });
    } catch {
      await interaction.reply({ content: '❌ Cannot kick that member!', ephemeral: true });
    }
  },
};
