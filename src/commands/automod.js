const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Toggle auto-moderation')
    .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable auto-mod').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const enabled = interaction.options.getBoolean('enabled');
    
    bot.db.updateGuildSettings(interaction.guildId, { auto_mod_enabled: enabled });
    
    const embed = new EmbedBuilder()
      .setTitle(enabled ? '✅ Auto-Mod Enabled' : '⚠️ Auto-Mod Disabled')
      .setDescription(`Auto-moderation is now ${enabled ? 'enabled' : 'disabled'}`)
      .setColor(enabled ? 0x57F287 : 0xED4245);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.spamthreshold = {
  data: new SlashCommandBuilder()
    .setName('spamthreshold')
    .setDescription('Set spam detection threshold')
    .addIntegerOption(o => o.setName('messages').setDescription('Messages per time window').setRequired(true))
    .addIntegerOption(o => o.setName('seconds').setDescription('Time window in seconds').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const messages = interaction.options.getInteger('messages');
    const seconds = interaction.options.getInteger('seconds');
    
    if (messages < 2 || messages > 20) {
      return interaction.reply({ content: 'Messages must be between 2 and 20.', ephemeral: true });
    }
    
    if (seconds < 5 || seconds > 60) {
      return interaction.reply({ content: 'Seconds must be between 5 and 60.', ephemeral: true });
    }
    
    bot.db.updateGuildSettings(interaction.guildId, { spam_threshold: messages });
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Spam Threshold Updated')
      .setDescription(`Users will be muted if they send ${messages}+ messages in ${seconds} seconds.`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.addbypass = {
  data: new SlashCommandBuilder()
    .setName('addbypass')
    .setDescription('Add a user to auto-mod bypass list')
    .addUserOption(o => o.setName('user').setDescription('User to bypass').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    
    bot.db.addBypassUser(interaction.guildId, user.id, interaction.user.id, reason);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Bypass User Added')
      .setDescription(`${user} will bypass auto-moderation.`)
      .addFields({ name: 'Reason', value: reason })
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.removebypass = {
  data: new SlashCommandBuilder()
    .setName('removebypass')
    .setDescription('Remove a user from auto-mod bypass list')
    .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const user = interaction.options.getUser('user');
    
    bot.db.removeBypassUser(interaction.guildId, user.id);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Bypass User Removed')
      .setDescription(`${user} will no longer bypass auto-moderation.`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.bypasslist = {
  data: new SlashCommandBuilder()
    .setName('bypasslist')
    .setDescription('List all bypass users')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const users = bot.db.getBypassUsers(interaction.guildId);
    
    if (users.length === 0) {
      return interaction.reply({ content: 'No bypass users set.', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Auto-Mod Bypass List')
      .setColor(0x5865F2)
      .setDescription(users.map(u => 
        `<@${u.user_id}> - ${u.reason || 'No reason'} (Added by <@${u.added_by}>)`
      ).join('\n\n'))
      .setFooter({ text: `${users.length} bypass user(s)` });
    
    await interaction.reply({ embeds: [embed] });
  },
};
