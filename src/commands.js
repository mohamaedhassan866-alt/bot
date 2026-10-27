const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const admin = PermissionFlagsBits.Administrator;
module.exports = [
  new SlashCommandBuilder().setName('setup').setDescription('نشر لوحة التكتات الجديدة').setDefaultMemberPermissions(admin),
  new SlashCommandBuilder().setName('mta-status').setDescription('عرض حالة سيرفر MTA وعدد اللاعبين'),
  new SlashCommandBuilder().setName('report').setDescription('إرسال بلاغ إلى الإدارة')
    .addUserOption(o => o.setName('member').setDescription('العضو المبلّغ عنه').setRequired(true))
    .addStringOption(o => o.setName('details').setDescription('تفاصيل البلاغ').setRequired(true).setMaxLength(1500)),
  new SlashCommandBuilder().setName('pvp-points').setDescription('عرض نقاط PVP الخاصة بك أو لعضو')
    .addUserOption(o => o.setName('member').setDescription('العضو (اختياري)').setRequired(false)),
  new SlashCommandBuilder().setName('pvp-add').setDescription('إضافة أو خصم نقاط PVP لعضو').setDefaultMemberPermissions(admin)
    .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true))
    .addIntegerOption(o => o.setName('points').setDescription('عدد النقاط الموجبة للإضافة أو السالبة للخصم').setRequired(true).setMinValue(-100000).setMaxValue(100000))
    .addStringOption(o => o.setName('reason').setDescription('السبب').setRequired(true).setMaxLength(500)),
  new SlashCommandBuilder().setName('pvp-top').setDescription('عرض أفضل اللاعبين حسب نقاط PVP'),
  new SlashCommandBuilder().setName('ticket-close').setDescription('إغلاق التكت الحالي'),
  new SlashCommandBuilder().setName('ticket-claim').setDescription('استلام التكت الحالي'),
  new SlashCommandBuilder().setName('announce').setDescription('إرسال إعلان في روم').setDefaultMemberPermissions(admin)
    .addChannelOption(o => o.setName('channel').setDescription('الروم المراد إرسال الإعلان فيه').setRequired(true))
    .addStringOption(o => o.setName('message').setDescription('نص الإعلان').setRequired(true).setMaxLength(1800)),
  new SlashCommandBuilder().setName('dm-all').setDescription('إرسال رسالة خاصة لأعضاء السيرفر بعد التأكيد').setDefaultMemberPermissions(admin)
    .addStringOption(o => o.setName('message').setDescription('نص الرسالة').setRequired(true).setMaxLength(1000)),
  new SlashCommandBuilder().setName('warn').setDescription('تحذير عضو').setDefaultMemberPermissions(admin)
    .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('سبب التحذير').setRequired(true).setMaxLength(500)),
  new SlashCommandBuilder().setName('kick').setDescription('طرد عضو').setDefaultMemberPermissions(admin)
    .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('السبب').setRequired(false).setMaxLength(500)),
  new SlashCommandBuilder().setName('ban').setDescription('حظر عضو').setDefaultMemberPermissions(admin)
    .addUserOption(o => o.setName('member').setDescription('العضو').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('السبب').setRequired(false).setMaxLength(500))
].map(c => c.toJSON());
