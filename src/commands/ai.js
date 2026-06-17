const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

let geminiClient = null;
let openaiClient = null;

async function initClients() {
  if (config.gemini.apiKey) {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      geminiClient = new GoogleGenerativeAI(config.gemini.apiKey);
    } catch {}
  }
  if (config.openai.apiKey) {
    try {
      const OpenAI = require('openai');
      openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
    } catch {}
  }
}
initClients();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask AI a question')
    .addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true)),
  async execute(interaction) {
    const q = interaction.options.getString('question');
    if (q.length > 1500) return interaction.reply({ content: 'Max 1500 chars.', ephemeral: true });
    if (!geminiClient && !openaiClient) return interaction.reply({ content: 'No AI API key configured.', ephemeral: true });

    await interaction.deferReply();

    try {
      let answer, provider;

      if (geminiClient) {
        const model = geminiClient.getGenerativeModel({ model: config.gemini.model });
        const result = await model.generateContent(`You are a helpful Discord bot assistant. Keep answers concise.\n\nUser: ${q}`);
        answer = result.response.text();
        provider = `Gemini: ${config.gemini.model}`;
      } else {
        const response = await openaiClient.chat.completions.create({
          model: config.openai.model,
          messages: [{ role: 'system', content: 'You are a helpful Discord bot assistant. Be concise.' }, { role: 'user', content: q }],
          max_tokens: 350,
        });
        answer = response.choices[0]?.message?.content || 'No response.';
        provider = 'OpenAI';
      }

      if (answer.length > 4000) answer = answer.slice(0, 3990) + '...';
      await interaction.editReply({
        embeds: [new EmbedBuilder().setTitle(`AI Response (${provider})`).setDescription(answer).setColor(0x800080).setFooter({ text: `Asked by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })]
      });
    } catch (e) {
      await interaction.editReply({ content: `AI error: ${e.message.slice(0, 1900)}` });
    }
  },
};

module.exports.aimodels = {
  data: new SlashCommandBuilder().setName('aimodels').setDescription('List AI models'),
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return interaction.reply({ content: 'Need Manage Server!', ephemeral: true });
    if (!geminiClient) return interaction.reply({ content: 'Gemini not configured.', ephemeral: true });

    try {
      const result = await geminiClient.listModels();
      const names = (result.models || []).filter(m => m.name).map(m => m.name.replace('models/', ''));
      await interaction.reply({ content: `Models:\n\`\`\`${names.join('\n') || 'None'}\`\`\``, ephemeral: true });
    } catch (e) {
      await interaction.reply({ content: `Error: ${e.message}`, ephemeral: true });
    }
  },
};
