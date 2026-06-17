const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate text')
    .addStringOption(o => o.setName('text').setDescription('Text to translate').setRequired(true))
    .addStringOption(o => o.setName('target').setDescription('Target language code (e.g., es, fr, de)').setRequired(true)),
  async execute(interaction) {
    const text = interaction.options.getString('text');
    const target = interaction.options.getString('target');
    
    if (text.length > 500) {
      return interaction.reply({ content: 'Text must be under 500 characters.', ephemeral: true });
    }
    
    await interaction.deferReply();
    
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${target}`);
      const data = await response.json();
      
      if (data.responseStatus === 200) {
        const embed = new EmbedBuilder()
          .setTitle('🌐 Translation')
          .setColor(0x5865F2)
          .addFields(
            { name: 'Original', value: text, inline: false },
            { name: 'Translated', value: data.responseData.translatedText, inline: false }
          )
          .setFooter({ text: `Translated to: ${target.toUpperCase()}` });
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({ content: 'Translation failed. Invalid language code or API error.' });
      }
    } catch (error) {
      console.error('Translation error:', error);
      await interaction.editReply({ content: 'Failed to translate text.' });
    }
  },
};
