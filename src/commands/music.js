const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const play = require('play-dl');

async function getOrCreateConnection(interaction) {
  const member = interaction.member;
  if (!member.voice.channel) return null;
  const channel = member.voice.channel;
  const existing = interaction.guild.voice?.connection;
  if (existing) return existing;
  return joinVoiceChannel({ channelId: channel.id, guildId: channel.guild.id, adapterCreator: channel.guild.voiceAdapterCreator });
}

async function ensureVoice(interaction) {
  const member = interaction.member;
  if (!member.voice.channel) {
    await interaction.followUp({ content: 'Join a voice channel first.', ephemeral: true });
    return null;
  }
  return member.voice.channel;
}

async function playNext(guildId, bot) {
  const queue = bot.musicQueues.get(guildId) || [];
  const loopMode = bot.musicLoopModes?.get(guildId) || 'off';
  const current = bot.musicNowPlaying.get(guildId);
  
  // Handle loop modes
  if (loopMode === 'song' && current) {
    queue.unshift(current);
  } else if (loopMode === 'queue' && current) {
    queue.push(current);
  }
  
  if (!queue.length) {
    bot.musicNowPlaying.delete(guildId);
    const connection = bot.musicConnections?.get(guildId);
    if (connection) connection.destroy();
    bot.musicConnections?.delete(guildId);
    bot.musicPlayers?.delete(guildId);
    return;
  }
  
  const song = queue.shift();
  bot.musicNowPlaying.set(guildId, song);

  try {
    const stream = await play.stream(song.streamUrl);
    const resource = createAudioResource(stream.stream, { inputType: stream.type });

    if (!bot.musicPlayers) bot.musicPlayers = new Map();
    let player = bot.musicPlayers.get(guildId);
    if (!player) {
      player = createAudioPlayer();
      bot.musicPlayers.set(guildId, player);
    }
    player.play(resource);

    player.once(AudioPlayerStatus.Idle, () => {
      if (queue.length || loopMode !== 'off') playNext(guildId, bot);
      else {
        bot.musicNowPlaying.delete(guildId);
        const connection = bot.musicConnections?.get(guildId);
        if (connection) connection.destroy();
        bot.musicConnections?.delete(guildId);
        bot.musicPlayers?.delete(guildId);
      }
    });

    player.on('error', () => playNext(guildId, bot));
  } catch {
    playNext(guildId, bot);
  }
}

// ─── Play ───
const playCmd = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song')
    .addStringOption(o => o.setName('song').setDescription('Search or URL').setRequired(true)),
  async execute(interaction, bot) {
    await interaction.deferReply();
    const voiceChannel = await ensureVoice(interaction);
    if (!voiceChannel) return;

    const query = interaction.options.getString('song');
    let songInfo;
    try {
      if (query.match(/^https?:\/\//)) {
        songInfo = await play.video_info(query);
      } else {
        const results = await play.search(query, { limit: 1 });
        if (!results.length) { await interaction.followUp('No results.'); return; }
        songInfo = await play.video_info(results[0].url);
      }
    } catch {
      await interaction.followUp('Could not load song.'); return;
    }

    const data = songInfo.video_details;
    const song = {
      title: data.title, url: data.url,
      requester: interaction.user.displayName,
      duration: data.durationInSec,
      thumbnail: data.thumbnails?.[0]?.url,
      streamUrl: data.url,
    };

    const guildId = interaction.guildId;
    if (!bot.musicQueues) bot.musicQueues = new Map();
    if (!bot.musicQueues.has(guildId)) bot.musicQueues.set(guildId, []);
    if (!bot.musicConnections) bot.musicConnections = new Map();
    if (!bot.musicPlayers) bot.musicPlayers = new Map();

    const queue = bot.musicQueues.get(guildId);
    const player = bot.musicPlayers.get(guildId);

    if (player && (player.state.status === AudioPlayerStatus.Playing || player.state.status === AudioPlayerStatus.Paused)) {
      queue.push(song);
      const embed = new EmbedBuilder().setTitle('Added to Queue').setDescription(`**Song:** [${song.title}](${song.url})`).addFields({ name: 'Position', value: `${queue.length}` }).setColor(0x800080).setFooter({ text: `Requested by ${interaction.user.tag}` });
      return interaction.followUp({ embeds: [embed] });
    }

    // Connect and wait until ready (avoids voice 4006 on hosting panels)
    let connection = bot.musicConnections.get(guildId);
    if (connection) {
      try { connection.destroy(); } catch {}
      bot.musicConnections.delete(guildId);
    }

    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
    });
    bot.musicConnections.set(guildId, connection);

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch {
      connection.destroy();
      bot.musicConnections.delete(guildId);
      await interaction.followUp('Could not connect to voice channel. Try again.');
      return;
    }

    const newPlayer = createAudioPlayer();
    bot.musicPlayers.set(guildId, newPlayer);
    connection.subscribe(newPlayer);

    queue.push(song);
    await playNext(guildId, bot);

    const embed = new EmbedBuilder().setTitle('Now Playing').setDescription(`**Song:** [${song.title}](${song.url})`).setColor(0x800080);
    if (song.thumbnail) embed.setThumbnail(song.thumbnail);
    embed.setFooter({ text: `Requested by ${interaction.user.tag}` });
    await interaction.followUp({ embeds: [embed] });
  },
};

// ─── Skip ───
const skipCmd = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Skip current song'),
  async execute(interaction, bot) {
    const player = bot.musicPlayers?.get(interaction.guildId);
    if (!player) return interaction.reply({ content: 'Nothing playing.', ephemeral: true });
    player.stop();
    await interaction.reply('Skipped.');
  },
};

// ─── Stop ───
const stopCmd = {
  data: new SlashCommandBuilder().setName('stop').setDescription('Stop music'),
  async execute(interaction, bot) {
    const guildId = interaction.guildId;
    if (bot.musicQueues) bot.musicQueues.set(guildId, []);
    bot.musicNowPlaying?.delete(guildId);
    const connection = bot.musicConnections?.get(guildId);
    if (connection) connection.destroy();
    bot.musicConnections?.delete(guildId);
    bot.musicPlayers?.delete(guildId);
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('Music Stopped').setDescription('Playback stopped.').setColor(0xED4245)] });
  },
};

// ─── Queue ───
const queueCmd = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Show queue'),
  async execute(interaction, bot) {
    const guildId = interaction.guildId;
    const queue = bot.musicQueues?.get(guildId) || [];
    const current = bot.musicNowPlaying?.get(guildId);
    const embed = new EmbedBuilder().setTitle('Music Queue').setColor(0x800080);
    if (current) embed.addFields({ name: 'Now Playing', value: `[${current.title}](${current.url})` });
    queue.slice(0, 10).forEach((s, i) => embed.addFields({ name: `${i + 1}. ${s.title}`, value: `Requested by ${s.requester}` }));
    if (queue.length > 10) embed.setFooter({ text: `... and ${queue.length - 10} more` });
    await interaction.reply({ embeds: [embed] });
  },
};

// ─── Now Playing ───
const nowplayingCmd = {
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Current song'),
  async execute(interaction, bot) {
    const current = bot.musicNowPlaying?.get(interaction.guildId);
    if (!current) return interaction.reply({ embeds: [new EmbedBuilder().setTitle('Now Playing').setDescription('Nothing playing.').setColor(0x9CA3AF)] });
    const embed = new EmbedBuilder().setTitle('Now Playing').setDescription(`**Song:** [${current.title}](${current.url})\n**Requested by:** ${current.requester}`).setColor(0x800080);
    if (current.thumbnail) embed.setThumbnail(current.thumbnail);
    await interaction.reply({ embeds: [embed] });
  },
};

// ─── Pause ───
const pauseCmd = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Pause music'),
  async execute(interaction, bot) {
    const player = bot.musicPlayers?.get(interaction.guildId);
    if (!player) return interaction.reply({ content: 'Nothing playing.', ephemeral: true });
    player.pause();
    await interaction.reply('Paused.');
  },
};

// ─── Resume ───
const resumeCmd = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Resume music'),
  async execute(interaction, bot) {
    const player = bot.musicPlayers?.get(interaction.guildId);
    if (!player) return interaction.reply({ content: 'Nothing paused.', ephemeral: true });
    player.unpause();
    await interaction.reply('Resumed.');
  },
};

module.exports = playCmd;
module.exports.skip = skipCmd;
module.exports.stop = stopCmd;
module.exports.queue = queueCmd;
module.exports.nowplaying = nowplayingCmd;
module.exports.pause = pauseCmd;
module.exports.resume = resumeCmd;

// ─── Shuffle ───
const shuffleCmd = {
  data: new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the queue'),
  async execute(interaction, bot) {
    const guildId = interaction.guildId;
    const queue = bot.musicQueues?.get(guildId);
    if (!queue || queue.length < 2) return interaction.reply({ content: 'Need at least 2 songs in queue.', ephemeral: true });
    
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔀 Queue Shuffled').setColor(0x5865F2)] });
  },
};

// ─── Loop ───
const loopCmd = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Toggle loop mode')
    .addStringOption(o => o.setName('mode').setDescription('Loop mode').setRequired(false).addChoices(
      { name: 'Off', value: 'off' },
      { name: 'Song', value: 'song' },
      { name: 'Queue', value: 'queue' }
    )),
  async execute(interaction, bot) {
    const mode = interaction.options.getString('mode') || 'song';
    const guildId = interaction.guildId;
    
    if (!bot.musicLoopModes) bot.musicLoopModes = new Map();
    bot.musicLoopModes.set(guildId, mode);
    
    const modeNames = { off: 'Disabled', song: 'Current Song', queue: 'Entire Queue' };
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔁 Loop Mode').setDescription(`Loop: ${modeNames[mode]}`).setColor(0x5865F2)] });
  },
};

// ─── Volume ───
const volumeCmd = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set volume')
    .addIntegerOption(o => o.setName('level').setDescription('Volume 0-100').setRequired(false)),
  async execute(interaction, bot) {
    const level = interaction.options.getInteger('level') ?? 50;
    if (level < 0 || level > 100) return interaction.reply({ content: 'Volume must be 0-100.', ephemeral: true });
    
    const guildId = interaction.guildId;
    if (!bot.musicVolumes) bot.musicVolumes = new Map();
    bot.musicVolumes.set(guildId, level);
    
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔊 Volume').setDescription(`Set to ${level}%`).setColor(0x5865F2)] });
  },
};

// ─── Playlist ───
const playlistCmd = {
  data: new SlashCommandBuilder()
    .setName('playlist')
    .setDescription('Play a playlist')
    .addStringOption(o => o.setName('url').setDescription('Playlist URL').setRequired(true)),
  async execute(interaction, bot) {
    await interaction.deferReply();
    const voiceChannel = await ensureVoice(interaction);
    if (!voiceChannel) return;

    const url = interaction.options.getString('url');
    let playlistInfo;
    try {
      playlistInfo = await play.playlist_info(url, { incomplete: true });
    } catch {
      await interaction.followUp('Could not load playlist.'); return;
    }

    const guildId = interaction.guildId;
    if (!bot.musicQueues) bot.musicQueues = new Map();
    if (!bot.musicQueues.has(guildId)) bot.musicQueues.set(guildId, []);
    if (!bot.musicConnections) bot.musicConnections = new Map();
    if (!bot.musicPlayers) bot.musicPlayers = new Map();

    const queue = bot.musicQueues.get(guildId);
    const player = bot.musicPlayers.get(guildId);

    // Add all videos to queue
    for (const video of playlistInfo.videos) {
      const song = {
        title: video.title,
        url: video.url,
        requester: interaction.user.displayName,
        duration: video.durationInSec,
        thumbnail: video.thumbnails?.[0]?.url,
        streamUrl: video.url,
      };
      queue.push(song);
    }

    // If nothing playing, start playing
    if (!player || (player.state.status !== AudioPlayerStatus.Playing && player.state.status !== AudioPlayerStatus.Paused)) {
      let connection = bot.musicConnections.get(guildId);
      if (connection) {
        try { connection.destroy(); } catch {}
        bot.musicConnections.delete(guildId);
      }

      connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });
      bot.musicConnections.set(guildId, connection);

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      } catch {
        connection.destroy();
        bot.musicConnections.delete(guildId);
        await interaction.followUp('Could not connect to voice channel.');
        return;
      }

      const newPlayer = createAudioPlayer();
      bot.musicPlayers.set(guildId, newPlayer);
      connection.subscribe(newPlayer);

      await playNext(guildId, bot);
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Playlist Added')
      .setDescription(`Added ${playlistInfo.videos.length} songs to queue`)
      .setColor(0x800080)
      .setFooter({ text: `Requested by ${interaction.user.tag}` });
    await interaction.followUp({ embeds: [embed] });
  },
};

// ─── Seek ───
const seekCmd = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Seek to position')
    .addIntegerOption(o => o.setName('seconds').setDescription('Position in seconds').setRequired(true)),
  async execute(interaction, bot) {
    const seconds = interaction.options.getInteger('seconds');
    const guildId = interaction.guildId;
    const current = bot.musicNowPlaying?.get(guildId);
    
    if (!current) return interaction.reply({ content: 'Nothing playing.', ephemeral: true });
    
    // Note: play-dl doesn't support seeking directly, this would need a different approach
    // For now, just acknowledge the command
    await interaction.reply({ content: 'Seek feature requires additional audio processing. Coming soon!', ephemeral: true });
  },
};

module.exports.shuffle = shuffleCmd;
module.exports.loop = loopCmd;
module.exports.volume = volumeCmd;
module.exports.playlist = playlistCmd;
module.exports.seek = seekCmd;
