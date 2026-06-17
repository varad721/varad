const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove latest warning')
    .addUserOption(o => o.setName('member').setDescription('Member').setRequired(true)),

  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({ content: '❌ Need Manage Messages!', ephemeral: true });

    const member = interaction.options.getMember('member');
    if (!member || member.user.bot) return interaction.reply({ content: '❌ Invalid member!', ephemeral: true });

    bot.db.removeWarning(member.id, interaction.guildId);
    bot.db.addModlog(interaction.guildId, 'UNWARN', member.id, interaction.user.id, 'Warning removed');
    const count = bot.db.getWarningCount(member.id, interaction.guildId);
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ Warning Removed').setDescription(`Removed latest warning from ${member}. Remaining: ${count}`).setColor(0x57F287)] });
  },
};
