const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('Remove a role from a member')
    .addUserOption(o => o.setName('member').setDescription('Member').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return interaction.reply({ content: '❌ Need Manage Roles!', ephemeral: true });

    const member = interaction.options.getMember('member');
    const role = interaction.options.getRole('role');
    const reason = interaction.options.getString('reason') || 'No reason';

    if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId)
      return interaction.reply({ content: '❌ Cannot manage that role!', ephemeral: true });

    try {
      await member.roles.remove(role, reason);
      bot.db.addModlog(interaction.guildId, 'REMOVEROLE', member.id, interaction.user.id, `${role.name}: ${reason}`);
      await interaction.reply({ content: `✅ Removed ${role} from ${member}.`, ephemeral: true });
    } catch {
      await interaction.reply({ content: '❌ Failed to remove role!', ephemeral: true });
    }
  },
};
