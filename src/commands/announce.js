const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send announcement')
    .addStringOption(o => o.setName('title').setDescription('Title').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Description').setRequired(true))
    .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(false)),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({ content: '❌ Need Manage Messages!', ephemeral: true });

    const title = interaction.options.getString('title');
    const desc = interaction.options.getString('description');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    const embed = new EmbedBuilder().setTitle(`📢 ${title}`).setDescription(desc).setColor(0x5865F2).setFooter({ text: `Announced by ${interaction.user.tag}` });
    try {
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: `✅ Sent to ${channel}.`, ephemeral: true });
    } catch {
      await interaction.reply({ content: '❌ Cannot send there!', ephemeral: true });
    }
  },
};
