const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weather')
    .setDescription('Get weather information')
    .addStringOption(o => o.setName('city').setDescription('City name').setRequired(true)),
  async execute(interaction) {
    const city = interaction.options.getString('city');
    
    await interaction.deferReply();
    
    try {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${process.env.OPENWEATHER_API_KEY || ''}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          return interaction.editReply({ content: 'OpenWeather API key not configured. Add OPENWEATHER_API_KEY to your .env file.' });
        }
        return interaction.editReply({ content: 'City not found.' });
      }
      
      const data = await response.json();
      
      const embed = new EmbedBuilder()
        .setTitle(`🌤️ Weather in ${data.name}, ${data.sys.country}`)
        .setColor(0x5865F2)
        .setThumbnail(`https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`)
        .addFields(
          { name: 'Temperature', value: `${Math.round(data.main.temp)}°C`, inline: true },
          { name: 'Feels Like', value: `${Math.round(data.main.feels_like)}°C`, inline: true },
          { name: 'Condition', value: data.weather[0].description, inline: true },
          { name: 'Humidity', value: `${data.main.humidity}%`, inline: true },
          { name: 'Wind Speed', value: `${data.wind.speed} m/s`, inline: true },
          { name: 'Pressure', value: `${data.main.pressure} hPa`, inline: true }
        )
        .setFooter({ text: 'Data from OpenWeatherMap' });
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Weather error:', error);
      await interaction.editReply({ content: 'Failed to fetch weather data. Make sure OPENWEATHER_API_KEY is set in .env' });
    }
  },
};
