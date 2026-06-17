const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create custom embed')
    .addStringOption(o => o.setName('title').setDescription('Title').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Description').setRequired(true))
    .addStringOption(o => o.setName('color').setDescription('Hex color').setRequired(false))
    .addStringOption(o => o.setName('image').setDescription('Image URL').setRequired(false)),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.reply({ content: '❌ Need Manage Messages!', ephemeral: true });

    const title = interaction.options.getString('title');
    const desc = interaction.options.getString('description');
    let color = 0x5865F2;
    try { color = parseInt((interaction.options.getString('color') || '5865F2').replace('#', ''), 16); } catch {}
    const image = interaction.options.getString('image');

    const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color).setFooter({ text: `By ${interaction.user.tag}` });
    if (image) embed.setImage(image);
    await interaction.reply({ embeds: [embed] });
  },
};
