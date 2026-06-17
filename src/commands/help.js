const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Show commands'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🤖 Advanced Discord Bot - Commands')
      .setDescription('All commands use `/` prefix')
      .setColor(0x5865F2)
      .addFields(
        { name: '🛡️ Moderation', value: '/warn, /kick, /ban, /mute, /unmute, /clear, /nuke, /lock, /unlock, /lockall, /unlockall, /slowmode, /addrole, /removerole, /warnings, /unwarn, /modlogs, /snipe', inline: false },
        { name: '🎫 Tickets', value: '/setup ticket panel, /ticket close', inline: false },
        { name: '🤖 AI', value: '/ask <question>', inline: false },
        { name: '🎉 Giveaways', value: '/giveaway start, /giveaway end, /giveaway reroll', inline: false },
        { name: '🎵 Music', value: '/play, /pause, /resume, /skip, /stop, /queue, /nowplaying', inline: false },
        { name: '📊 Utility', value: '/serverinfo, /userinfo, /avatar, /servericon, /poll, /say, /ping, /prefix, /announce, /embed, /suggest, /report', inline: false },
        { name: '🎮 Fun', value: '/joke, /dice, /8ball, /coinflip, /rps, /number, /guess, /pick', inline: false },
      )
      .setFooter({ text: 'Owner commands are hidden' });
    await interaction.reply({ embeds: [embed] });
  },
};
