const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Set up starboard for this server')
    .addChannelOption(o => o.setName('channel').setDescription('Channel for starboard').setRequired(true))
    .addIntegerOption(o => o.setName('threshold').setDescription('Stars required').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const channel = interaction.options.getChannel('channel');
    const threshold = interaction.options.getInteger('threshold') || 3;
    
    bot.db.updateGuildSettings(interaction.guildId, { starboard_channel: channel.id, starboard_threshold: threshold });
    
    const embed = new EmbedBuilder()
      .setTitle('⭐ Starboard Configured')
      .setDescription(`Messages with ${threshold}+ ⭐ reactions will be posted to ${channel}`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};
