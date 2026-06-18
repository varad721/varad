const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xprate')
    .setDescription('Set XP rate multiplier')
    .addIntegerOption(o => o.setName('multiplier').setDescription('XP multiplier (1-10)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const multiplier = interaction.options.getInteger('multiplier');
    
    if (multiplier < 1 || multiplier > 10) {
      return interaction.reply({ content: 'Multiplier must be between 1 and 10.', ephemeral: true });
    }
    
    bot.db.updateGuildSettings(interaction.guildId, { xp_multiplier: multiplier });
    
    const embed = new EmbedBuilder()
      .setTitle('✅ XP Rate Updated')
      .setDescription(`XP gain is now multiplied by ${multiplier}x`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.toggleleveling = {
  data: new SlashCommandBuilder()
    .setName('toggleleveling')
    .setDescription('Toggle leveling system')
    .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable leveling').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const enabled = interaction.options.getBoolean('enabled');
    
    bot.db.updateGuildSettings(interaction.guildId, { leveling_enabled: enabled });
    
    const embed = new EmbedBuilder()
      .setTitle(enabled ? '✅ Leveling Enabled' : '⚠️ Leveling Disabled')
      .setDescription(`Leveling system is now ${enabled ? 'enabled' : 'disabled'}`)
      .setColor(enabled ? 0x57F287 : 0xED4245);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.setlevelchannel = {
  data: new SlashCommandBuilder()
    .setName('setlevelchannel')
    .setDescription('Set channel for level up announcements')
    .addChannelOption(o => o.setName('channel').setDescription('Level up channel').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const channel = interaction.options.getChannel('channel');
    
    bot.db.updateGuildSettings(interaction.guildId, { level_channel: channel.id });
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Level Channel Set')
      .setDescription(`Level up announcements will be sent to ${channel}`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};
