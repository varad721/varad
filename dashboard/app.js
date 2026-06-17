const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('../src/config');

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
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  }));

  function isOwner(req, res, next) {
    if (req.session.authenticated && String(req.session.userId) === String(config.ownerId)) return next();
    if (req.path.startsWith('/api/')) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    return res.redirect('/login');
  }

  app.get('/', (req, res) => {
    res.render('index', {
      ownerId: config.ownerId,
      authenticated: !!(req.session.authenticated && String(req.session.userId) === String(config.ownerId)),
    });
  });

  app.get('/login', (req, res) => res.render('login'));

  app.post('/api/login', (req, res) => {
    const { user_id } = req.body;
    if (String(user_id) === String(config.ownerId)) {
      req.session.authenticated = true;
      req.session.userId = config.ownerId;
      return res.json({ status: 'success' });
    }
    return res.status(401).json({ status: 'error', message: 'Invalid owner ID' });
  });

  app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ status: 'success' });
  });

  app.get('/api/check-auth', (req, res) => {
    if (req.session.authenticated && String(req.session.userId) === String(config.ownerId)) {
      return res.json({ status: 'success', ownerId: config.ownerId });
    }
    return res.status(401).json({ status: 'error' });
  });

  app.get('/api/stats', (req, res) => {
    try {
      const stats = bot.db.getStats();
      res.json({ status: 'success', ...stats });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  app.get('/api/modlogs/:guildId', isOwner, (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
      const logs = bot.db.getModlogs(parseInt(req.params.guildId, 10), limit);
      res.json({ status: 'success', logs });
    } catch (e) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

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

  app.get('/health', (req, res) => res.json({ status: 'healthy' }));

  return app;
}

function startDashboard(bot) {
  const app = createDashboard(bot);
  app.listen(config.dashboard.port, config.dashboard.host, () => {
    console.log(`Dashboard running on port ${config.dashboard.port}`);
    console.log(`Access via your Nexcloud allocation URL (port ${config.dashboard.port})`);
  });
  return app;
}

module.exports = { createDashboard, startDashboard };
