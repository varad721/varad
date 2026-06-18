const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('../src/config');
const axios = require('axios');

function createDashboard(bot) {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.json());
  app.use(session({
    secret: config.dashboard.secret,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000, secure: false },
  }));

  function isOwner(req, res, next) {
    if (req.session.authenticated && config.ownerIds.includes(String(req.session.userId))) {
      return next();
    }
    if (req.path.startsWith('/api/')) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    return res.redirect('/login');
  }

  // OAuth routes
  app.get('/auth/discord', (req, res) => {
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${config.dashboard.clientId}&redirect_uri=${encodeURIComponent(config.dashboard.redirectUri)}&response_type=code&scope=identify%20guilds`;
    res.redirect(discordAuthUrl);
  });

  app.get('/auth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/login?error=no_code');

    try {
      // Exchange code for token
      const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', {
        client_id: config.dashboard.clientId,
        client_secret: config.dashboard.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.dashboard.redirectUri,
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const accessToken = tokenResponse.data.access_token;

      // Get user info
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const userId = userResponse.data.id;

      // Check if user is owner
      if (config.ownerIds.includes(String(userId))) {
        req.session.authenticated = true;
        req.session.userId = userId;
        req.session.user = userResponse.data;
        return res.redirect('/');
      } else {
        return res.redirect('/login?error=not_owner');
      }
    } catch (e) {
      console.error('OAuth callback error:', e);
      res.redirect('/login?error=oauth_failed');
    }
  });

  app.get('/', (req, res) => {
    if (req.session.authenticated) {
      res.render('dashboard', {
        user: req.session.user,
        ownerIds: config.ownerIds,
      });
    } else {
      res.render('index', { authenticated: false });
    }
  });

  app.get('/login', (req, res) => {
    const error = req.query.error;
    res.render('login', { error, discordAuthUrl: `/auth/discord` });
  });

  app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ status: 'success' });
  });

  app.get('/api/check-auth', (req, res) => {
    if (req.session.authenticated && config.ownerIds.includes(String(req.session.userId))) {
      return res.json({ status: 'success', userId: req.session.userId, user: req.session.user });
    }
    return res.status(401).json({ status: 'error' });
  });

  // Stats API
  app.get('/api/stats', isOwner, (req, res) => {
    try {
      const stats = bot.db.getStats();
      res.json({ status: 'success', ...stats });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // Mod logs
  app.get('/api/modlogs/:guildId', isOwner, (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
      const logs = bot.db.getModlogs(parseInt(req.params.guildId, 10), limit);
      res.json({ status: 'success', logs });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // Guild settings
  app.get('/api/guild-settings/:guildId', isOwner, (req, res) => {
    try {
      const settings = bot.db.getGuildSettings(parseInt(req.params.guildId, 10));
      if (!settings) return res.status(404).json({ status: 'error', message: 'Not found' });
      return res.json({ status: 'success', ...settings });
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message });
    }
  });

  app.post('/api/guild-settings/:guildId', isOwner, (req, res) => {
    try {
      bot.db.updateGuildSettings(parseInt(req.params.guildId, 10), req.body);
      res.json({ status: 'success', message: 'Updated' });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // Bypass users
  app.get('/api/bypass-users/:guildId', isOwner, (req, res) => {
    try {
      const users = bot.db.getBypassUsers(parseInt(req.params.guildId, 10));
      res.json({ status: 'success', users });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  app.post('/api/bypass-users/:guildId', isOwner, (req, res) => {
    try {
      const { user_id, reason } = req.body;
      if (!user_id) return res.status(400).json({ status: 'error', message: 'User ID required' });
      bot.db.addBypassUser(parseInt(req.params.guildId, 10), parseInt(user_id, 10), config.ownerId, reason || '');
      res.json({ status: 'success', message: 'User added' });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  app.delete('/api/bypass-users/:guildId/:userId', isOwner, (req, res) => {
    try {
      bot.db.removeBypassUser(parseInt(req.params.guildId, 10), parseInt(req.params.userId, 10));
      res.json({ status: 'success', message: 'User removed' });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // Leveling
  app.get('/api/leaderboard/:guildId', isOwner, (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
      const leaderboard = bot.db.getLeaderboard(parseInt(req.params.guildId, 10), limit);
      res.json({ status: 'success', leaderboard });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  app.get('/api/level-rewards/:guildId', isOwner, (req, res) => {
    try {
      const rewards = bot.db.getLevelRewards(parseInt(req.params.guildId, 10));
      res.json({ status: 'success', rewards });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  app.post('/api/level-rewards/:guildId', isOwner, (req, res) => {
    try {
      const { level, role_id } = req.body;
      if (!level || !role_id) return res.status(400).json({ status: 'error', message: 'Level and role ID required' });
      bot.db.addLevelReward(parseInt(req.params.guildId, 10), parseInt(level, 10), parseInt(role_id, 10));
      res.json({ status: 'success', message: 'Reward added' });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  app.delete('/api/level-rewards/:guildId/:level', isOwner, (req, res) => {
    try {
      bot.db.removeLevelReward(parseInt(req.params.guildId, 10), parseInt(req.params.level, 10));
      res.json({ status: 'success', message: 'Reward removed' });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // Economy
  app.get('/api/economy-leaderboard/:guildId', isOwner, (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
      const leaderboard = bot.db.getEconomyLeaderboard(parseInt(req.params.guildId, 10), limit);
      res.json({ status: 'success', leaderboard });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'healthy' }));

  return app;
}

function startDashboard(bot) {
  const app = createDashboard(bot);
  app.listen(config.dashboard.port, config.dashboard.host, () => {
    console.log(`Dashboard running on port ${config.dashboard.port}`);
    console.log(`Access at http://localhost:${config.dashboard.port}`);
  });
  return app;
}

module.exports = { createDashboard, startDashboard };
