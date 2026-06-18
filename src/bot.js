const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const DB = require('./database');
const SecurityManager = require('./security');
const prefixCmds = require('./prefixCommands');

class Bot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    this.db = new DB();
    this.security = new SecurityManager();
    this.ownerIds = config.ownerIds;
    this.ownerId = config.ownerId;
    this.commands = new Collection();
    this.snipeCache = new Map();
    this.musicQueues = new Map();
    this.musicConnections = new Map();
    this.musicPlayers = new Map();
    this.musicNowPlaying = new Map();
    this.musicLoopModes = new Map();
    this.musicVolumes = new Map();
    this.giveawayTasks = new Map();
    this.numberGames = new Map();

    this.on(Events.ClientReady, this.onReady);
    this.on(Events.MessageCreate, this.onMessage);
    this.on(Events.InteractionCreate, this.onInteraction);
    this.on(Events.MessageDelete, this.onMessageDelete);
    this.on(Events.MessageReactionAdd, this.onReactionAdd);
    this.on(Events.GuildCreate, this.onGuildJoin);
    this.on(Events.GuildMemberAdd, this.onMemberJoin);
    this.on(Events.Error, console.error);
  }

  async onReady() {
    console.log(`Bot logged in as ${this.user.tag} (${this.user.id})`);
    this.user.setActivity('/help', { type: 2 });

    const commands = [];
    const cmdDir = path.join(__dirname, 'commands');
    if (fs.existsSync(cmdDir)) {
      for (const file of fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'))) {
        if (file === 'ticketHandler.js') continue;
        try {
          const mod = require(path.join(cmdDir, file));
          // Single command export
          if (mod.data && mod.execute) {
            this.commands.set(mod.data.name, mod);
            commands.push(mod.data);
          }
          // Multi-command export (fun.js, music.js, etc.)
          for (const key of Object.keys(mod)) {
            const cmd = mod[key];
            if (key !== 'data' && key !== 'execute' && cmd && cmd.data && cmd.execute) {
              if (!this.commands.has(cmd.data.name)) {
                this.commands.set(cmd.data.name, cmd);
                commands.push(cmd.data);
              }
            }
          }
        } catch (e) {
          console.error(`Failed to load command ${file}:`, e);
        }
      }
    }
    console.log(`Loaded ${commands.length} slash commands`);

    const guildId = process.env.GUILD_ID;
    try {
      if (guildId) {
        await this.application.commands.set(commands, guildId);
        console.log(`Slash commands synced to guild ${guildId}`);
      } else {
        await this.application.commands.set(commands);
        console.log('Slash commands synced globally');
      }
    } catch (e) {
      console.error('Failed to sync commands:', e);
    }

    // Start reminder checking interval
    this.startReminderChecker();
  }

  startReminderChecker() {
    setInterval(async () => {
      try {
        const dueReminders = this.db.getDueReminders();
        for (const reminder of dueReminders) {
          try {
            const channel = await this.channels.fetch(reminder.channel_id);
            if (channel) {
              await channel.send({
                content: `<@${reminder.user_id}> ⏰ Reminder: ${reminder.message}`,
              });
            }
            this.db.deleteReminder(reminder.id);
          } catch (e) {
            console.error('Failed to send reminder:', e);
          }
        }
      } catch (e) {
        console.error('Reminder checker error:', e);
      }
    }, 30000);
  }

  async onMessage(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    this.db.createGuildSettings(message.guild.id);
    const settings = this.db.getGuildSettings(message.guild.id);
    const isOwner = this.ownerIds.includes(String(message.author.id));
    const isBypassed = this.db.isBypassUser(message.guild.id, message.author.id);

    // Handle prefix commands (owner only)
    const prefix = settings?.prefix || config.defaultSettings.prefix;
    
    if (message.content.startsWith(prefix) && isOwner) {
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const cmd = args.shift().toLowerCase();
      
      if (prefixCmds[cmd]) {
        try {
          await prefixCmds[cmd](message, args, this);
        } catch (e) {
          console.error(`Error executing prefix command ${cmd}:`, e);
          message.reply({ content: '❌ Command failed', ephemeral: true }).catch(() => {});
        }
        return;
      }
    }

    if (isOwner || isBypassed) return;

    // XP gain system
    if (settings && settings.leveling_enabled !== 0) {
      const multiplier = settings.xp_multiplier || 1;
      const xpGain = Math.floor((Math.random() * 15 + 10) * multiplier);
      const levelResult = this.db.addXP(message.guild.id, message.author.id, xpGain);
      
      if (levelResult.leveledUp) {
        const rewards = this.db.getLevelRewards(message.guild.id);
        const reward = rewards.find(r => r.level === levelResult.newLevel);
        
        const levelChannel = settings.level_channel ? await message.guild.channels.fetch(settings.level_channel).catch(() => null) : message.channel;
        
        if (reward) {
          try {
            await message.member.roles.add(reward.role_id);
            if (levelChannel) {
              levelChannel.send({
                content: `🎉 ${message.author} leveled up to **${levelResult.newLevel}** and received the <@&${reward.role_id}> role!`,
              }).catch(() => {});
            }
          } catch (e) {
            console.error('Failed to add level reward role:', e);
          }
        } else {
          if (levelChannel) {
            levelChannel.send({
              content: `🎉 ${message.author} leveled up to **${levelResult.newLevel}**!`,
            }).catch(() => {});
          }
        }
      }
    }

    const isGlobalBypassed = this.db.isGlobalBypass(message.author.id);
    
    if (settings && settings.auto_mod_enabled) {
      if (this.security.checkBadContent(message.content)) {
        try { await message.delete(); } catch {}

        const count = this.db.addLinkInfraction(message.author.id, message.guild.id);
        const reason = `Link infraction #${count}`;
        let action, duration;
        if (count === 1) { duration = 5; action = 'Timeout'; }
        else if (count === 2) { duration = 15; action = 'Timeout'; }
        else if (count === 3) { duration = 30; action = 'Timeout'; }
        else if (count >= 5) { action = 'Kick'; }
        else { duration = 30; action = 'Timeout'; }

        if (isGlobalBypassed) {
          return; // Skip punishment for global bypass users
        }

        if (action === 'Kick') {
          try {
            await message.member.kick(reason);
            this.db.addModlog(message.guild.id, 'KICK', message.author.id, this.user.id, reason);
            await message.channel.send({ content: `🚫 ${message.author} was kicked for repeated link violations.`, ephemeral: true }).catch(() => {});
          } catch {
            await message.channel.send({ content: `⚠️ Could not kick ${message.author}.` }).catch(() => {});
          }
        } else {
          try {
            await message.member.timeout(duration * 60 * 1000, reason);
            this.db.addModlog(message.guild.id, 'TIMEOUT', message.author.id, this.user.id, reason);
            await message.channel.send({ content: `🚫 ${message.author} has been timed out for ${duration} minutes for posting a prohibited link.` }).catch(() => {});
          } catch {
            await message.channel.send({ content: `⚠️ Could not timeout ${message.author}.` }).catch(() => {});
          }
        }
        return;
      }

      if (this.security.checkSpam(message.author.id, message.guild.id)) {
        try {
          await message.member.timeout(5 * 60 * 1000, 'Spam detected');
        } catch {}
      }
    }
  }

  async onInteraction(interaction) {
    // Handle button interactions for reaction roles
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('rr_')) {
        const roleId = interaction.customId.replace('rr_', '');
        const role = interaction.guild.roles.cache.get(roleId);
        
        if (!role) {
          return interaction.reply({ content: 'Role not found.', ephemeral: true });
        }
        
        try {
          if (interaction.member.roles.cache.has(roleId)) {
            await interaction.member.roles.remove(roleId);
            await interaction.reply({ content: `Removed ${role.name} role!`, ephemeral: true });
          } else {
            await interaction.member.roles.add(roleId);
            await interaction.reply({ content: `Added ${role.name} role!`, ephemeral: true });
          }
        } catch (e) {
          await interaction.reply({ content: 'Failed to toggle role. Check bot permissions.', ephemeral: true });
        }
        return;
      }
    }

    if (!interaction.isChatInputCommand()) return;

    const command = this.commands.get(interaction.commandName);
    if (!command) {
      await interaction.reply({ content: 'Command not found.', ephemeral: true });
      return;
    }

    try {
      await command.execute(interaction, this);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'An error occurred.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'An error occurred.', ephemeral: true });
      }
    }
  }

  onMessageDelete(message) {
    if (message.author.bot) return;
    this.snipeCache.set(message.channel.id, {
      content: message.content,
      author: message.author,
      createdAt: message.createdAt,
      channel: message.channel,
      attachments: message.attachments.map(a => a.url),
    });
  }

  async onGuildJoin(guild) {
    console.log(`Joined guild: ${guild.name} (${guild.id})`);
    this.db.createGuildSettings(guild.id);
    const general = guild.channels.cache.find(c => c.name === 'general' && c.isTextBased());
    if (general) {
      general.send({ embeds: [{
        title: 'Thanks for adding me!',
        description: 'Use `/help` to see commands. Check the dashboard for advanced settings!',
        color: 0x5865F2,
      }] }).catch(() => {});
    }
  }

  async onMemberJoin(member) {
    if (!member.guild) return;
    
    this.db.createGuildSettings(member.guild.id);
    const settings = this.db.getGuildSettings(member.guild.id);
    
    if (settings && settings.welcome_channel) {
      try {
        const channel = await member.guild.channels.fetch(settings.welcome_channel);
        if (channel && channel.isTextBased()) {
          try {
            const { createCanvas, loadImage } = require('canvas');
            const { AttachmentBuilder } = require('discord.js');
            
            const canvas = createCanvas(800, 300);
            const ctx = canvas.getContext('2d');
            
            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, 800, 300);
            gradient.addColorStop(0, '#5865F2');
            gradient.addColorStop(1, '#EB459E');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 800, 300);
            
            // User avatar
            const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 128 }));
            ctx.beginPath();
            ctx.arc(150, 150, 80, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 70, 70, 160, 160);
            
            // Text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 36px Arial';
            ctx.fillText('Welcome', 300, 100);
            
            ctx.font = 'bold 48px Arial';
            ctx.fillText(member.user.tag, 300, 160);
            
            ctx.font = '24px Arial';
            ctx.fillText(`Member #${member.guild.memberCount}`, 300, 220);
            
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });
            
            channel.send({ files: [attachment] }).catch(() => {});
          } catch (e) {
            // Canvas failed, send text welcome instead
            channel.send({ content: `Welcome ${member}! 👋` }).catch(() => {});
          }
        }
      } catch (e) {
        console.error('Failed to send welcome message:', e);
      }
    }
  }

  async onReactionAdd(reaction, user) {
    if (user.bot) return;
    if (!reaction.message.guild) return;
    
    // Starboard handling
    if (reaction.emoji.name === '⭐') {
      const settings = this.db.getGuildSettings(reaction.message.guildId);
      if (settings && settings.starboard_channel) {
        const threshold = settings.starboard_threshold || 3;
        
        let entry = this.db.getStarboardEntry(reaction.message.id);
        if (!entry) {
          this.db.addStarboardEntry(reaction.message.guildId, reaction.message.id, reaction.message.channelId, reaction.message.author.id);
          entry = { star_count: 0 };
        }
        
        const newCount = reaction.count;
        this.db.updateStarCount(reaction.message.id, newCount);
        
        if (newCount >= threshold && !entry.starboard_message_id) {
          try {
            const starboardChannel = await reaction.message.guild.channels.fetch(settings.starboard_channel);
            if (starboardChannel && starboardChannel.isTextBased()) {
              const embed = {
                title: '⭐ Starred Message',
                color: 0xFFD700,
                author: {
                  name: reaction.message.author.tag,
                  icon_url: reaction.message.author.displayAvatarURL(),
                },
                description: reaction.message.content || '[No content]',
                fields: [
                  { name: 'Source', value: `[Jump to message](${reaction.message.url})`, inline: true },
                  { name: 'Stars', value: `${newCount} ⭐`, inline: true },
                ],
                timestamp: reaction.message.createdAt,
              };
              
              if (reaction.message.attachments.size > 0) {
                embed.image = { url: reaction.message.attachments.first().url };
              }
              
              const starboardMsg = await starboardChannel.send({ embeds: [embed] });
              this.db.setStarboardMessage(reaction.message.id, starboardMsg.id);
            }
          } catch (e) {
            console.error('Failed to post to starboard:', e);
          }
        }
      }
    }
  }

  async start() {
    await this.login(config.token);
  }
}

module.exports = Bot;
