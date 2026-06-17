const LINK_PATTERN = /(https?:\/\/|www\.|discord\.gg\/|discord\.com\/invite|discordapp\.com\/invite|invite\.)/i;

const BLOCKED_WORDS = [
  'discord.gg/', 'discord.com/invite',
  'nitro', 'free nitro',
  'free robux', 'free obc', 'join my server',
];

class SecurityManager {
  constructor() {
    this.spamTracker = new Map();
    this.raidTracker = new Map();
  }

  isOwner(userId, ownerId) {
    return String(userId) === String(ownerId);
  }

  checkBadContent(content) {
    if (typeof content !== 'string') return false;
    const lower = content.toLowerCase();
    if (LINK_PATTERN.test(lower)) return true;
    return BLOCKED_WORDS.some(w => lower.includes(w));
  }

  checkSpam(userId, guildId, threshold = 5, window = 10) {
    const key = `${userId}:${guildId}`;
    const now = Date.now();
    const timestamps = (this.spamTracker.get(key) || []).filter(ts => (now - ts) < window * 1000);
    timestamps.push(now);
    this.spamTracker.set(key, timestamps);
    return timestamps.length > threshold;
  }

  checkRaid(guildId, memberId) {
    const now = Date.now();
    if (!this.raidTracker.has(guildId)) {
      this.raidTracker.set(guildId, { users: [], startTime: now });
    }
    const data = this.raidTracker.get(guildId);
    data.users = data.users.filter(([id, ts]) => (now - ts) < 300000);
    data.users.push([memberId, now]);
    return data.users.length >= 10;
  }

  validateInput(input, maxLength = 2000) {
    if (typeof input !== 'string') return false;
    if (input.length > maxLength) return false;
    if (input.includes('\x00')) return false;
    return true;
  }
}

module.exports = SecurityManager;
