const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance')
    .addUserOption(o => o.setName('user').setDescription('Check another user\'s balance')),
  async execute(interaction, bot) {
    const target = interaction.options.getUser('user') || interaction.user;
    const economy = bot.db.getUserBalance(interaction.guildId, target.id);
    
    const embed = new EmbedBuilder()
      .setTitle(`💰 ${target.tag}'s Balance`)
      .setColor(0xFFD700)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Current Balance', value: `${economy.balance.toLocaleString()} coins`, inline: true },
        { name: 'Total Earned', value: `${economy.total_earned.toLocaleString()} coins`, inline: true },
        { name: 'Total Spent', value: `${economy.total_spent.toLocaleString()} coins`, inline: true }
      );
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.daily = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward'),
  async execute(interaction, bot) {
    if (!bot.db.canClaimDaily(interaction.guildId, interaction.user.id)) {
      return interaction.reply({ content: 'You already claimed your daily reward! Come back in 24 hours.', ephemeral: true });
    }
    
    const reward = Math.floor(Math.random() * 500) + 100; // 100-600 coins
    bot.db.addBalance(interaction.guildId, interaction.user.id, reward);
    bot.db.setDailyCooldown(interaction.guildId, interaction.user.id);
    
    const embed = new EmbedBuilder()
      .setTitle('🎁 Daily Reward')
      .setDescription(`You received **${reward} coins**!`)
      .setColor(0x57F287)
      .setFooter({ text: 'Come back in 24 hours for more!' });
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.give = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Give coins to another user')
    .addUserOption(o => o.setName('user').setDescription('User to give to').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('Amount to give').setRequired(true)),
  async execute(interaction, bot) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'You cannot give coins to yourself!', ephemeral: true });
    }
    
    if (amount <= 0) {
      return interaction.reply({ content: 'Amount must be positive!', ephemeral: true });
    }
    
    const sender = bot.db.getUserBalance(interaction.guildId, interaction.user.id);
    if (sender.balance < amount) {
      return interaction.reply({ content: 'You don\'t have enough coins!', ephemeral: true });
    }
    
    bot.db.removeBalance(interaction.guildId, interaction.user.id, amount);
    bot.db.addBalance(interaction.guildId, target.id, amount);
    
    const embed = new EmbedBuilder()
      .setTitle('💸 Transfer Complete')
      .setDescription(`${interaction.user} gave **${amount} coins** to ${target}`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.shop = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('View the shop'),
  async execute(interaction, bot) {
    const items = bot.db.getShopItems(interaction.guildId);
    
    if (items.length === 0) {
      return interaction.reply({ content: 'The shop is empty. Ask an admin to add items!', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🏪 Shop')
      .setColor(0x5865F2)
      .setDescription(items.map(item => {
        const role = item.role_id ? `\nRole: <@&${item.role_id}>` : '';
        return `**${item.name}** - ${item.price} coins\n${item.description || 'No description'}${role}`;
      }).join('\n\n'))
      .setFooter({ text: 'Use /buy to purchase items' });
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.buy = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addStringOption(o => o.setName('item').setDescription('Item name').setRequired(true).setAutocomplete(true)),
  async execute(interaction, bot) {
    const itemName = interaction.options.getString('item');
    const items = bot.db.getShopItems(interaction.guildId);
    const item = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    
    if (!item) {
      return interaction.reply({ content: 'Item not found!', ephemeral: true });
    }
    
    const result = bot.db.purchaseItem(interaction.guildId, interaction.user.id, item.id);
    
    if (!result.success) {
      return interaction.reply({ content: result.reason, ephemeral: true });
    }
    
    // Give role if applicable
    if (item.role_id) {
      try {
        await interaction.member.roles.add(item.role_id);
      } catch (e) {
        console.error('Failed to add role:', e);
      }
    }
    
    const embed = new EmbedBuilder()
      .setTitle('🛒 Purchase Complete')
      .setDescription(`You bought **${item.name}** for ${item.price} coins!`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.additem = {
  data: new SlashCommandBuilder()
    .setName('additem')
    .setDescription('Add an item to the shop')
    .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true))
    .addStringOption(o => o.setName('description').setDescription('Item description'))
    .addIntegerOption(o => o.setName('price').setDescription('Price in coins').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Role to give (optional)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const name = interaction.options.getString('name');
    const description = interaction.options.getString('description') || 'No description';
    const price = interaction.options.getInteger('price');
    const role = interaction.options.getRole('role');
    
    bot.db.addShopItem(interaction.guildId, name, description, price, role?.id);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Item Added')
      .setDescription(`Added **${name}** to the shop for ${price} coins.`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.removeitem = {
  data: new SlashCommandBuilder()
    .setName('removeitem')
    .setDescription('Remove an item from the shop')
    .addStringOption(o => o.setName('name').setDescription('Item name').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const name = interaction.options.getString('name');
    
    bot.db.removeShopItem(interaction.guildId, name);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Item Removed')
      .setDescription(`Removed **${name}** from the shop.`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};

module.exports.economyleaderboard = {
  data: new SlashCommandBuilder()
    .setName('economyleaderboard')
    .setDescription('View economy leaderboard'),
  async execute(interaction, bot) {
    const leaderboard = bot.db.getEconomyLeaderboard(interaction.guildId, 10);
    
    if (leaderboard.length === 0) {
      return interaction.reply({ content: 'No economy data yet. Use /daily to start earning!', ephemeral: true });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('💰 Economy Leaderboard')
      .setColor(0xFFD700)
      .setDescription(leaderboard.map((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `${medal} <@${entry.user_id}> - ${entry.balance.toLocaleString()} coins`;
      }).join('\n'))
      .setFooter({ text: 'Top 10 richest users' });
    
    await interaction.reply({ embeds: [embed] });
  },
};
