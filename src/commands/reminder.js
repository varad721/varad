const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addStringOption(o => o.setName('message').setDescription('What to remind you about').setRequired(true))
    .addStringOption(o => o.setName('time').setDescription('When to remind (e.g., 1h, 30m, 2d)').setRequired(true)),
  async execute(interaction, bot) {
    const message = interaction.options.getString('message');
    const timeStr = interaction.options.getString('time');
    
    // Parse time string
    const timeMatch = timeStr.match(/^(\d+)([smhd])$/);
    if (!timeMatch) {
      return interaction.reply({ content: 'Invalid time format. Use format like: 1h, 30m, 2d, 45s', ephemeral: true });
    }
    
    const amount = parseInt(timeMatch[1]);
    const unit = timeMatch[2];
    
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    const seconds = amount * multipliers[unit];
    
    if (seconds < 60) {
      return interaction.reply({ content: 'Minimum reminder time is 1 minute.', ephemeral: true });
    }
    
    if (seconds > 2592000) { // 30 days max
      return interaction.reply({ content: 'Maximum reminder time is 30 days.', ephemeral: true });
    }
    
    const dueAt = new Date(Date.now() + seconds * 1000).toISOString();
    bot.db.addReminder(interaction.guildId, interaction.user.id, interaction.channelId, message, dueAt);
    
    const embed = new EmbedBuilder()
      .setTitle('⏰ Reminder Set')
      .setDescription(`I'll remind you about "${message}" in ${timeStr}`)
      .setColor(0x5865F2)
      .setFooter({ text: `Due at: ${new Date(dueAt).toLocaleString()}` });
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.reminders = {
  data: new SlashCommandBuilder()
    .setName('reminders')
    .setDescription('View your reminders'),
  async execute(interaction, bot) {
    const reminders = bot.db.getUserReminders(interaction.guildId, interaction.user.id);
    
    if (reminders.length === 0) {
      return interaction.reply({ content: 'You have no active reminders.', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
      .title('📋 Your Reminders')
      .setColor(0x5865F2)
      .setDescription(reminders.map((r, i) => 
        `${i + 1}. **${r.message}**\n   Due: ${new Date(r.due_at).toLocaleString()}`
      ).join('\n\n'))
      .setFooter({ text: `${reminders.length} active reminder(s)` });
    
    await interaction.reply({ embeds: [embed] });
  },
};
