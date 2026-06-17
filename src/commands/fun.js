const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const jokes = [
  "Why did the Discord bot go to school? To improve its cogs!",
  "How many Discord bots does it take to change a lightbulb? None, they just toggle the power state!",
  "Why do Python developers prefer Discord? Because it has great async support!",
  "What did the bot say to the user? 'Are you even on the right server?'",
  "Why did the moderator break up with the bot? They couldn't sync their schedules!",
  "How does a bot stay healthy? By running regular checks!",
  "What's a bot's favorite type of music? Heavy metal because of all those requests!",
  "Why don't bots ever get tired? Because they run on async code!",
];

const eightball = [
  "Yes, definitely!", "No, not at all!", "Maybe, ask again later!", "Ask again later...",
  "It's uncertain!", "Very likely!", "Don't count on it!", "Absolutely!",
  "My sources say no!", "Outlook good!", "As I see it, yes!", "Cannot predict now!",
  "Concentrate and ask again!", "Reply hazy, try again!", "Don't even think about it!",
  "Absolutely not!", "Without a doubt!", "Signs point to yes!",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Tell a joke'),
  async execute(interaction) {
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('😂 Joke').setDescription(joke).setColor(0xFFFF00)] });
  },
};

module.exports.dice = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll dice')
    .addIntegerOption(o => o.setName('sides').setDescription('Sides').setRequired(false))
    .addIntegerOption(o => o.setName('rolls').setDescription('Rolls').setRequired(false)),
  async execute(interaction) {
    let sides = interaction.options.getInteger('sides') || 6;
    let rolls = Math.max(1, Math.min(100, interaction.options.getInteger('rolls') || 1));
    if (sides < 2) return interaction.reply({ content: '❌ Min 2 sides!', ephemeral: true });
    const results = Array.from({ length: rolls }, () => Math.floor(Math.random() * sides) + 1);
    const embed = new EmbedBuilder().setTitle('🎲 Dice Roll').setColor(0x5865F2)
      .addFields({ name: 'Config', value: `Sides: ${sides}\nRolls: ${rolls}`, inline: true },
        { name: 'Results', value: `\`${results.join(', ')}\``, inline: true },
        { name: 'Total', value: `${results.reduce((a, b) => a + b, 0)}`, inline: true });
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.eightball = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the 8ball')
    .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true)),
  async execute(interaction) {
    const q = interaction.options.getString('question');
    const a = eightball[Math.floor(Math.random() * eightball.length)];
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎱 Magic 8Ball').setColor(0x800080).addFields({ name: 'Question', value: q }, { name: 'Answer', value: a })] });
  },
};

module.exports.coinflip = {
  data: new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin'),
  async execute(interaction) {
    const r = Math.random() < 0.5 ? 'Heads' : 'Tails';
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🪙 Coin Flip').setDescription(`**Result:** ${r}`).setColor(0xFFA500)] });
  },
};

module.exports.rps = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Rock Paper Scissors')
    .addStringOption(o => o.setName('choice').setDescription('rock/paper/scissors').setRequired(true)),
  async execute(interaction) {
    const choices = ['rock', 'paper', 'scissors'];
    const user = interaction.options.getString('choice').toLowerCase();
    if (!choices.includes(user)) return interaction.reply({ content: 'Choose rock, paper, or scissors!', ephemeral: true });
    const bot = choices[Math.floor(Math.random() * 3)];
    let result, color;
    if (user === bot) { result = 'Tie!'; color = 0x9CA3AF; }
    else if ((user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper'))
    { result = 'You win!'; color = 0x57F287; }
    else { result = 'You lose!'; color = 0xED4245; }
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('✂️ RPS').setColor(color).addFields({ name: 'You', value: user.charAt(0).toUpperCase() + user.slice(1), inline: true }, { name: 'Bot', value: bot.charAt(0).toUpperCase() + bot.slice(1), inline: true }, { name: 'Result', value: result, inline: true })] });
  },
};

module.exports.pick = {
  data: new SlashCommandBuilder()
    .setName('pick')
    .setDescription('Pick from list')
    .addStringOption(o => o.setName('items').setDescription('Comma-separated').setRequired(true)),
  async execute(interaction) {
    const items = interaction.options.getString('items').split(',').map(s => s.trim()).filter(Boolean);
    if (items.length < 2) return interaction.reply({ content: 'Need 2+ items!', ephemeral: true });
    const choice = items[Math.floor(Math.random() * items.length)];
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎯 Random Pick').setDescription(`I pick: **${choice}**`).setColor(0x57F287).setFooter({ text: `From ${items.length} options` })] });
  },
};

module.exports.number = {
  data: new SlashCommandBuilder()
    .setName('number')
    .setDescription('Start number guessing game')
    .addIntegerOption(o => o.setName('max').setDescription('Max number').setRequired(false)),
  async execute(interaction, bot) {
    const max = Math.max(2, interaction.options.getInteger('max') || 100);
    const secret = Math.floor(Math.random() * max) + 1;
    bot.numberGames.set(`${interaction.guildId}:${interaction.user.id}`, { secret, max, attempts: 0 });
    await interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎮 Guess the Number').setDescription(`I'm thinking of 1-${max}! Use /guess`).setColor(0x5865F2)] });
  },
};

module.exports.guess = {
  data: new SlashCommandBuilder()
    .setName('guess')
    .setDescription('Guess the number')
    .addIntegerOption(o => o.setName('number').setDescription('Your guess').setRequired(true)),
  async execute(interaction, bot) {
    const key = `${interaction.guildId}:${interaction.user.id}`;
    const game = bot.numberGames.get(key);
    if (!game) return interaction.reply({ content: 'Start a game with /number first.', ephemeral: true });
    game.attempts++;
    const guess = interaction.options.getInteger('number');
    let embed;
    if (guess === game.secret) {
      bot.numberGames.delete(key);
      embed = new EmbedBuilder().setTitle('Correct!').setDescription(`You guessed **${game.secret}** in ${game.attempts} attempt(s).`).setColor(0x57F287);
    } else if (guess < game.secret) {
      embed = new EmbedBuilder().setTitle('Too low').setDescription(`Try higher. Attempts: ${game.attempts}`).setColor(0xFFA500);
    } else {
      embed = new EmbedBuilder().setTitle('Too high').setDescription(`Try lower. Attempts: ${game.attempts}`).setColor(0xFFA500);
    }
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
