const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set channel slowmode')
    .addIntegerOption(o => o.setName('seconds').setDescription('Seconds (0 to disable)').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(false)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return interaction.reply({ content: '❌ Need Manage Channels!', ephemeral: true });

    const seconds = Math.max(0, Math.min(21600, interaction.options.getInteger('seconds')));
    const target = interaction.options.getChannel('channel') || interaction.channel;

    try {
      await target.edit({ rateLimitPerUser: seconds });
      const status = seconds === 0 ? 'disabled' : `set to ${seconds}s`;
      bot.db.addModlog(interaction.guildId, 'SLOWMODE', target.id, interaction.user.id, status);
      await interaction.reply({ content: `Slowmode for ${target} is now ${status}.`, ephemeral: true });
    } catch {
      await interaction.reply({ content: '❌ Cannot set slowmode!', ephemeral: true });
    }
  },
};
