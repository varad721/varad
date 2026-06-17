const { SlashCommandBuilder, PermissionFlagsBits, AllowedMentions } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make bot say something')
    .addStringOption(o => o.setName('message').setDescription('Message').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(false)),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({ content: '❌ Need Manage Messages!', ephemeral: true });

    const msg = interaction.options.getString('message');
    if (msg.length > 2000) return interaction.reply({ content: 'Max 2000 chars.', ephemeral: true });
    if (/@everyone|@here|<@&\d+>/.test(msg)) return interaction.reply({ content: 'Mentions blocked.', ephemeral: true });

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    try {
      await channel.send({ content: msg, allowedMentions: { parse: [] } });
      await interaction.reply({ content: `✅ Sent to ${channel}.`, ephemeral: true });
    } catch {
      await interaction.reply({ content: '❌ Cannot send!', ephemeral: true });
    }
  },
};
