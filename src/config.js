require('dotenv').config();

module.exports = {
  token: process.env.DISCORD_TOKEN,
  applicationId: process.env.APPLICATION_ID,
  ownerIds: (process.env.OWNER_ID || '0').split(',').map(id => id.trim()),
  ownerId: process.env.OWNER_ID?.split(',')[0]?.trim() || '0',
  dbPath: process.env.DATABASE_PATH || 'data/bot.db',

  dashboard: {
    enabled: process.env.ENABLE_DASHBOARD !== 'false',
    host: process.env.DASHBOARD_HOST || '0.0.0.0',
    port: parseInt(process.env.DASHBOARD_PORT || '5000'),
    secret: process.env.DASHBOARD_SECRET || require('crypto').randomBytes(32).toString('hex'),
    clientId: process.env.DISCORD_APP_ID || process.env.APPLICATION_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:5000/auth/callback',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    fallbackModels: (process.env.GEMINI_FALLBACK_MODELS || 'gemini-1.5-flash-8b,gemini-1.5-flash-latest,gemini-2.0-flash').split(',').map(s => s.trim()).filter(Boolean),
  },

  defaultSettings: {
    prefix: ',',
    autoModEnabled: true,
    spamThreshold: 5,
    spamWindow: 10,
  },
};
