const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your level')
    .addUserOption(o => o.setName('user').setDescription('Check another user\'s level')),
  async execute(interaction, bot) {
    const target = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(target.id);
    
    const levelData = bot.db.getUserLevel(interaction.guildId, target.id);
    const xpToNext = Math.pow(levelData.level, 2) * 100;
    const xpProgress = levelData.xp % 100;
    const progressBar = '█'.repeat(Math.floor(xpProgress / 10)) + '░'.repeat(10 - Math.floor(xpProgress / 10));
    
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${target.tag}'s Level`)
      .setColor(0x5865F2)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Level', value: `${levelData.level}`, inline: true },
        { name: 'XP', value: `${levelData.xp}`, inline: true },
        { name: 'Messages', value: `${levelData.total_messages}`, inline: true },
        { name: 'Progress', value: `${progressBar} ${xpProgress}%`, inline: false }
      )
      .setFooter({ text: `XP to next level: ${xpToNext - levelData.xp}` });
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.leaderboard = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View XP leaderboard'),
  async execute(interaction, bot) {
    const leaderboard = bot.db.getLeaderboard(interaction.guildId, 10);
    
    if (leaderboard.length === 0) {
      return interaction.reply({ content: 'No level data yet. Send messages to gain XP!', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🏆 XP Leaderboard')
      .setColor(0xFFD700)
      .setDescription(leaderboard.map((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${medal} <@${entry.user_id}> - Level ${entry.level} (${entry.xp} XP)`;
      }).join('\n'))
      .setFooter({ text: 'Top 10 users' });
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.setreward = {
  data: new SlashCommandBuilder()
    .setName('setreward')
    .setDescription('Set a role reward for a level')
    .addIntegerOption(o => o.setName('level').setDescription('Level').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const level = interaction.options.getInteger('level');
    const role = interaction.options.getRole('role');
    
    bot.db.addLevelReward(interaction.guildId, level, role.id);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Level Reward Set')
      .setDescription(`Users reaching level ${level} will now receive the ${role} role.`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.removereward = {
  data: new SlashCommandBuilder()
    .setName('removereward')
    .setDescription('Remove a level reward')
    .addIntegerOption(o => o.setName('level').setDescription('Level').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const level = interaction.options.getInteger('level');
    
    bot.db.removeLevelReward(interaction.guildId, level);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Level Reward Removed')
      .setDescription(`Level ${level} reward has been removed.`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.rewards = {
  data: new SlashCommandBuilder()
    .setName('rewards')
    .setDescription('View all level rewards'),
  async execute(interaction, bot) {
    const rewards = bot.db.getLevelRewards(interaction.guildId);
    
    if (rewards.length === 0) {
      return interaction.reply({ content: 'No level rewards set yet.', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🎁 Level Rewards')
      .setColor(0x5865F2)
      .setDescription(rewards.map(r => `Level ${r.level}: <@&${r.role_id}>`).join('\n'));
    
    await interaction.reply({ embeds: [embed] });
  },
};
