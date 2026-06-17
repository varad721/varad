const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlockall')
    .setDescription('Unlock all text channels')
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
      return interaction.reply({ content: '❌ Need Administrator!', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });
    let unlocked = 0, failed = 0;
    for (const channel of interaction.guild.channels.cache.filter(c => c.isTextBased()).values()) {
      try {
        await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
        unlocked++;
      } catch { failed++; }
    }
    bot.db.addModlog(interaction.guildId, 'UNLOCKALL', interaction.guildId, interaction.user.id, interaction.options.getString('reason') || 'Lockdown lifted');
    await interaction.editReply({ content: `Unlocked ${unlocked} channel(s). Failed: ${failed}.` });
  },
};
