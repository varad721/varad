const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(o => o.setName('question').setDescription('Question').setRequired(true))
    .addStringOption(o => o.setName('options').setDescription('Comma-separated options').setRequired(false)),
  async execute(interaction) {
    const q = interaction.options.getString('question');
    let opts = interaction.options.getString('options');
    const items = opts ? opts.split(',').map(s => s.trim()).filter(Boolean) : ['Yes', 'No'];
    if (items.length < 2) return interaction.reply({ content: 'Need 2+ options.', ephemeral: true });
    if (items.length > 10) return interaction.reply({ content: 'Max 10 options.', ephemeral: true });

    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    const desc = items.map((o, i) => `${emojis[i]} ${o}`).join('\n');
    const embed = new EmbedBuilder().setTitle(q).setDescription(desc).setColor(0xFFA500).setFooter({ text: `Poll by ${interaction.user.tag}` });

    const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
    for (let i = 0; i < items.length; i++) await msg.react(emojis[i]);
  },
};
