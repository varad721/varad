// Prefix commands - snipe, purge, warn, unwarn, etc

const prefixCmds = {
  s: async (message, args, bot) => {
    // snipe
    const sniped = bot.snipeCache.get(message.channel.id);
    if (!sniped) return message.reply({ content: '❌ No deleted messages found!' });
    const { content, author, createdAt, attachments } = sniped;
    const embed = {
      title: `Sniped message from ${author.tag}`,
      description: content || '[No content]',
      footer: { text: `Sniped at ${new Date().toLocaleTimeString()}` },
      color: 0x5865F2,
    };
    if (attachments.length > 0) embed.image = { url: attachments[0] };
    return message.reply({ embeds: [embed] });
  },

  p: async (message, args, bot) => {
    // purge
    const amount = parseInt(args[0]) || 1;
    if (amount < 1 || amount > 100) return message.reply({ content: '❌ Amount must be 1-100' });
    try {
      await message.channel.bulkDelete(amount, true);
      const reply = await message.reply({ content: `✅ Deleted ${amount} message(s)` });
      setTimeout(() => reply.delete().catch(() => {}), 3000);
    } catch (e) {
      message.reply({ content: '❌ Error deleting messages' });
    }
  },

  uw: async (message, args, bot) => {
    // unwarn
    const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply({ content: '❌ User not found' });
    const warningCount = bot.db.getWarningCount(target.id, message.guild.id);
    if (warningCount === 0) return message.reply({ content: '❌ No warnings to remove' });
    bot.db.removeWarning(target.id, message.guild.id);
    bot.db.addModlog(message.guild.id, 'UNWARN', target.id, message.author.id, 'Unwarn via prefix');
    return message.reply({ content: `✅ Removed 1 warning from ${target.user.tag}. (${warningCount - 1} remaining)` });
  },

  w: async (message, args, bot) => {
    // warn
    const target = message.mentions.members.first() || await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target) return message.reply({ content: '❌ User not found' });
    const reason = args.slice(1).join(' ') || 'No reason';
    bot.db.addWarning(target.id, message.guild.id, reason, message.author.id);
    bot.db.addModlog(message.guild.id, 'WARN', target.id, message.author.id, reason);
    const count = bot.db.getWarningCount(target.id, message.guild.id);
    return message.reply({ content: `⚠️ ${target.user.tag} warned. (${count} total warnings)` });
  },

  sk: async (message, args, bot) => {
    // skip
    if (!bot.musicQueues.has(message.guild.id)) return message.reply({ content: '❌ No music playing' });
    bot.musicQueues.get(message.guild.id).shift();
    return message.reply({ content: '⏭️ Skipped current song' });
  },

  pause: async (message, args, bot) => {
    // pause
    if (!bot.musicConnections.has(message.guild.id)) return message.reply({ content: '❌ No voice connection' });
    const player = bot.musicPlayers.get(message.guild.id);
    if (player) player.pause();
    return message.reply({ content: '⏸️ Music paused' });
  },

  resume: async (message, args, bot) => {
    // resume
    if (!bot.musicConnections.has(message.guild.id)) return message.reply({ content: '❌ No voice connection' });
    const player = bot.musicPlayers.get(message.guild.id);
    if (player) player.unpause();
    return message.reply({ content: '▶️ Music resumed' });
  },

  stop: async (message, args, bot) => {
    // stop music
    if (!bot.musicConnections.has(message.guild.id)) return message.reply({ content: '❌ No voice connection' });
    const connection = bot.musicConnections.get(message.guild.id);
    connection.destroy();
    bot.musicConnections.delete(message.guild.id);
    bot.musicQueues.delete(message.guild.id);
    return message.reply({ content: '⏹️ Music stopped' });
  },

  np: async (message, args, bot) => {
    // now playing
    if (!bot.musicNowPlaying.has(message.guild.id)) return message.reply({ content: '❌ No music playing' });
    const song = bot.musicNowPlaying.get(message.guild.id);
    return message.reply({ content: `🎵 Now playing: **${song.title}** by ${song.author}` });
  },

  q: async (message, args, bot) => {
    // queue
    if (!bot.musicQueues.has(message.guild.id) || bot.musicQueues.get(message.guild.id).length === 0) {
      return message.reply({ content: '❌ Queue is empty' });
    }
    const queue = bot.musicQueues.get(message.guild.id).slice(0, 10);
    const list = queue.map((s, i) => `${i + 1}. ${s.title} (${s.duration})`).join('\n');
    return message.reply({ content: `🎵 **Queue** (${bot.musicQueues.get(message.guild.id).length} songs):\n${list}` });
  },
};

module.exports = prefixCmds;
