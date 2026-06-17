const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to unlock').setRequired(false)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return interaction.reply({ content: '❌ Need Manage Channels!', ephemeral: true });

    const target = interaction.options.getChannel('channel') || interaction.channel;
    try {
      await target.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
      bot.db.addModlog(interaction.guildId, 'UNLOCK', target.id, interaction.user.id, 'Channel unlocked');
      await interaction.reply({ content: `🔓 ${target} has been unlocked.`, ephemeral: true });
    } catch {
      await interaction.reply({ content: '❌ Cannot unlock channel!', ephemeral: true });
    }
  },
};
