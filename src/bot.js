const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const path = require('path');
const fs = require('fs');
const config = require('./config');
const DB = require('./database');
const SecurityManager = require('./security');

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
    this.ownerId = BigInt(config.ownerId);
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
    }, 30000); // Check every 30 seconds
  }

  async onMessage(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    this.db.createGuildSettings(message.guild.id);
    const settings = this.db.getGuildSettings(message.guild.id);

    // XP gain system
    const xpGain = Math.floor(Math.random() * 15) + 10; // 10-25 XP per message
    const levelResult = this.db.addXP(message.guild.id, message.author.id, xpGain);
    
    if (levelResult.leveledUp) {
      const rewards = this.db.getLevelRewards(message.guild.id);
      const reward = rewards.find(r => r.level === levelResult.newLevel);
      if (reward) {
        try {
          await message.member.roles.add(reward.role_id);
          message.channel.send({
            content: `🎉 ${message.author} leveled up to **${levelResult.newLevel}** and received the <@&${reward.role_id}> role!`,
          }).catch(() => {});
        } catch (e) {
          console.error('Failed to add level reward role:', e);
        }
      } else {
        message.channel.send({
          content: `🎉 ${message.author} leveled up to **${levelResult.newLevel}**!`,
        }).catch(() => {});
      }
    }

    const isOwner = String(message.author.id) === String(config.ownerId);
    const isBypassed = this.db.isBypassUser(message.guild.id, message.author.id);
    if (isOwner || isBypassed) return;

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
