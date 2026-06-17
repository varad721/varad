const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const GIVEAWAY_EMOJI = '🎉';

function parseDuration(dur) {
  const m = dur.match(/^(\d+)([smhd])$/);
  if (!m) return null;
  const mult = { s: 1, m: 60, h: 3600, d: 86400 };
  return parseInt(m[1]) * (mult[m[2]] || 60);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway commands')
    .addSubcommand(sub => sub
      .setName('start')
      .setDescription('Start a giveaway')
      .addStringOption(o => o.setName('prize').setDescription('Prize').setRequired(true))
      .addStringOption(o => o.setName('duration').setDescription('10m, 2h, 1d').setRequired(true))
      .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setRequired(false))
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(false)))
    .addSubcommand(sub => sub
      .setName('end')
      .setDescription('End a giveaway')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true)))
    .addSubcommand(sub => sub
      .setName('reroll')
      .setDescription('Reroll winners')
      .addStringOption(o => o.setName('message_id').setDescription('Message ID').setRequired(true))),
  async execute(interaction, bot) {
    const sub = interaction.options.getSubcommand();

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return interaction.reply({ content: 'Need Manage Server!', ephemeral: true });

    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const duration = interaction.options.getString('duration');
      const winners = Math.min(20, Math.max(1, interaction.options.getInteger('winners') || 1));
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const seconds = parseDuration(duration);
      if (!seconds || seconds < 10) return interaction.reply({ content: 'Use 10m, 2h, or 1d. Min 10s.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(`🎉 Giveaway: ${prize}`)
        .setDescription(`React with ${GIVEAWAY_EMOJI} to enter.\nWinners: **${winners}**\nEnds: <t:${Math.floor((Date.now() + seconds * 1000) / 1000)}:R>`)
        .setColor(0xFFA500)
        .setFooter({ text: `Hosted by ${interaction.user.tag}` });

      const msg = await channel.send({ embeds: [embed] });
      await msg.react(GIVEAWAY_EMOJI);

      const task = setTimeout(async () => {
        const fetched = await msg.fetch().catch(() => null);
        if (!fetched) return;
        const reaction = fetched.reactions.cache.get(GIVEAWAY_EMOJI);
        const entries = reaction ? (await reaction.users.fetch()).filter(u => !u.bot) : [];
        if (!entries.size) { await channel.send(`No valid entries for **${prize}**.`); return; }
        const winnersList = entries.random(Math.min(winners, entries.size));
        await channel.send(`🎉 Giveaway ended! Winner(s) for **${prize}**: ${winnersList.map(u => u.toString()).join(', ')}`);
      }, seconds * 1000);

      bot.giveawayTasks.set(msg.id, task);
      await interaction.reply({ content: `Giveaway started in ${channel}. Msg ID: \`${msg.id}\``, ephemeral: true });
    }

    if (sub === 'end') {
      const msgId = interaction.options.getString('message_id');
      const task = bot.giveawayTasks.get(parseInt(msgId));
      if (task) clearTimeout(task);
      await interaction.reply({ content: 'Giveaway ended.', ephemeral: true });
    }

    if (sub === 'reroll') {
      const msgId = interaction.options.getString('message_id');
      try {
        const msg = await interaction.channel.messages.fetch(msgId);
        const reaction = msg.reactions.cache.get(GIVEAWAY_EMOJI);
        const entries = reaction ? (await reaction.users.fetch()).filter(u => !u.bot) : [];
        if (!entries.size) return interaction.reply({ content: 'No entries.', ephemeral: true });
        const winners = entries.random(Math.min(1, entries.size));
        await interaction.reply(`🎉 Rerolled winner: ${winners.map(u => u.toString()).join(', ')}`);
      } catch {
        await interaction.reply({ content: 'Message not found.', ephemeral: true });
      }
    }
  },
};
