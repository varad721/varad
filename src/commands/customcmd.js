const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('customcmd')
    .setDescription('Create a custom command')
    .addStringOption(o => o.setName('name').setDescription('Command name').setRequired(true))
    .addStringOption(o => o.setName('response').setDescription('Command response').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const name = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '');
    const response = interaction.options.getString('response');
    
    if (name.length < 2 || name.length > 20) {
      return interaction.reply({ content: 'Name must be 2-20 characters.', ephemeral: true });
    }
    
    if (response.length > 1000) {
      return interaction.reply({ content: 'Response must be under 1000 characters.', ephemeral: true });
    }
    
    bot.db.addCustomCommand(interaction.guildId, name, response, interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Custom Command Created')
      .setDescription(`Command /${name} has been created!`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.removecustomcmd = {
  data: new SlashCommandBuilder()
    .setName('removecustomcmd')
    .setDescription('Remove a custom command')
    .addStringOption(o => o.setName('name').setDescription('Command name').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const name = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '');
    
    bot.db.removeCustomCommand(interaction.guildId, name);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Custom Command Removed')
      .setDescription(`Command /${name} has been removed.`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.listcustomcmds = {
  data: new SlashCommandBuilder()
    .setName('listcustomcmds')
    .setDescription('List all custom commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const commands = bot.db.getAllCustomCommands(interaction.guildId);
    
    if (commands.length === 0) {
      return interaction.reply({ content: 'No custom commands set up.', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📝 Custom Commands')
      .setColor(0x5865F2)
      .setDescription(commands.map(c => 
        `**/${c.name}** - ${c.response.substring(0, 50)}${c.response.length > 50 ? '...' : ''}`
      ).join('\n\n'))
      .setFooter({ text: `${commands.length} custom command(s)` });
    
    await interaction.reply({ embeds: [embed] });
  },
};
