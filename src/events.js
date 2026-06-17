const { Events, EmbedBuilder } = require('discord.js');

function findWelcomeChannel(guild) {
  const channels = guild.channels.cache.filter(c => c.isTextBased());
  return channels.find(c => c.name.toLowerCase().includes('welcome'))
    || channels.find(c => c.name === 'general')
    || channels.find(c => c.permissionsFor(guild.members.me)?.has('SendMessages'));
}

function registerEvents(bot) {
  bot.on(Events.GuildMemberAdd, async (member) => {
    try {
      bot.db.createGuildSettings(member.guild.id);

      const embed = new EmbedBuilder()
        .setTitle(`Welcome ${member.user.username}!`)
        .setDescription(`Welcome to **${member.guild.name}**!\n\nPlease read the rules and enjoy your stay!`)
        .setColor(0x57F287)
        .addFields({ name: 'Member Count', value: String(member.guild.memberCount), inline: true })
        .setFooter({ text: `User ID: ${member.id}` });

      if (member.user.displayAvatarURL()) {
        embed.setThumbnail(member.user.displayAvatarURL());
      }

      const channel = findWelcomeChannel(member.guild);
      if (channel) {
        await channel.send({ content: `Welcome ${member}!`, embeds: [embed] });
      }
    } catch (err) {
      console.error('Member join event error:', err);
    }
  });

  bot.on(Events.GuildMemberRemove, (member) => {
    console.log(`${member.user.tag} left ${member.guild.name}`);
  });

  bot.on(Events.MessageUpdate, (before, after) => {
    if (before.author?.bot || before.content === after.content) return;
    console.log(`Message edited by ${before.author?.tag} in ${before.guild?.name}`);
  });

  bot.on(Events.GuildBanAdd, (ban) => {
    console.warn(`${ban.user.tag} was banned from ${ban.guild.name}`);
  });

  bot.on(Events.GuildBanRemove, (ban) => {
    console.log(`${ban.user.tag} was unbanned from ${ban.guild.name}`);
  });

  bot.on(Events.GuildDelete, (guild) => {
    console.warn(`Bot removed from guild: ${guild.name} (${guild.id})`);
  });
}

module.exports = { registerEvents };
