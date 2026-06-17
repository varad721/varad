const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

async function handleTicketSelect(interaction, bot) {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'ticket_select') return;

  const category = interaction.values[0];
  const guild = interaction.guild;
  const existing = guild.channels.cache.find(c => c.name === `ticket-${interaction.user.id}-${category}`);
  if (existing) {
    return interaction.reply({ content: `You already have a ticket: ${existing}`, ephemeral: true });
  }

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];

  const supportRole = guild.roles.cache.find(r => r.name === 'Support');
  if (supportRole) overwrites.push({ id: supportRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

  let ticketCategory = guild.channels.cache.find(c => c.name === 'Tickets' && c.type === 4);
  if (!ticketCategory) ticketCategory = await guild.channels.create({ name: 'Tickets', type: 4 });

  try {
    const channel = await guild.channels.create({
      name: `ticket-${interaction.user.id}-${category}`.slice(0, 100),
      parent: ticketCategory.id,
      permissionOverwrites: overwrites,
      topic: `Ticket for ${interaction.user.tag} (${category})`,
    });

    bot.db.saveTicket(guild.id, channel.id, interaction.user.id, category);

    const embed = new EmbedBuilder()
      .setTitle(`Ticket: ${category}`)
      .setDescription('Thank you for opening a ticket. Staff will be with you shortly.')
      .setColor(0x57F287);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Secondary),
    );

    await channel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `Created ${channel}.`, ephemeral: true });
  } catch (e) {
    await interaction.reply({ content: 'Could not create ticket channel.', ephemeral: true });
  }
}

async function handleTicketButton(interaction, bot) {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('ticket_')) return;

  const ticket = bot.db.getTicketByChannel(interaction.channel.id);
  if (!ticket) return interaction.reply({ content: 'Not a ticket.', ephemeral: true });

  if (interaction.customId === 'ticket_claim') {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return interaction.reply({ content: 'Staff only.', ephemeral: true });
    await interaction.channel.edit({ topic: `${interaction.channel.topic || ''} | Claimed by ${interaction.user.tag}` });
    const embed = new EmbedBuilder().setTitle('Ticket Claimed').setDescription(`${interaction.user} claimed this.`).setColor(0x5865F2);
    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.customId === 'ticket_close') {
    if (String(interaction.user.id) !== String(ticket.owner_id) && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return interaction.reply({ content: 'Only owner or staff can close.', ephemeral: true });

    bot.db.closeTicket(interaction.channel.id);
    const owner = interaction.guild.members.cache.get(ticket.owner_id);
    if (owner) await interaction.channel.permissionOverwrites.edit(owner, { SendMessages: false });
    const embed = new EmbedBuilder().setTitle('Ticket Closed').setDescription(`Closed by ${interaction.user}`).setColor(0xFFA500);
    await interaction.reply({ embeds: [embed] });
  }
}

module.exports = { handleTicketSelect, handleTicketButton };
