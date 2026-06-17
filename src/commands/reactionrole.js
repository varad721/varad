const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ComponentType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Create a reaction role message')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to send message').setRequired(true))
    .addStringOption(o => o.setName('title').setDescription('Message title').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Message description').setRequired(true))
    .addStringOption(o => o.setName('emoji').setDescription('Emoji for button').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const channel = interaction.options.getChannel('channel');
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    const emoji = interaction.options.getString('emoji');
    const role = interaction.options.getRole('role');
    
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(0x5865F2);
    
    const button = new ButtonBuilder()
      .setCustomId(`rr_${role.id}`)
      .setLabel('Get Role')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(emoji);
    
    const row = new ActionRowBuilder().addComponents(button);
    
    const message = await channel.send({ embeds: [embed], components: [row] });
    
    bot.db.addReactionRole(interaction.guildId, message.id, channel.id, role.id, emoji);
    
    await interaction.reply({ content: `Reaction role created in ${channel}!`, ephemeral: true });
  },
};

module.exports.removereactionrole = {
  data: new SlashCommandBuilder()
    .setName('removereactionrole')
    .setDescription('Remove a reaction role')
    .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true))
    .addStringOption(o => o.setName('emoji').setDescription('Emoji').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');
    
    bot.db.removeReactionRole(interaction.guildId, messageId, emoji);
    
    await interaction.reply({ content: 'Reaction role removed!', ephemeral: true });
  },
};

module.exports.listreactionroles = {
  data: new SlashCommandBuilder()
    .setName('listreactionroles')
    .setDescription('List all reaction roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const roles = bot.db.getAllReactionRoles(interaction.guildId);
    
    if (roles.length === 0) {
      return interaction.reply({ content: 'No reaction roles set up.', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🎭 Reaction Roles')
      .setColor(0x5865F2)
      .setDescription(roles.map(r => 
        `${r.emoji} - <@&${r.role_id}> (Message: ${r.message_id})`
      ).join('\n'));
    
    await interaction.reply({ embeds: [embed] });
  },
};
