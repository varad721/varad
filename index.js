require('dotenv').config();

const config = require('./src/config');
const Bot = require('./src/bot');
const { startDashboard } = require('./dashboard/app');
const { handleTicketSelect, handleTicketButton } = require('./src/commands/ticketHandler');
const { registerEvents } = require('./src/events');

if (!config.token) {
  console.error('DISCORD_TOKEN is missing. Add it to your .env file.');
  process.exit(1);
}

const bot = new Bot();
registerEvents(bot);

bot.on('interactionCreate', async (interaction) => {
  await handleTicketSelect(interaction, bot);
  await handleTicketButton(interaction, bot);
});

if (config.dashboard.enabled) {
  startDashboard(bot);
}

bot.start().catch((err) => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
