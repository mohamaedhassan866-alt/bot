require('dotenv').config();

const ticketTypes = {
  general: { label: 'استفسار عام', description: 'عندك سؤال أو استفسار؟ افتح تذكرة وسنساعدك.', emoji: '💬', categoryEnv: 'CATEGORY_GENERAL', questions: [{id:'question',label:'اكتب استفسارك',style:2,required:true,placeholder:'اشرح استفسارك بالتفصيل'}] },
  vip: { label: 'شراء رتبة VIP', description: 'لشراء رتبة VIP أو الاستفسار عن الأسعار والمميزات.', emoji: '💎', categoryEnv: 'CATEGORY_VIP', questions: [{id:'rank',label:'رتبة VIP المطلوبة',style:1,required:true,placeholder:'اسم الرتبة المطلوبة'},{id:'payment',label:'طريقة الدفع أو استفسارك',style:2,required:true,placeholder:'اكتب طريقة الدفع أو استفسارك'}] },
  partner: { label: 'بارتنر', description: 'لطلب شراكة مع السيرفر أو تجديد شراكة قائمة.', emoji: '🤝', categoryEnv: 'CATEGORY_PARTNER', questions: [{id:'server',label:'اسم ورابط سيرفرك',style:1,required:true,placeholder:'اسم السيرفر + رابط الدعوة'},{id:'members',label:'عدد الأعضاء',style:1,required:true,placeholder:'عدد الأعضاء التقريبي'},{id:'details',label:'تفاصيل الشراكة',style:2,required:true,placeholder:'اشرح اقتراح الشراكة'}] },
  high_rank: { label: 'طلب رتبة عليا', description: 'لطلب رتبة إدارية عليا مع توضيح خبراتك وسبب الطلب.', emoji: '🛡️', categoryEnv: 'CATEGORY_HIGH_RANK', questions: [{id:'rank',label:'الرتبة المطلوبة',style:1,required:true,placeholder:'اسم الرتبة'},{id:'experience',label:'خبراتك السابقة',style:2,required:true,placeholder:'خبراتك في الإدارة'},{id:'reason',label:'لماذا تستحق الرتبة؟',style:2,required:true,placeholder:'اكتب أسبابك'}] },
  staff_application: { label: 'تقديمات الإدارة', description: 'للتقديم والانضمام إلى فريق إدارة السيرفر.', emoji: '📝', categoryEnv: 'CATEGORY_STAFF_APPLICATION', questions: [{id:'age',label:'العمر',style:1,required:true,placeholder:'اكتب عمرك'},{id:'experience',label:'خبراتك الإدارية',style:2,required:true,placeholder:'اذكر خبراتك السابقة'},{id:'availability',label:'وقت نشاطك',style:2,required:true,placeholder:'متى وكم ساعة تقدر تتواجد؟'},{id:'reason',label:'لماذا تريد الانضمام للإدارة؟',style:2,required:true,placeholder:'اكتب سبب تقديمك'}] },
  compensation: { label: 'تعويضات', description: 'لطلب تعويض عن خسارة أو مشكلة مع إرفاق الأدلة.', emoji: '💰', categoryEnv: 'CATEGORY_COMPENSATION', questions: [{id:'type',label:'نوع التعويض',style:1,required:true,placeholder:'ما الذي تريد التعويض عنه؟'},{id:'details',label:'تفاصيل المشكلة',style:2,required:true,placeholder:'ماذا حدث ومتى؟'},{id:'proof',label:'الأدلة',style:2,required:true,placeholder:'روابط صور أو فيديو أو تفاصيل الدليل'}] },
  tech_support: { label: 'الدعم الفني', description: 'للإبلاغ عن مشكلة تقنية في البوت أو السيرفر.', emoji: '🧰', categoryEnv: 'CATEGORY_TECH_SUPPORT', questions: [{id:'problem',label:'المشكلة التقنية',style:2,required:true,placeholder:'اشرح المشكلة والخطوات التي سببتها'}] },
  complaint: { label: 'الشكاوى', description: 'لتقديم شكوى على عضو أو إداري مع ذكر التفاصيل والأدلة.', emoji: '⚠️', categoryEnv: 'CATEGORY_COMPLAINT', questions: [{id:'against',label:'الشكوى ضد من؟',style:1,required:true,placeholder:'اسم العضو أو الإداري'},{id:'details',label:'تفاصيل الشكوى',style:2,required:true,placeholder:'اشرح ما حدث'},{id:'proof',label:'الأدلة',style:2,required:false,placeholder:'روابط الأدلة إن وجدت'}] }
};

module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  ownerRoleId: process.env.OWNER_ROLE_ID,
  adminRoleId: process.env.ADMIN_ROLE_ID,
  modRoleId: process.env.MOD_ROLE_ID,
  supportRoleId: process.env.SUPPORT_ROLE_ID,
  logsChannelId: process.env.LOGS_CHANNEL_ID,
  reportsChannelId: process.env.REPORTS_CHANNEL_ID,
  mtaHost: process.env.MTA_HOST || '127.0.0.1',
  mtaPort: Number(process.env.MTA_PORT || 22003),
  mtaDisplayName: process.env.MTA_DISPLAY_NAME || 'Djexo PvP | MTA SA',
  statusChannelId: process.env.STATUS_CHANNEL_ID,
  statusUpdateMinutes: Math.max(1, Number(process.env.STATUS_UPDATE_MINUTES || 5)),
  ticketTypes
};
