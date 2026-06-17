const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to lock').setRequired(false)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return interaction.reply({ content: '❌ Need Manage Channels!', ephemeral: true });

    const target = interaction.options.getChannel('channel') || interaction.channel;
    try {
      await target.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      bot.db.addModlog(interaction.guildId, 'LOCK', target.id, interaction.user.id, 'Channel locked');
      await interaction.reply({ content: `🔒 ${target} has been locked.`, ephemeral: true });
    } catch {
      await interaction.reply({ content: '❌ Cannot lock channel!', ephemeral: true });
    }
  },
};
