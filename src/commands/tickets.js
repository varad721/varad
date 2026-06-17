const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Setup ticket panel')
    .addSubcommand(sub => sub
      .setName('ticket')
      .setDescription('Create ticket panel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(false))
      .addStringOption(o => o.setName('options').setDescription('Comma: Label:Description').setRequired(false)))
    .addSubcommand(sub => sub
      .setName('panel')
      .setDescription('Alias for ticket panel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(false))
      .addStringOption(o => o.setName('options').setDescription('Comma: Label:Description').setRequired(false))),
  async execute(interaction, bot) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return interaction.reply({ content: 'Need Manage Server!', ephemeral: true });

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const rawOptions = interaction.options.getString('options');

    const defaultOptions = [
      { label: 'Support', value: 'support', description: 'General support' },
      { label: 'Partnership', value: 'partnership', description: 'Partnership requests' },
      { label: 'Appeal', value: 'appeal', description: 'Appeal a punishment' },
      { label: 'Other', value: 'other', description: 'Other requests' },
    ];

    let options = defaultOptions;
    if (rawOptions) {
      options = rawOptions.split(',').map(s => s.trim()).filter(Boolean).map(item => {
        const [label, ...rest] = item.split(':');
        const desc = rest.join(':').trim() || `Open a ${label.trim()} ticket`;
        return new StringSelectMenuOptionBuilder().setLabel(label.trim().slice(0, 100)).setValue(label.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 80) || 'ticket').setDescription(desc.slice(0, 100));
      });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('ticket_select')
      .setPlaceholder('Select ticket type...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);
    const embed = new EmbedBuilder().setTitle('Ticket Panel').setDescription('Choose a ticket type below.').setColor(0x5865F2);

    const msg = await channel.send({ embeds: [embed], components: [row] });
    bot.db.saveTicketPanel(interaction.guildId, channel.id, msg.id);
    await interaction.reply({ content: `Ticket panel created in ${channel}.`, ephemeral: true });
  },
};

module.exports.ticketClose = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket commands')
    .addSubcommand(sub => sub.setName('close').setDescription('Close this ticket')),
  async execute(interaction, bot) {
    const ticket = bot.db.getTicketByChannel(interaction.channel.id);
    if (!ticket) return interaction.reply({ content: 'Not a ticket channel.', ephemeral: true });

    if (String(interaction.user.id) !== String(ticket.owner_id) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return interaction.reply({ content: 'Only owner or staff can close.', ephemeral: true });

    bot.db.closeTicket(interaction.channel.id);
    const owner = interaction.guild.members.cache.get(ticket.owner_id);
    if (owner) await interaction.channel.permissionOverwrites.edit(owner, { SendMessages: false });
    await interaction.reply({ content: 'Ticket closed.' });
  },
};
