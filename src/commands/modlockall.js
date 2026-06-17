const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockall')
    .setDescription('Lock all text channels')
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
      return interaction.reply({ content: '❌ Need Administrator!', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });
    let locked = 0, failed = 0;
    for (const channel of interaction.guild.channels.cache.filter(c => c.isTextBased()).values()) {
      try {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
        locked++;
      } catch { failed++; }
    }
    bot.db.addModlog(interaction.guildId, 'LOCKALL', interaction.guildId, interaction.user.id, interaction.options.getString('reason') || 'Server lockdown');
    await interaction.editReply({ content: `Locked ${locked} channel(s). Failed: ${failed}.` });
  },
};
