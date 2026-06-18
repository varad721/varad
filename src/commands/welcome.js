const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setwelcometest')
    .setDescription('Test the welcome image system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    await interaction.deferReply();
    
    try {
      const canvas = createCanvas(800, 300);
      const ctx = canvas.getContext('2d');
      
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 800, 300);
      gradient.addColorStop(0, '#5865F2');
      gradient.addColorStop(1, '#EB459E');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 300);
      
      // User avatar
      const avatar = await loadImage(interaction.user.displayAvatarURL({ extension: 'png', size: 128 }));
      ctx.beginPath();
      ctx.arc(150, 150, 80, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 70, 70, 160, 160);
      
      // Text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px Arial';
      ctx.fillText('Welcome', 300, 100);
      
      ctx.font = 'bold 48px Arial';
      ctx.fillText(interaction.user.tag, 300, 160);
      
      ctx.font = '24px Arial';
      ctx.fillText(`Member #${interaction.guild.memberCount}`, 300, 220);
      
      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome.png' });
      
      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error('Welcome image error:', error);
      await interaction.editReply({ content: 'Failed to generate welcome image.' });
    }
  },
};

module.exports.setwelcomechannel = {
  data: new SlashCommandBuilder()
    .setName('setwelcomechannel')
    .setDescription('Set the welcome channel')
    .addChannelOption(o => o.setName('channel').setDescription('Welcome channel').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction, bot) {
    const channel = interaction.options.getChannel('channel');
    
    bot.db.updateGuildSettings(interaction.guildId, { welcome_channel: channel.id });
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Welcome Channel Set')
      .setDescription(`Welcome messages will be sent to ${channel}`)
      .setColor(0x57F287);
    
    await interaction.reply({ embeds: [embed] });
  },
};
