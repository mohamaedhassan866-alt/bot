const {
  Client, GatewayIntentBits, Partials, Events, EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder,
  TextInputStyle, ChannelType, PermissionFlagsBits
} = require('discord.js');
const GameDig = require('gamedig');
const cfg = require('./config');
const store = require('./store');
const fs = require('node:fs');
const path = require('node:path');
const statusImagePath = path.join(__dirname, '..', 'assets', 'server-off.png');
const ticketPanelImagePath = path.join(__dirname, '..', 'assets', 'ticket-banner.jpg');
const statusMessageFile = path.join(__dirname, '..', 'data', 'status-message.json');
function readStatusMessageId() { try { return JSON.parse(fs.readFileSync(statusMessageFile, 'utf8')).messageId || null; } catch { return null; } }
function saveStatusMessageId(messageId) { fs.mkdirSync(path.dirname(statusMessageFile), { recursive: true }); fs.writeFileSync(statusMessageFile, JSON.stringify({ messageId }, null, 2)); }
console.log('[ENV CHECK]', {
  DISCORD_TOKEN: Boolean(process.env.DISCORD_TOKEN?.trim()),
  CLIENT_ID: Boolean(process.env.CLIENT_ID?.trim()),
  GUILD_ID: Boolean(process.env.GUILD_ID?.trim()),
  configToken: Boolean(cfg.token),
  configClientId: Boolean(cfg.clientId),
  configGuildId: Boolean(cfg.guildId)
});

// Only the Guilds intent is needed for slash commands, interactions, and ticket channels.
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  // Allow extra time for Discord API requests on slow or unstable connections.
  rest: { timeout: 60_000 }
});
const COLORS = { blue: 0x5865F2, green: 0x2ECC71, red: 0xE74C3C, gold: 0xF1C40F };

function isStaff(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  const roleIds = [cfg.ownerRoleId, cfg.adminRoleId, cfg.modRoleId, cfg.supportRoleId].filter(Boolean);
  return roleIds.some(id => member.roles?.cache?.has(id));
}
function makeTicketPanel() {
  const embed = new EmbedBuilder()
    .setColor(COLORS.blue)
    .setTitle('🎫 مركز تذاكر Djexo PvP')
    .setDescription('اختار نوع التذكرة من القائمة. كل نوع له قسم مستقل وأسئلة خاصة به.\n\n**يرجى اختيار النوع الصحيح وتقديم معلومات دقيقة.**')
    .setImage('attachment://ticket-banner.jpg')
    .setFooter({ text: 'Djexo PvP • MTA San Andreas' });
  const menu = new StringSelectMenuBuilder().setCustomId('ticket:type').setPlaceholder('اختار نوع التذكرة...').setMinValues(1).setMaxValues(1)
    .addOptions(Object.entries(cfg.ticketTypes).map(([value, t]) => ({ label: t.label, description: t.description.slice(0, 100), value, emoji: t.emoji })));
  return {
    embeds: [embed],
    files: [{ attachment: ticketPanelImagePath, name: 'ticket-banner.jpg' }],
    components: [new ActionRowBuilder().addComponents(menu)]
  };
}
function buildModal(typeKey) {
  const type = cfg.ticketTypes[typeKey];
  const modal = new ModalBuilder().setCustomId(`ticketmodal:${typeKey}`).setTitle(type.label.slice(0, 45));
  const rows = type.questions.slice(0, 5).map(q => {
    const input = new TextInputBuilder().setCustomId(q.id).setLabel(q.label.slice(0, 45)).setStyle(q.style === 1 ? TextInputStyle.Short : TextInputStyle.Paragraph)
      .setRequired(Boolean(q.required));
    if (q.placeholder) input.setPlaceholder(q.placeholder.slice(0, 100));
    return new ActionRowBuilder().addComponents(input);
  });
  modal.addComponents(...rows);
  return modal;
}
async function logToGuild(guild, embed) {
  if (!cfg.logsChannelId) return;
  const ch = guild.channels.cache.get(cfg.logsChannelId);
  if (ch?.isTextBased()) await ch.send({ embeds: [embed] }).catch(() => {});
}
async function queryMta() {
  return GameDig.query({ type: 'mtasa', host: cfg.mtaHost, port: cfg.mtaPort, socketTimeout: 4000, attemptTimeout: 7000, maxAttempts: 1 });
}
function statusEmbed(info) {
  const embed = new EmbedBuilder().setColor(info ? COLORS.green : COLORS.red).setTitle(`🛰️ ${cfg.mtaDisplayName}`)
    .setDescription(info ? '🟢 **حالة السيرفر: Online**' : '🔴 **حالة السيرفر: Offline أو لا يمكن الوصول إليه**')
    .addFields(
      { name: '👥 اللاعبون', value: info ? `${info.numplayers ?? info.players?.length ?? 0} / ${info.maxplayers ?? 'غير معروف'}` : 'غير متاح', inline: true },
      { name: '🌐 العنوان', value: `\`${cfg.mtaHost}:${cfg.mtaPort}\``, inline: true }
    ).setImage('attachment://server-off.png')
    .setFooter({ text: 'Djexo PvP • حالة سيرفر MTA' }).setTimestamp();
  if (info?.map) embed.addFields({ name: '🗺️ الخريطة', value: String(info.map).slice(0, 100), inline: true });
  return embed;
}
async function createTicket(interaction, typeKey, answers) {
  const type = cfg.ticketTypes[typeKey];
  const categoryId = process.env[type.categoryEnv];
  if (!categoryId) {
    await interaction.reply({ content: `إعداد قسم هذا النوع ناقص. أضف قيمة \`${type.categoryEnv}\` في ملف .env ثم أعد تشغيل البوت.`, ephemeral: true });
    return;
  }
  const category = interaction.guild.channels.cache.get(categoryId);
  if (!category || category.type !== ChannelType.GuildCategory) {
    await interaction.reply({ content: `القيمة \`${type.categoryEnv}\` ليست ID لقسم Category صالح. تأكد من نسخ ID القسم الصحيح.`, ephemeral: true });
    return;
  }
  const existing = store.getOpenTicket(interaction.user.id, typeKey);
  if (existing) {
    const oldChannel = interaction.guild.channels.cache.get(existing.channelId);
    if (oldChannel) {
      await interaction.reply({ content: `عندك تكت مفتوح من نفس النوع: ${oldChannel}`, ephemeral: true });
      return;
    }
  }
  const safeName = `${typeKey}-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 85) || `${typeKey}-ticket`;
  const overwrites = [
    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] }
  ];
  if (cfg.supportRoleId) overwrites.push({ id: cfg.supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] });
  const channel = await interaction.guild.channels.create({ name: safeName, type: ChannelType.GuildText, parent: category.id, topic: `Ticket type: ${type.label} | User ID: ${interaction.user.id}`, permissionOverwrites: overwrites, reason: `Ticket opened by ${interaction.user.tag}` });
  store.addTicket(channel.id, { channelId: channel.id, userId: interaction.user.id, type: typeKey, openedAt: new Date().toISOString(), closed: false, claimedBy: null });
  const fields = Object.entries(answers).map(([label, value]) => ({ name: label.slice(0, 256), value: String(value || 'لم تتم الإجابة').slice(0, 1024) || 'لم تتم الإجابة', inline: false }));
  const embed = new EmbedBuilder().setColor(COLORS.blue).setTitle(`${type.emoji} ${type.label}`).setDescription(`مرحبًا ${interaction.user}، تم فتح تذكرتك. سيقوم الفريق بمساعدتك قريبًا.`)
    .addFields({ name: 'صاحب التذكرة', value: `${interaction.user} (\`${interaction.user.id}\`)`, inline: false }, ...fields)
    .setFooter({ text: 'Djexo PvP Ticket System' }).setTimestamp();
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:claim').setLabel('استلام التكت').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket:close').setLabel('إغلاق التكت').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );
  await channel.send({ content: cfg.supportRoleId ? `<@&${cfg.supportRoleId}>` : undefined, embeds: [embed], components: [buttons], allowedMentions: { roles: cfg.supportRoleId ? [cfg.supportRoleId] : [] } });
  await interaction.reply({ content: `تم فتح تذكرتك بنجاح: ${channel}`, ephemeral: true });
  await logToGuild(interaction.guild, new EmbedBuilder().setColor(COLORS.green).setTitle('تذكرة جديدة').setDescription(`${interaction.user} فتح تذكرة ${type.label}: ${channel}`).setTimestamp());
}

client.once(Events.ClientReady, ready => {
  console.log(`Logged in as ${ready.user.tag}`);
  if (cfg.statusChannelId) {
    const updateStatus = async () => {
      try {
        const channel = await ready.channels.fetch(cfg.statusChannelId).catch(() => null);
        if (!channel?.isTextBased()) return;
        let info = null;
        try { info = await queryMta(); } catch {}
        const payload = { embeds: [statusEmbed(info)], files: [{ attachment: statusImagePath, name: 'server-off.png' }] };
        const savedMessageId = readStatusMessageId();
        if (savedMessageId) {
          // Prefer editing the saved message so regular updates never create duplicates.
          try {
            const msg = await channel.messages.fetch(savedMessageId);
            await msg.edit(payload);
            console.log(`Updated existing MTA status message: ${msg.id}`);
            return;
          } catch (err) {
            // Discord API error 10008 = Unknown Message. Only in that case create a replacement.
            // For permission/network errors, do not send another message and risk duplicates.
            if (Number(err?.code) !== 10008) {
              console.error(`Could not fetch/edit saved MTA status message (${savedMessageId}); no replacement sent:`, err.message);
              return;
            }
            console.warn(`Saved MTA status message (${savedMessageId}) no longer exists. Creating one replacement.`);
          }
        }

        // First run, or saved message was deleted: create one message and save its ID.
        const msg = await channel.send(payload).catch(err => {
          console.error('Could not send MTA status message:', err.message);
          return null;
        });
        if (msg) {
          saveStatusMessageId(msg.id);
          console.log(`Created MTA status message and saved ID: ${msg.id}`);
        }
      } catch (e) { console.error('MTA status update error:', e.message); }
    };
    updateStatus();
    setInterval(updateStatus, cfg.statusUpdateMinutes * 60_000).unref();
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (['setup', 'announce', 'dm-all', 'warn', 'kick', 'ban', 'pvp-add'].includes(interaction.commandName) && !isStaff(interaction.member)) {
        return interaction.reply({ content: 'ليس لديك صلاحية استخدام هذا الأمر.', ephemeral: true });
      }
      if (interaction.commandName === 'setup') {
        // Acknowledge the interaction immediately so Discord doesn't show
        // "The application did not respond" while the banner is uploading.
        await interaction.deferReply({ ephemeral: true });
        try {
          if (!interaction.channel?.isTextBased()) {
            return interaction.editReply('تعذر نشر لوحة التكتات: استخدم الأمر داخل روم نصي.');
          }
          if (!fs.existsSync(ticketPanelImagePath)) {
            console.error('Ticket panel banner is missing:', ticketPanelImagePath);
            return interaction.editReply('تعذر نشر لوحة التكتات: ملف الصورة ticket-banner.jpg غير موجود داخل مجلد assets.');
          }
          await interaction.channel.send(makeTicketPanel());
          return interaction.editReply('✅ تم نشر لوحة التكتات بالصورة بنجاح.');
        } catch (error) {
          console.error('Setup panel error:', error);
          const detail = String(error?.message || 'خطأ غير معروف').slice(0, 700);
          return interaction.editReply(`❌ تعذر نشر لوحة التكتات. تأكد من صلاحيات Send Messages وEmbed Links وAttach Files، وتأكد من اتصال الإنترنت.\nنوع الخطأ: ${error?.name || 'Unknown'}\nالتفاصيل: ${detail}`).catch(() => {});
        }
      }
      if (interaction.commandName === 'mta-status') {
        await interaction.deferReply({ ephemeral: true });
        try { const info = await queryMta(); return interaction.editReply({ embeds: [statusEmbed(info)] }); }
        catch { return interaction.editReply({ embeds: [statusEmbed(null)] }); }
      }
      if (interaction.commandName === 'report') {
        const target = interaction.options.getUser('member', true);
        const details = interaction.options.getString('details', true);
        if (target.bot) return interaction.reply({ content: 'لا يمكن تقديم بلاغ على بوت.', ephemeral: true });
        if (!cfg.reportsChannelId) return interaction.reply({ content: 'روم البلاغات غير مضبوط. أضف REPORTS_CHANNEL_ID في ملف .env.', ephemeral: true });
        const reportChannel = interaction.guild.channels.cache.get(cfg.reportsChannelId);
        if (!reportChannel?.isTextBased()) return interaction.reply({ content: 'REPORTS_CHANNEL_ID لا يشير إلى روم نصي صالح.', ephemeral: true });
        const embed = new EmbedBuilder().setColor(COLORS.gold).setTitle('📣 بلاغ جديد')
          .addFields({ name: 'مقدم البلاغ', value: `${interaction.user} (\`${interaction.user.id}\`)` }, { name: 'العضو المبلّغ عنه', value: `${target} (\`${target.id}\`)` }, { name: 'التفاصيل', value: details })
          .setFooter({ text: `Server: ${interaction.guild.name}` }).setTimestamp();
        await reportChannel.send({ embeds: [embed] });
        await logToGuild(interaction.guild, new EmbedBuilder().setColor(COLORS.gold).setTitle('تم إرسال بلاغ').setDescription(`من ${interaction.user} ضد ${target}`).setTimestamp());
        return interaction.reply({ content: 'تم إرسال البلاغ للإدارة. شكرًا لإبلاغنا.', ephemeral: true });
      }
      if (interaction.commandName === 'pvp-points') {
        const target = interaction.options.getUser('member') || interaction.user;
        const points = store.getPvpPoints(target.id);
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle('🏆 نقاط PVP').setDescription(`العضو: ${target}
النقاط: **${points}**`).setTimestamp()], ephemeral: true });
      }
      if (interaction.commandName === 'pvp-add') {
        const target = interaction.options.getUser('member', true);
        const amount = interaction.options.getInteger('points', true);
        const reason = interaction.options.getString('reason', true);
        if (target.bot) return interaction.reply({ content: 'لا يمكن تعديل نقاط بوت.', ephemeral: true });
        const current = store.changePvpPoints(target.id, amount, reason, interaction.user.id);
        await logToGuild(interaction.guild, new EmbedBuilder().setColor(COLORS.gold).setTitle('تعديل نقاط PVP').setDescription(`العضو: ${target}
التغيير: ${amount > 0 ? '+' : ''}${amount}
الإجمالي: ${current}
بواسطة: ${interaction.user}
السبب: ${reason}`).setTimestamp());
        return interaction.reply({ content: `تم تحديث نقاط ${target}. الإجمالي الآن: **${current}**`, ephemeral: true });
      }
      if (interaction.commandName === 'pvp-top') {
        const top = store.getPvpTop(10);
        const description = top.length ? top.map((entry, i) => `**${i + 1}.** <@${entry.userId}> — **${entry.points}** نقطة`).join('\n') : 'لا توجد نقاط مسجلة حتى الآن.';
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.gold).setTitle('🏆 أفضل لاعبي PVP').setDescription(description).setTimestamp()] });
      }
      if (interaction.commandName === 'ticket-close') {
        const ticket = store.getTicket(interaction.channelId);
        if (!ticket || ticket.closed) return interaction.reply({ content: 'هذه القناة ليست تكتًا مفتوحًا.', ephemeral: true });
        if (interaction.user.id !== ticket.userId && !isStaff(interaction.member)) return interaction.reply({ content: 'صاحب التكت أو فريق الإدارة فقط يمكنه إغلاقه.', ephemeral: true });
        store.closeTicket(interaction.channelId);
        await interaction.reply({ content: '🔒 سيتم إغلاق التكت بعد 5 ثوانٍ.' });
        await logToGuild(interaction.guild, new EmbedBuilder().setColor(COLORS.red).setTitle('تم إغلاق تكت').setDescription(`${interaction.user} أغلق <#${interaction.channelId}>`).setTimestamp());
        setTimeout(() => interaction.channel.delete('Ticket closed').catch(() => {}), 5000);
        return;
      }
      if (interaction.commandName === 'ticket-claim') {
        const ticket = store.getTicket(interaction.channelId);
        if (!ticket || ticket.closed) return interaction.reply({ content: 'هذه القناة ليست تكتًا مفتوحًا.', ephemeral: true });
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'هذا الأمر لفريق الإدارة والدعم فقط.', ephemeral: true });
        store.setClaim(interaction.channelId, interaction.user.id);
        return interaction.reply({ content: `تم استلام التكت بواسطة ${interaction.user}.` });
      }
      if (interaction.commandName === 'dm-all') {
        const message = interaction.options.getString('message', true);
        await interaction.deferReply({ ephemeral: true });
        let members;
        try { members = await interaction.guild.members.fetch(); }
        catch (e) {
          return interaction.editReply('لم أستطع جلب قائمة الأعضاء. فعّل **Server Members Intent** من Discord Developer Portal > Bot ثم أعد تشغيل البوت.');
        }
        const targets = members.filter(m => !m.user.bot);
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`dmall:confirm:${interaction.user.id}`).setLabel('تأكيد الإرسال').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`dmall:cancel:${interaction.user.id}`).setLabel('إلغاء').setStyle(ButtonStyle.Secondary)
        );
        const preview = new EmbedBuilder().setColor(COLORS.gold).setTitle('⚠️ تأكيد إرسال رسالة خاصة للجميع')
          .setDescription(`سيتم إرسال الرسالة إلى **${targets.size} عضوًا** (باستثناء البوتات). قد يفشل الإرسال لبعض الأعضاء بسبب إعدادات الخصوصية.`)
          .addFields({ name: 'معاينة الرسالة', value: message })
          .setFooter({ text: 'استخدم هذه الميزة للإعلانات المهمة فقط وتجنب الإزعاج.' });
        return interaction.editReply({ embeds: [preview], components: [confirmRow] });
      }
      if (interaction.commandName === 'announce') {
        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');
        if (!channel.isTextBased()) return interaction.reply({ content: 'اختار روم نصي.', ephemeral: true });
        await channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle('📢 إعلان رسمي').setDescription(message).setFooter({ text: cfg.mtaDisplayName }).setTimestamp()] });
        return interaction.reply({ content: 'تم إرسال الإعلان.', ephemeral: true });
      }
      if (['warn', 'kick', 'ban'].includes(interaction.commandName)) {
        const user = interaction.options.getUser('member');
        const reason = interaction.options.getString('reason') || 'لم يتم تحديد سبب';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: 'لم أجد العضو داخل السيرفر.', ephemeral: true });
        if (user.id === interaction.user.id) return interaction.reply({ content: 'لا يمكنك تنفيذ هذا الإجراء على نفسك.', ephemeral: true });
        if (interaction.commandName !== 'warn' && !member.manageable) return interaction.reply({ content: 'لا أستطيع إدارة هذا العضو. تأكد من صلاحيات البوت وترتيب الرتب.', ephemeral: true });
        if (interaction.commandName === 'warn') {
          await user.send(`تم تحذيرك في ${interaction.guild.name}. السبب: ${reason}`).catch(() => {});
          await logToGuild(interaction.guild, new EmbedBuilder().setColor(COLORS.gold).setTitle('تحذير عضو').setDescription(`العضو: ${user}\nبواسطة: ${interaction.user}\nالسبب: ${reason}`).setTimestamp());
          return interaction.reply({ content: `تم تسجيل التحذير وإبلاغ ${user} قدر الإمكان. ملاحظة: التحذيرات لا تُخزّن كسجل دائم في هذا الإصدار.`, ephemeral: true });
        }
        if (interaction.commandName === 'kick') await member.kick(reason);
        else await member.ban({ reason });
        await logToGuild(interaction.guild, new EmbedBuilder().setColor(COLORS.red).setTitle(interaction.commandName === 'kick' ? 'طرد عضو' : 'حظر عضو').setDescription(`العضو: ${user.tag}\nبواسطة: ${interaction.user}\nالسبب: ${reason}`).setTimestamp());
        return interaction.reply({ content: `تم ${interaction.commandName === 'kick' ? 'طرد' : 'حظر'} ${user.tag}.`, ephemeral: true });
      }
    }
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket:type') {
      const typeKey = interaction.values[0];
      if (!cfg.ticketTypes[typeKey]) return interaction.reply({ content: 'نوع تذكرة غير صالح.', ephemeral: true });
      const existing = store.getOpenTicket(interaction.user.id, typeKey);
      if (existing && interaction.guild.channels.cache.has(existing.channelId)) return interaction.reply({ content: `عندك تكت مفتوح من نفس النوع: <#${existing.channelId}>`, ephemeral: true });
      return interaction.showModal(buildModal(typeKey));
    }
    if (interaction.isModalSubmit() && interaction.customId.startsWith('ticketmodal:')) {
      const typeKey = interaction.customId.split(':')[1];
      const type = cfg.ticketTypes[typeKey];
      if (!type) return interaction.reply({ content: 'نوع التكت غير صالح.', ephemeral: true });
      const answers = {};
      for (const q of type.questions) answers[q.label] = interaction.fields.getTextInputValue(q.id) || 'لم تتم الإجابة';
      return createTicket(interaction, typeKey, answers);
    }
    if (interaction.isButton() && interaction.customId.startsWith('dmall:')) {
      const [, action, ownerId] = interaction.customId.split(':');
      if (interaction.user.id !== ownerId) return interaction.reply({ content: 'هذا التأكيد ليس لك.', ephemeral: true });
      if (!isStaff(interaction.member)) return interaction.reply({ content: 'ليس لديك صلاحية استخدام هذا الإجراء.', ephemeral: true });
      if (action === 'cancel') {
        return interaction.update({ content: 'تم إلغاء إرسال الرسائل الخاصة.', embeds: [], components: [] });
      }
      if (action === 'confirm') {
        const original = interaction.message.embeds[0];
        const message = original?.fields?.find(f => f.name === 'معاينة الرسالة')?.value;
        if (!message) return interaction.update({ content: 'تعذر استرجاع نص الرسالة. أعد الأمر من جديد.', embeds: [], components: [] });
        await interaction.update({ content: '⏳ بدأ إرسال الرسائل الخاصة. سأعرض لك النتيجة عند الانتهاء.', embeds: [], components: [] });
        const members = await interaction.guild.members.fetch();
        const targets = members.filter(m => !m.user.bot);
        let sent = 0, failed = 0;
        for (const member of targets.values()) {
          try {
            await member.send({ embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle(`📢 رسالة من ${interaction.guild.name}`).setDescription(message).setFooter({ text: cfg.mtaDisplayName }).setTimestamp()] });
            sent++;
          } catch { failed++; }
          // Gentle pacing to reduce rate-limit pressure and avoid burst messaging.
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
        await interaction.followUp({ content: `انتهى الإرسال. ✅ تم الإرسال: **${sent}**
⚠️ تعذر الإرسال: **${failed}**`, ephemeral: true });
        await logToGuild(interaction.guild, new EmbedBuilder().setColor(COLORS.gold).setTitle('إرسال رسالة خاصة جماعية').setDescription(`بواسطة: ${interaction.user}
تم الإرسال: ${sent}
تعذر الإرسال: ${failed}`).setTimestamp());
        return;
      }
    }
    if (interaction.isButton() && interaction.customId.startsWith('ticket:')) {
      const ticket = store.getTicket(interaction.channelId);
      if (!ticket || ticket.closed) return interaction.reply({ content: 'التكت غير موجود أو مغلق.', ephemeral: true });
      if (interaction.customId === 'ticket:claim') {
        if (!isStaff(interaction.member)) return interaction.reply({ content: 'استلام التكت متاح لفريق الإدارة والدعم فقط.', ephemeral: true });
        store.setClaim(interaction.channelId, interaction.user.id);
        return interaction.reply({ content: `تم استلام التكت بواسطة ${interaction.user}.` });
      }
      if (interaction.customId === 'ticket:close') {
        if (interaction.user.id !== ticket.userId && !isStaff(interaction.member)) return interaction.reply({ content: 'صاحب التكت أو فريق الإدارة فقط يمكنه إغلاقه.', ephemeral: true });
        store.closeTicket(interaction.channelId);
        await interaction.reply({ content: '🔒 سيتم إغلاق التكت بعد 5 ثوانٍ.' });
        await logToGuild(interaction.guild, new EmbedBuilder().setColor(COLORS.red).setTitle('تم إغلاق تكت').setDescription(`${interaction.user} أغلق <#${interaction.channelId}>`).setTimestamp());
        setTimeout(() => interaction.channel.delete('Ticket closed').catch(() => {}), 5000);
      }
    }
  } catch (error) {
    console.error('Interaction error:', error);
    const message = 'حصل خطأ أثناء تنفيذ الطلب. راجع إعدادات البوت وصلاحياته.';
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
    else if (interaction.isRepliable() && interaction.deferred) await interaction.editReply({ content: message }).catch(() => {});
  }
});

client.login(cfg.token).catch(error => { console.error('Login failed. Check DISCORD_TOKEN:', error.message); process.exit(1); });
