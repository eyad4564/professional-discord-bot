require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes,
  SlashCommandBuilder,
  AttachmentBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIG
// ============================================================

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = process.env.PREFIX || '!';

if (!TOKEN) {
  throw new Error('DISCORD_TOKEN is missing from Railway Environment Variables.');
}

const DATA_FILE = path.join(__dirname, 'data.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

// ============================================================
// DATA
// ============================================================

const DEFAULT_DATA = {
  guilds: {},
  users: {},
  warnings: {},
  jails: {},
  tickets: {},
  applications: {},
  complaints: {},
  temp: {}
};

let data = loadData();
let botOwnerId = null;

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(DEFAULT_DATA, null, 2)
      );
    }

    const d = JSON.parse(
      fs.readFileSync(DATA_FILE, 'utf8')
    );

    for (const k of Object.keys(DEFAULT_DATA)) {
      if (!d[k]) {
        d[k] = structuredClone(DEFAULT_DATA[k]);
      }
    }

    return d;
  } catch (e) {
    console.error('loadData:', e);
    return structuredClone(DEFAULT_DATA);
  }
}

let saveTimer;

function saveData(immediate = false) {
  if (immediate) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(data, null, 2)
    );
    return;
  }

  if (saveTimer) return;

  saveTimer = setTimeout(() => {
    saveTimer = null;

    try {
      fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2)
      );
    } catch (e) {
      console.error('saveData:', e);
    }
  }, 500);
}

// ============================================================
// GUILD CONFIG
// ============================================================

function guildCfg(gid) {
  data.guilds[gid] ||= {
    channels: {
      welcome: null,
      leave: null,
      joinLeaveLog: null,
      spamLog: null,
      moderationLog: null,
      jailLog: null,
      ticketLog: null,
      applicationRoom: null,
      applicationLog: null,
      complaintLog: null
    },

    ticketCategoryId: null,

    jailRoleId: null,

    applicationRoles: {
      role1: null,
      role2: null
    },

    adminRoles: {
      middle: [],
      high: [],
      owner: []
    }
  };

  const g = data.guilds[gid];

  g.channels ||= {};

  g.applicationRoles ||= {
    role1: null,
    role2: null
  };

  g.adminRoles ||= {
    middle: [],
    high: [],
    owner: []
  };

  return g;
}

// ============================================================
// USER DATA
// ============================================================

function userData(gid, uid) {
  const k = `${gid}:${uid}`;

  data.users[k] ||= {
    xp: 0,
    voiceXp: 0,
    actionPoints: 0,
    warnings: 0,
    timeouts: 0,
    ticketsClaimed: 0,
    baston: 0
  };

  return data.users[k];
}

// ============================================================
// HIERARCHY
// ============================================================

function isBotOwner(id) {
  return !!botOwnerId && id === botOwnerId;
}

function isServerOwner(member) {
  return !!member?.guild &&
    member.guild.ownerId === member.id;
}

function level(member) {
  if (!member?.guild) return 0;

  if (isBotOwner(member.id)) {
    return 100;
  }

  if (isServerOwner(member)) {
    return 90;
  }

  const c = guildCfg(member.guild.id);

  if (
    c.adminRoles.owner.some(
      r => member.roles.cache.has(r)
    )
  ) {
    return 80;
  }

  if (
    c.adminRoles.high.some(
      r => member.roles.cache.has(r)
    )
  ) {
    return 60;
  }

  if (
    c.adminRoles.middle.some(
      r => member.roles.cache.has(r)
    )
  ) {
    return 40;
  }

  if (
    member.permissions.has(
      PermissionsBitField.Flags.Administrator
    )
  ) {
    return 20;
  }

  return 0;
}

function isAdmin(member) {
  return level(member) > 0;
}

function isHigh(member) {
  return level(member) >= 60;
}

function isTop(member) {
  return level(member) >= 80;
}

function canPunish(actor, target) {
  return !!actor &&
    !!target &&
    actor.id !== target.id &&
    level(actor) > level(target);
}

// ============================================================
// UTILITIES
// ============================================================

function nowText() {
  return new Date().toLocaleString(
    'ar-EG',
    {
      dateStyle: 'medium',
      timeStyle: 'medium'
    }
  );
}

function parseDuration(s) {
  const m = String(s || '')
    .trim()
    .toLowerCase()
    .match(/^(\d+)(s|m|h|d|w)$/);

  if (!m) return null;

  const n = +m[1];
  const u = m[2];

  return n * ({
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
    w: 604800000
  }[u]);
}

function fmt(ms) {
  let s = Math.floor(ms / 1000);

  if (s <= 0) {
    return '0 ثانية';
  }

  const out = [];

  const map = [
    [604800, 'أسبوع'],
    [86400, 'يوم'],
    [3600, 'ساعة'],
    [60, 'دقيقة'],
    [1, 'ثانية']
  ];

  for (const [v, n] of map) {
    const q = Math.floor(s / v);

    if (q) {
      out.push(`${q} ${n}`);
      s %= v;
    }
  }

  return out.join(' و ');
}

function countEmoji(text) {
  try {
    return (
      text.match(
        /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu
      ) || []
    ).length;
  } catch {
    return 0;
  }
}

// ============================================================
// POINTS
// ============================================================

function points(xp) {
  return Math.floor((xp || 0) / 1500) * 3;
}

function totalPoints(u) {
  return points(u.xp) +
    (u.actionPoints || 0);
}

// ============================================================
// CHANNEL / LOG HELPERS
// ============================================================

async function fetchText(guild, id) {
  if (!id) return null;

  const c = await guild.channels
    .fetch(id)
    .catch(() => null);

  return c?.isTextBased()
    ? c
    : null;
}

async function sendLog(guild, kind, embed, file) {
  const id =
    guildCfg(guild.id).channels[kind];

  const ch =
    await fetchText(guild, id);

  if (!ch) return;

  await ch.send(
    file
      ? {
          embeds: [embed],
          files: [file]
        }
      : {
          embeds: [embed]
        }
  ).catch(console.error);
}

async function dmOwner(title, err) {
  if (!botOwnerId) return;

  const u =
    await client.users
      .fetch(botOwnerId)
      .catch(() => null);

  if (!u) return;

  await u.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`🚨 ${title}`)
        .setDescription(
          `البوت فيه مشكلة برجاء الحل في اسرع وقت\n\n` +
          `\`\`\`\n` +
          `${String(
            err?.stack || err
          ).slice(0, 1800)}` +
          `\n\`\`\``
        )
        .setTimestamp()
    ]
  }).catch(() => {});
}

// ============================================================
// MODERATION
// ============================================================

const warnReasons = {
  rules: 'مخالفة القوانين',
  insult: 'سب / إهانة',
  spam: 'سبام',
  staff: 'إساءة للإدارة'
};

function activeWarnings(gid, uid) {
  const k = `${gid}:${uid}`;

  data.warnings[k] ||= [];

  const now = Date.now();

  data.warnings[k] =
    data.warnings[k].filter(
      x => x.expiresAt > now
    );

  return data.warnings[k];
}

async function issueWarning(
  guild,
  actor,
  target,
  reason,
  dur
) {
  if (!canPunish(actor, target)) {
    throw new Error(
      'لا يمكنك معاقبة إداري أعلى منك أو بنفس مستواك.'
    );
  }

  const k =
    `${guild.id}:${target.id}`;

  data.warnings[k] ||= [];

  data.warnings[k].push({
    id: Date.now(),
    moderatorId: actor.id,
    reason,
    createdAt: Date.now(),
    expiresAt: Date.now() + dur
  });

  const a =
    userData(guild.id, actor.id);

  a.actionPoints += 3;
  a.warnings += 1;

  saveData();

  await target.send(
    `⚠️ تم تحذيرك في **${guild.name}**\n` +
    `السبب: ${reason}\n` +
    `المدة: ${fmt(dur)}`
  ).catch(() => {});

  await sendLog(
    guild,
    'moderationLog',
    new EmbedBuilder()
      .setTitle('⚠️ Warning')
      .addFields(
        {
          name: 'العضو',
          value: `${target} (${target.user.tag})`
        },
        {
          name: 'الإداري',
          value: `${actor}`
        },
        {
          name: 'السبب',
          value: reason
        },
        {
          name: 'المدة',
          value: fmt(dur)
        },
        {
          name: 'الوقت',
          value: nowText()
        }
      )
      .setTimestamp()
  );

  if (
    activeWarnings(
      guild.id,
      target.id
    ).length >= 3
  ) {
    await target
      .timeout(
        30 * 60 * 1000,
        '3 تحذيرات نشطة'
      )
      .catch(() => {});

    await target.send(
      '🚨 وصلت إلى 3 تحذيرات نشطة، وتم إعطاؤك Timeout لمدة 30 دقيقة.'
    ).catch(() => {});
  }
}

async function issueTimeout(
  guild,
  actor,
  target,
  dur,
  reason
) {
  if (!canPunish(actor, target)) {
    throw new Error(
      'لا يمكنك معاقبة إداري أعلى منك أو بنفس مستواك.'
    );
  }

  if (dur > 28 * 86400000) {
    throw new Error(
      'مدة Timeout لا تتجاوز 28 يومًا.'
    );
  }

  await target.timeout(
    dur,
    reason
  );

  const a =
    userData(guild.id, actor.id);

  a.actionPoints += 3;
  a.timeouts += 1;

  saveData();

  await target.send(
    `⏱️ تم إعطاؤك Timeout في **${guild.name}**\n` +
    `السبب: ${reason}\n` +
    `المدة: ${fmt(dur)}`
  ).catch(() => {});

  await sendLog(
    guild,
    'moderationLog',
    new EmbedBuilder()
      .setTitle('⏱️ Timeout')
      .addFields(
        {
          name: 'العضو',
          value: `${target} (${target.user.tag})`
        },
        {
          name: 'الإداري',
          value: `${actor}`
        },
        {
          name: 'المدة',
          value: fmt(dur)
        },
        {
          name: 'السبب',
          value: reason
        },
        {
          name: 'الوقت',
          value: nowText()
        }
      )
      .setTimestamp()
  );
}

async function issueBan(
  guild,
  actor,
  target,
  reason
) {
  if (!canPunish(actor, target)) {
    throw new Error(
      'لا يمكنك باند إداري أعلى منك أو بنفس مستواك.'
    );
  }

  await target.ban({
    reason
  });

  await sendLog(
    guild,
    'moderationLog',
    new EmbedBuilder()
      .setTitle('🔨 Ban')
      .addFields(
        {
          name: 'العضو',
          value:
            target.user?.tag ||
            target.id
        },
        {
          name: 'الإداري',
          value: `${actor}`
        },
        {
          name: 'السبب',
          value: reason
        },
        {
          name: 'الوقت',
          value: nowText()
        }
      )
      .setTimestamp()
  );
}

// ============================================================
// JAIL
// ============================================================

async function setupJail(guild) {
  const cfg =
    guildCfg(guild.id);

  let role =
    cfg.jailRoleId
      ? await guild.roles
          .fetch(cfg.jailRoleId)
          .catch(() => null)
      : null;

  if (!role) {
    role = await guild.roles.create({
      name: 'سجين',
      reason: 'Jail setup'
    });

    cfg.jailRoleId = role.id;
  }

  for (
    const ch of guild.channels.cache.values()
  ) {
    if (
      [
        ChannelType.GuildText,
        ChannelType.GuildAnnouncement,
        ChannelType.GuildVoice,
        ChannelType.GuildStageVoice
      ].includes(ch.type)
    ) {
      await ch.permissionOverwrites
        .edit(role, {
          ViewChannel: true,
          SendMessages: false,
          AddReactions: false,
          Connect: false,
          Speak: false
        })
        .catch(() => {});
    }
  }

  saveData(true);

  return role;
}

async function issueJail(
  guild,
  actor,
  target,
  dur,
  reason
) {
  if (!isHigh(actor)) {
    throw new Error(
      'السجن للعليا والأونر وServer Owner وBot Owner فقط.'
    );
  }

  if (!canPunish(actor, target)) {
    throw new Error(
      'لا يمكنك سجن إداري أعلى منك أو بنفس مستواك.'
    );
  }

  const role =
    await setupJail(guild);

  await target.roles.add(
    role,
    reason
  );

  data.jails[
    `${guild.id}:${target.id}`
  ] = {
    guildId: guild.id,
    userId: target.id,
    roleId: role.id,
    expiresAt: Date.now() + dur,
    moderatorId: actor.id,
    reason
  };

  saveData(true);

  await target.send(
    `⛓️ تم سجنك في **${guild.name}**\n` +
    `السبب: ${reason}\n` +
    `المدة: ${fmt(dur)}`
  ).catch(() => {});

  await sendLog(
    guild,
    'jailLog',
    new EmbedBuilder()
      .setTitle('⛓️ Jail')
      .addFields(
        {
          name: 'العضو',
          value: `${target}`
        },
        {
          name: 'الإداري',
          value: `${actor}`
        },
        {
          name: 'السبب',
          value: reason
        },
        {
          name: 'المدة',
          value: fmt(dur)
        },
        {
          name: 'الوقت',
          value: nowText()
        }
      )
      .setTimestamp()
  );
}

// ============================================================
// TICKETS
// ============================================================

function ticketButtons(t) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('📥 استلام التذكرة')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!!t.claimedBy),

      new ButtonBuilder()
        .setCustomId('ticket_unclaim')
        .setLabel('🔓 إلغاء الاستلام')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!t.claimedBy),

      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('🔒 إغلاق التذكرة')
        .setStyle(ButtonStyle.Danger)
    );
}

async function createTicket(
  guild,
  user
) {
  const cfg =
    guildCfg(guild.id);

  if (!cfg.ticketCategoryId) {
    throw new Error(
      'استخدم /setup-ticket-category أولًا.'
    );
  }

  const existing =
    Object.values(data.tickets)
      .find(
        t =>
          t.guildId === guild.id &&
          t.userId === user.id &&
          !t.closed
      );

  if (existing) {
    const c =
      guild.channels.cache.get(
        existing.channelId
      );

    if (c) return c;
  }

  const cat =
    guild.channels.cache.get(
      cfg.ticketCategoryId
    );

  if (!cat) {
    throw new Error(
      'Category التذاكر غير موجودة.'
    );
  }

  const name =
    `ticket-${user.username
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 18) || 'user'}`;

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [
        PermissionsBitField.Flags.ViewChannel
      ]
    },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    }
  ];

  for (
    const r of [
      ...cfg.adminRoles.middle,
      ...cfg.adminRoles.high,
      ...cfg.adminRoles.owner
    ]
  ) {
    overwrites.push({
      id: r,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    });
  }

  const ch =
    await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: cat.id,
      permissionOverwrites:
        overwrites
    });

  data.tickets[ch.id] = {
    channelId: ch.id,
    guildId: guild.id,
    userId: user.id,
    claimedBy: null,
    claimedLevel: null,
    createdAt: Date.now(),
    reminderSent: false,
    firstAdminReply: false,
    closed: false
  };

  saveData(true);

  await ch.send({
    content:
      `${user} الإدارة موجودة هنا، انتظر من فضلك.`,

    embeds: [
      new EmbedBuilder()
        .setTitle('🎫 تذكرة جديدة')
        .setDescription(
          '📥 استلام التذكرة من زر الإدارة.\n' +
          '⏱️ إذا لم ترد الإدارة خلال 60 ثانية سيتم تذكيرك بشرح مشكلتك.'
        )
        .setTimestamp()
    ],

    components: [
      ticketButtons(
        data.tickets[ch.id]
      )
    ]
  });

  return ch;
}

async function transcript(channel) {
  const all = [];
  let before;

  while (true) {
    const b =
      await channel.messages
        .fetch({
          limit: 100,
          before
        })
        .catch(() => null);

    if (!b?.size) break;

    all.push(
      ...b.values()
    );

    before =
      b.last().id;

    if (b.size < 100) break;
  }

  all.sort(
    (a, b) =>
      a.createdTimestamp -
      b.createdTimestamp
  );

  return all
    .map(
      m =>
        `[${new Date(
          m.createdTimestamp
        ).toLocaleString(
          'ar-EG'
        )}] ${m.author.tag}: ` +
        `${m.content || '[بدون نص]'}` +
        `${
          m.attachments.size
            ? '\n  Attachments: ' +
              [
                ...m.attachments.values()
              ]
                .map(x => x.url)
                .join(', ')
            : ''
        }`
    )
    .join('\n');
}

async function closeTicket(interaction) {
  const t =
    data.tickets[
      interaction.channel.id
    ];

  if (!t) {
    return interaction.reply({
      content:
        'هذه ليست تذكرة.',
      ephemeral: true
    });
  }

  if (
    !isAdmin(interaction.member) &&
    interaction.user.id !== t.userId
  ) {
    return interaction.reply({
      content:
        'ليس لديك صلاحية الإغلاق.',
      ephemeral: true
    });
  }

  await interaction.reply({
    content:
      '🔒 يتم حفظ الـ Transcript وإغلاق التذكرة...',
    ephemeral: true
  });

  const txt =
    await transcript(
      interaction.channel
    );

  const p =
    path.join(
      __dirname,
      `transcript-${interaction.channel.id}-${Date.now()}.txt`
    );

  fs.writeFileSync(
    p,
    txt,
    'utf8'
  );

  const ch =
    await fetchText(
      interaction.guild,
      guildCfg(
        interaction.guild.id
      ).channels.ticketLog
    );

  if (ch) {
    await ch.send({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            '📄 Ticket Transcript'
          )
          .addFields(
            {
              name: 'التذكرة',
              value:
                interaction.channel.name
            },
            {
              name: 'صاحبها',
              value:
                `<@${t.userId}>`
            },
            {
              name: 'أغلقها',
              value:
                `${interaction.user}`
            },
            {
              name: 'الوقت',
              value:
                nowText()
            }
          )
          .setTimestamp()
      ],
      files: [
        new AttachmentBuilder(p)
      ]
    }).catch(() => {});
  }

  t.closed = true;
  t.closedAt = Date.now();
  t.closedBy =
    interaction.user.id;

  saveData(true);

  setTimeout(
    () => {
      interaction.channel
        .delete()
        .catch(() => {});

      fs.unlink(
        p,
        () => {}
      );
    },
    1000
  );
}

// ============================================================
// APPLICATIONS
// ============================================================

const appQs = [
  'اسمك؟',
  'عمرك؟',
  'بلدك؟',
  'كم مدة تفاعلك؟',
  'هل كنت إداري بسيرفر ثاني؟',
  'خبرتك؟',
  'بماذا راح تفيد الإدارة؟',
  'هل راح تحط الشعار والرابط؟'
];

function hasTRZ(m) {
  return [
    m.user.username,
    m.displayName,
    m.nickname || ''
  ].some(
    v =>
      v
        .toLowerCase()
        .includes('trz')
  );
}

function appPanel() {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          '📝 التقديم للإدارة'
        )
        .setDescription(
          'شرط التقديم: يجب أن يحتوي Username أو Display Name أو Nickname على TRZ.'
        )
        .setTimestamp()
    ],

    components: [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              'app_start'
            )
            .setLabel(
              '📝 تقديم للإدارة'
            )
            .setStyle(
              ButtonStyle.Primary
            )
        )
    ]
  };
}

function appModal1() {
  return new ModalBuilder()
    .setCustomId('app_m1')
    .setTitle(
      'التقديم 1/2'
    )
    .addComponents(
      ...[
        1,
        2,
        3,
        4,
        5
      ].map(
        i =>
          new ActionRowBuilder()
            .addComponents(
              new TextInputBuilder()
                .setCustomId(
                  `q${i}`
                )
                .setLabel(
                  appQs[i - 1]
                )
                .setStyle(
                  i === 5
                    ? TextInputStyle.Paragraph
                    : TextInputStyle.Short
                )
                .setRequired(true)
                .setMaxLength(
                  i === 5
                    ? 500
                    : 120
                )
            )
      )
    );
}

function appModal2() {
  return new ModalBuilder()
    .setCustomId('app_m2')
    .setTitle(
      'التقديم 2/2'
    )
    .addComponents(
      ...[
        6,
        7,
        8
      ].map(
        i =>
          new ActionRowBuilder()
            .addComponents(
              new TextInputBuilder()
                .setCustomId(
                  `q${i}`
                )
                .setLabel(
                  appQs[i - 1]
                )
                .setStyle(
                  TextInputStyle.Paragraph
                )
                .setRequired(true)
                .setMaxLength(1000)
            )
      )
    );
}

async function sendApplication(
  guild,
  uid
) {
  const cfg =
    guildCfg(guild.id);

  const c =
    await fetchText(
      guild,
      cfg.channels.applicationRoom
    );

  if (!c) {
    throw new Error(
      'روم التقديم غير مخصص. استخدم /setup-channel.'
    );
  }

  const a =
    data.applications[
      `${guild.id}:${uid}`
    ];

  const em =
    new EmbedBuilder()
      .setTitle(
        '📝 طلب تقديم جديد'
      )
      .setDescription(
        `المتقدم: <@${uid}>`
      )
      .addFields(
        appQs.map(
          (q, i) => ({
            name: q,
            value:
              String(
                a.answers[
                  `q${i + 1}`
                ] || '—'
              ).slice(
                0,
                1024
              )
          })
        )
      )
      .setTimestamp();

  const m =
    await c.send({
      embeds: [em],
      components: [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                `app_ok:${guild.id}:${uid}`
              )
              .setLabel(
                '✅ قبول'
              )
              .setStyle(
                ButtonStyle.Success
              ),

            new ButtonBuilder()
              .setCustomId(
                `app_no:${guild.id}:${uid}`
              )
              .setLabel(
                '❌ رفض'
              )
              .setStyle(
                ButtonStyle.Danger
              )
          )
      ]
    });

  a.messageId =
    m.id;

  saveData(true);
}

// ============================================================
// ANTI SPAM
// ============================================================

const spamMap =
  new Map();

async function antiSpam(message) {
  if (
    !message.guild ||
    message.author.bot ||
    !message.content
  ) {
    return false;
  }

  const key =
    `${message.guild.id}:${message.author.id}`;

  const now =
    Date.now();

  const arr =
    spamMap.get(key) || [];

  arr.push({
    id: message.id,
    content:
      message.content
        .trim()
        .toLowerCase(),
    ch: message.channel.id,
    t: now
  });

  while (
    arr.length > 20 ||
    now - arr[0].t > 15000
  ) {
    arr.shift();
  }

  spamMap.set(
    key,
    arr
  );

  if (
    countEmoji(
      message.content
    ) > 10
  ) {
    await message
      .delete()
      .catch(() => {});

    const m =
      await message.channel
        .send(
          `🚨 كفاية سبام ايموجي ${message.author}`
        )
        .catch(() => null);

    if (m) {
      setTimeout(
        () =>
          m.delete()
            .catch(
              () => {}
            ),
        5000
      );
    }

    await sendLog(
      message.guild,
      'spamLog',
      new EmbedBuilder()
        .setTitle(
          '🚨 Emoji Spam'
        )
        .addFields(
          {
            name: 'العضو',
            value:
              `${message.author}`
          },
          {
            name: 'الروم',
            value:
              `${message.channel}`
          },
          {
            name: 'عدد الإيموجي',
            value:
              String(
                countEmoji(
                  message.content
                )
              )
          },
          {
            name: 'المحتوى',
            value:
              message.content.slice(
                0,
                1000
              )
          },
          {
            name: 'الوقت',
            value:
              nowText()
          }
        )
        .setTimestamp()
    );

    return true;
  }

  const same =
    arr.filter(
      x =>
        x.ch ===
          message.channel.id &&
        x.content ===
          message.content
            .trim()
            .toLowerCase()
    );

  if (
    same.length > 5
  ) {
    let deleted = 0;

    for (
      const x of same
    ) {
      const m =
        await message.channel.messages
          .fetch(x.id)
          .catch(() => null);

      if (
        m?.author.id ===
          message.author.id &&
        await m
          .delete()
          .then(
            () => true
          )
          .catch(
            () => false
          )
      ) {
        deleted++;
      }
    }

    spamMap.delete(key);

    const m =
      await message.channel
        .send(
          `🚨 كفاية سبام رسائل ${message.author}`
        )
        .catch(() => null);

    if (m) {
      setTimeout(
        () =>
          m.delete()
            .catch(
              () => {}
            ),
        5000
      );
    }

    await sendLog(
      message.guild,
      'spamLog',
      new EmbedBuilder()
        .setTitle(
          '🚨 Message Spam'
        )
        .addFields(
          {
            name: 'العضو',
            value:
              `${message.author}`
          },
          {
            name: 'الروم',
            value:
              `${message.channel}`
          },
          {
            name: 'العدد',
            value:
              String(
                same.length
              )
          },
          {
            name: 'المحذوف',
            value:
              String(
                deleted
              )
          },
          {
            name: 'المحتوى',
            value:
              message.content.slice(
                0,
                1000
              )
          },
          {
            name: 'الوقت',
            value:
              nowText()
          }
        )
        .setTimestamp()
    );

    return true;
  }

  return false;
}

// ============================================================
// SLASH COMMANDS
// ============================================================

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('اختبار البوت'),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('تحذير عضو')
    .addUserOption(
      o =>
        o.setName('user')
          .setDescription('العضو')
          .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout')
    .addUserOption(
      o =>
        o.setName('user')
          .setDescription('العضو')
          .setRequired(true)
    )
    .addStringOption(
      o =>
        o.setName('duration')
          .setDescription(
            '30m / 1h'
          )
          .setRequired(true)
    )
    .addStringOption(
      o =>
        o.setName('reason')
          .setDescription(
            'السبب'
          )
          .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('setup-jail')
    .setDescription(
      'إعداد السجن'
    ),

  new SlashCommandBuilder()
    .setName('jail')
    .setDescription(
      'سجن عضو'
    )
    .addUserOption(
      o =>
        o.setName('user')
          .setDescription(
            'العضو'
          )
          .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription(
      'Ban'
    )
    .addUserOption(
      o =>
        o.setName('user')
          .setDescription(
            'العضو'
          )
          .setRequired(true)
    )
    .addStringOption(
      o =>
        o.setName('reason')
          .setDescription(
            'السبب'
          )
          .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription(
      'إرسال لوحة التذاكر'
    ),

  new SlashCommandBuilder()
    .setName(
      'setup-ticket-category'
    )
    .setDescription(
      'تحديد Category التذاكر'
    )
    .addChannelOption(
      o =>
        o.setName(
          'category'
        )
          .setDescription(
            'Category'
          )
          .addChannelTypes(
            ChannelType.GuildCategory
          )
          .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName(
      'application-panel'
    )
    .setDescription(
      'إرسال لوحة التقديم'
    ),

  new SlashCommandBuilder()
    .setName(
      'setup-channel'
    )
    .setDescription(
      'إعداد روم'
    )
    .addStringOption(
      o =>
        o.setName(
          'type'
        )
          .setDescription(
            'النوع'
          )
          .setRequired(true)
          .addChoices(
            ...[
              [
                'welcome',
                'welcome'
              ],
              [
                'leave',
                'leave'
              ],
              [
                'joinleave-log',
                'joinLeaveLog'
              ],
              [
                'spam-log',
                'spamLog'
              ],
              [
                'moderation-log',
                'moderationLog'
              ],
              [
                'jail-log',
                'jailLog'
              ],
              [
                'ticket-log',
                'ticketLog'
              ],
              [
                'application-room',
                'applicationRoom'
              ],
              [
                'application-log',
                'applicationLog'
              ],
              [
                'complaint-log',
                'complaintLog'
              ]
            ].map(
              ([name, value]) => ({
                name,
                value
              })
            )
          )
    )
    .addChannelOption(
      o =>
        o.setName(
          'channel'
        )
          .setDescription(
            'الروم'
          )
          .setRequired(true)
          .addChannelTypes(
            ChannelType.GuildText,
            ChannelType.GuildAnnouncement
          )
    ),

  new SlashCommandBuilder()
    .setName(
      'setup-role'
    )
    .setDescription(
      'إعداد رتبة'
    )
    .addStringOption(
      o =>
        o.setName(
          'type'
        )
          .setDescription(
            'النوع'
          )
          .setRequired(true)
          .addChoices(
            {
              name:
                'application-role-1',
              value:
                'role1'
            },
            {
              name:
                'application-role-2',
              value:
                'role2'
            },
            {
              name:
                'jail-role',
              value:
                'jail'
            }
          )
    )
    .addRoleOption(
      o =>
        o.setName(
          'role'
        )
          .setDescription(
            'الرتبة'
          )
          .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName(
      'setup-admin-level'
    )
    .setDescription(
      'إعداد مستوى الإدارة'
    )
    .addStringOption(
      o =>
        o.setName(
          'level'
        )
          .setDescription(
            'المستوى'
          )
          .setRequired(true)
          .addChoices(
            {
              name:
                'middle',
              value:
                'middle'
            },
            {
              name:
                'high',
              value:
                'high'
            },
            {
              name:
                'owner',
              value:
                'owner'
            }
          )
    )
    .addRoleOption(
      o =>
        o.setName(
          'role1'
        )
          .setDescription(
            'رتبة 1'
          )
          .setRequired(true)
    )
    .addRoleOption(
      o =>
        o.setName(
          'role2'
        )
          .setDescription(
            'رتبة 2'
          )
          .setRequired(true)
    )
    .addRoleOption(
      o =>
        o.setName(
          'role3'
        )
          .setDescription(
            'رتبة 3'
          )
          .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName(
      'paston'
    )
    .setDescription(
      'رصيد Baston أو إضافة Baston للأونر'
    )
    .addUserOption(
      o =>
        o.setName(
          'user'
        )
          .setDescription(
            'عضو'
          )
    )
    .addIntegerOption(
      o =>
        o.setName(
          'amount'
        )
          .setDescription(
            'مبلغ الإضافة - للأونر فقط'
          )
          .setMinValue(1)
    ),

  new SlashCommandBuilder()
    .setName('shop')
    .setDescription(
      'متجر Baston'
    ),

  new SlashCommandBuilder()
    .setName('dm')
    .setDescription('DM')
    .addUserOption(
      o =>
        o.setName(
          'user'
        )
          .setDescription(
            'عضو'
          )
          .setRequired(true)
    )
    .addStringOption(
      o =>
        o.setName(
          'message'
        )
          .setDescription(
            'الرسالة'
          )
          .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('dms')
    .setDescription(
      'DM لعدة أعضاء'
    )
    .addStringOption(
      o =>
        o.setName(
          'users'
        )
          .setDescription(
            'IDs'
          )
          .setRequired(true)
    )
    .addStringOption(
      o =>
        o.setName(
          'message'
        )
          .setDescription(
            'الرسالة'
          )
          .setRequired(true)
    )
].map(c => c.toJSON());

async function registerCommands() {
  const rest =
    new REST({
      version: '10'
    }).setToken(TOKEN);

  await rest.put(
    Routes.applicationCommands(
      client.user.id
    ),
    {
      body: commands
    }
  );

  console.log(
    `✅ registered ${commands.length} commands`
  );
}

// ============================================================
// ARABIC COMMANDS
// ============================================================

async function handleArabic(message) {
  const c =
    message.content.trim();

  const words =
    c.split(/\s+/);

  const cmd =
    words[0];

  // --------------------
  // TIMEOUT
  // --------------------

  if (['تايم'].includes(cmd)) {
    if (!isAdmin(message.member)) {
      return message.reply(
        '❌ هذا الأمر للإدارة فقط.'
      );
    }

    const target =
      message.mentions.members.first();

    if (!target) {
      return message.reply(
        '❌ مثال: `تايم @User 30m سبام`'
      );
    }

    const dur =
      parseDuration(
        words[2]
      );

    if (!dur) {
      return message.reply(
        '❌ المدة غير صحيحة: 10m / 30m / 1h / 6h / 1d / 7d'
      );
    }

    try {
      await issueTimeout(
        message.guild,
        message.member,
        target,
        dur,
        words.slice(3).join(' ') ||
          'بدون سبب'
      );

      await message.reply(
        `✅ تم Timeout لـ ${target} لمدة ${fmt(dur)}.`
      );
    } catch (e) {
      await message.reply(
        `❌ ${e.message}`
      );
    }

    return true;
  }

  // --------------------
  // WARNING
  // --------------------

  if (
    ['ت', 'تحذير'].includes(cmd)
  ) {
    if (!isAdmin(message.member)) {
      return message.reply(
        '❌ هذا الأمر للإدارة فقط.'
      );
    }

    const target =
      message.mentions.members.first();

    if (!target) {
      return message.reply(
        '❌ مثال: `ت @User سبام`'
      );
    }

    try {
      await issueWarning(
        message.guild,
        message.member,
        target,
        words.slice(2).join(' ') ||
          'مخالفة القوانين',
        86400000
      );

      await message.reply(
        `⚠️ تم تحذير ${target}.`
      );
    } catch (e) {
      await message.reply(
        `❌ ${e.message}`
      );
    }

    return true;
  }

  // --------------------
  // JAIL
  // --------------------

  if (cmd === 'سجن') {
    if (!isHigh(message.member)) {
      return message.reply(
        '❌ السجن للعليا والأونر وServer Owner وBot Owner فقط.'
      );
    }

    const target =
      message.mentions.members.first();

    const dur =
      parseDuration(
        words[2] || '30m'
      );

    if (!target || !dur) {
      return message.reply(
        '❌ مثال: `سجن @User 30m سبام`'
      );
    }

    try {
      await issueJail(
        message.guild,
        message.member,
        target,
        dur,
        words.slice(3).join(' ') ||
          'مخالفة القوانين'
      );

      await message.reply(
        `⛓️ تم سجن ${target} لمدة ${fmt(dur)}.`
      );
    } catch (e) {
      await message.reply(
        `❌ ${e.message}`
      );
    }

    return true;
  }

  // --------------------
  // BAN
  // --------------------

  if (
    cmd === 'باند' ||
    cmd === 'تف'
  ) {
    if (!isAdmin(message.member)) {
      return message.reply(
        '❌ هذا الأمر للإدارة فقط.'
      );
    }

    const target =
      message.mentions.members.first();

    if (!target) {
      return message.reply(
        '❌ مثال: `باند @User السبب`'
      );
    }

    try {
      await issueBan(
        message.guild,
        message.member,
        target,
        words.slice(2).join(' ') ||
          'بدون سبب'
      );

      await message.reply(
        `🔨 تم باند ${target}.`
      );
    } catch (e) {
      await message.reply(
        `❌ ${e.message}`
      );
    }

    return true;
  }

  // --------------------
  // PASTON
  // --------------------

  if (cmd === 'paston') {
    const u =
      message.mentions.users.first() ||
      message.author;

    const amount =
      Number(
        words.find(
          x => /^\d+$/.test(x)
        )
      );

    if (amount) {
      if (!isTop(message.member)) {
        return message.reply(
          '❌ إضافة Baston للأونر فقط.'
        );
      }

      userData(
        message.guild.id,
        u.id
      ).baston += amount;

      saveData(true);

      return message.reply(
        `✅ تمت إضافة **${amount} Baston** إلى ${u}.`
      );
    }

    return message.reply(
      `💰 رصيد ${u}: **${userData(
        message.guild.id,
        u.id
      ).baston} Baston**`
    );
  }

  // --------------------
  // POINTS
  // --------------------

  if (
    cmd === '$نقاط' ||
    cmd === '!نقاط' ||
    c === '$$نقاطي'
  ) {
    const u =
      userData(
        message.guild.id,
        message.author.id
      );

    const em =
      new EmbedBuilder()
        .setTitle(
          '⭐ النقاط'
        )
        .addFields(
          {
            name:
              'Chat XP',
            value:
              String(u.xp),
            inline: true
          },
          {
            name:
              'Voice XP',
            value:
              String(u.voiceXp),
            inline: true
          },
          {
            name:
              'Chat Points',
            value:
              String(
                points(u.xp)
              ),
            inline: true
          },
          {
            name:
              'Action Points',
            value:
              String(
                u.actionPoints
              ),
            inline: true
          },
          {
            name:
              'Total Points',
            value:
              String(
                totalPoints(u)
              ),
            inline: true
          }
        );

    if (
      c === '$$نقاطي' &&
      isAdmin(message.member)
    ) {
      em.addFields(
        {
          name:
            'Warnings Given',
          value:
            String(
              u.warnings
            ),
          inline: true
        },
        {
          name:
            'Timeouts Given',
          value:
            String(
              u.timeouts
            ),
          inline: true
        },
        {
          name:
            'Tickets Claimed',
          value:
            String(
              u.ticketsClaimed
            ),
          inline: true
        }
      );
    }

    return message.reply({
      embeds: [em]
    });
  }

  // --------------------
  // SHOP
  // --------------------

  if (cmd === '$متجر') {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            '🛒 متجر Baston'
          )
          .setDescription(
            'المتجر جاهز لإضافة المنتجات والأسعار.'
          )
          .setTimestamp()
      ]
    });
  }

  // --------------------
  // COMPLAINT
  // --------------------

  if (
    cmd === 'كاد' &&
    words[1] === 'شكاوى'
  ) {
    const target =
      message.mentions.users.first();

    if (!target) {
      return message.reply(
        '❌ منشن الإداري.'
      );
    }

    const reason =
      words.slice(3).join(' ') ||
      'بدون سبب';

    const key =
      `${message.guild.id}:${message.author.id}:${Date.now()}`;

    data.complaints[key] = {
      guildId:
        message.guild.id,
      authorId:
        message.author.id,
      targetId:
        target.id,
      reason,
      status:
        'pending'
    };

    saveData(true);

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            '⚠️ تأكيد الشكوى'
          )
          .setDescription(
            'هل تريد إرسال الشكوى؟'
          )
          .addFields(
            {
              name:
                'ضد',
              value:
                `${target}`
            },
            {
              name:
                'السبب',
              value:
                reason
            }
          )
      ],
      components: [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(
                `complaint_yes:${key}`
              )
              .setLabel(
                '✅ تأكيد'
              )
              .setStyle(
                ButtonStyle.Danger
              ),

            new ButtonBuilder()
              .setCustomId(
                `complaint_no:${key}`
              )
              .setLabel(
                '❌ إلغاء'
              )
              .setStyle(
                ButtonStyle.Secondary
              )
          )
      ]
    });
  }

  if (c.startsWith('/')) {
    return false;
  }

  return false;
}

// ============================================================
// JOIN / LEAVE
// ============================================================

client.on(
  'guildMemberAdd',
  async m => {
    const c =
      guildCfg(
        m.guild.id
      ).channels;

    const w =
      await fetchText(
        m.guild,
        c.welcome
      );

    if (w) {
      await w.send(
        `👋 أهلًا ${m} في السيرفر!`
      ).catch(() => {});
    }

    await sendLog(
      m.guild,
      'joinLeaveLog',
      new EmbedBuilder()
        .setTitle(
          '📥 Join'
        )
        .addFields(
          {
            name:
              'العضو',
            value:
              `${m} (${m.user.tag})`
          },
          {
            name:
              'ID',
            value:
              m.id
          },
          {
            name:
              'الوقت',
            value:
              nowText()
          }
        )
        .setTimestamp()
    );
  }
);

client.on(
  'guildMemberRemove',
  async m => {
    const c =
      guildCfg(
        m.guild.id
      ).channels;

    const w =
      await fetchText(
        m.guild,
        c.leave
      );

    if (w) {
      await w.send(
        `👋 غادر السيرفر ${m}`
      ).catch(() => {});
    }

    await sendLog(
      m.guild,
      'joinLeaveLog',
      new EmbedBuilder()
        .setTitle(
          '📤 Leave'
        )
        .addFields(
          {
            name:
              'العضو',
            value:
              m.user?.tag ||
              m.id
          },
          {
            name:
              'ID',
            value:
              m.id
          },
          {
            name:
              'الوقت',
            value:
              nowText()
          }
        )
        .setTimestamp()
    );
  }
);

// ============================================================
// MAIN MESSAGE EVENT
// ============================================================

client.on(
  'messageCreate',
  async m => {
    try {
      if (
        !m.guild ||
        m.author.bot
      ) {
        return;
      }

      const t =
        data.tickets[
          m.channel.id
        ];

      if (
        t &&
        !t.closed &&
        t.claimedBy &&
        m.author.id !== t.userId
      ) {
        const allowed =
          m.author.id ===
            t.claimedBy ||
          isBotOwner(
            m.author.id
          ) ||
          level(m.member) >
            t.claimedLevel;

        if (!allowed) {
          await m.delete()
            .catch(
              () => {}
            );

          return;
        }

        if (!t.firstAdminReply) {
          t.firstAdminReply =
            true;

          saveData();

          await m.channel.send(
            `👨‍💼 كمل يا إداري مع <@${t.userId}>`
          ).catch(() => {});
        }
      }

      // CAPTCHA
      const tr =
        data.temp[
          `captcha:${m.author.id}`
        ];

      if (
        tr &&
        Date.now() -
          tr.createdAt <
          300000 &&
        m.content.trim() ===
          tr.code
      ) {
        tr.stage =
          'confirm';

        saveData();

        const u =
          await client.users
            .fetch(tr.to)
            .catch(
              () => null
            );

        if (u) {
          await m.reply({
            content:
              `🔐 تحويل ${tr.amount} Baston إلى ${u}. تأكد؟`,

            components: [
              new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId(
                      `pay_yes:${m.author.id}`
                    )
                    .setLabel(
                      '✅ تأكيد'
                    )
                    .setStyle(
                      ButtonStyle.Success
                    ),

                  new ButtonBuilder()
                    .setCustomId(
                      `pay_no:${m.author.id}`
                    )
                    .setLabel(
                      '❌ إلغاء'
                    )
                    .setStyle(
                      ButtonStyle.Danger
                    )
                )
            ]
          });
        }
      }

      if (
        await antiSpam(m)
      ) {
        return;
      }

      const ud =
        userData(
          m.guild.id,
          m.author.id
        );

      ud.xp += 10;

      saveData();

      // !نقاط
      if (
        m.content.startsWith(
          PREFIX
        )
      ) {
        const p =
          m.content
            .slice(
              PREFIX.length
            )
            .trim();

        if (
          p === 'نقاط'
        ) {
          const u =
            userData(
              m.guild.id,
              m.author.id
            );

          return m.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  '⭐ نقاطك'
                )
                .addFields(
                  {
                    name:
                      'Chat XP',
                    value:
                      String(
                        u.xp
                      ),
                    inline: true
                  },
                  {
                    name:
                      'Voice XP',
                    value:
                      String(
                        u.voiceXp
                      ),
                    inline: true
                  },
                  {
                    name:
                      'Chat Points',
                    value:
                      String(
                        points(u.xp)
                      ),
                    inline: true
                  },
                  {
                    name:
                      'Action Points',
                    value:
                      String(
                        u.actionPoints
                      ),
                    inline: true
                  },
                  {
                    name:
                      'Total Points',
                    value:
                      String(
                        totalPoints(u)
                      ),
                    inline: true
                  }
                )
            ]
          });
        }

        if (
          p === 'متجر'
        ) {
          return m.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  '🛒 متجر Baston'
                )
                .setDescription(
                  'المتجر جاهز لإضافة المنتجات والأسعار.'
                )
            ]
          });
        }
      }

      await handleArabic(m);

    } catch (e) {
      console.error(
        'messageCreate',
        e
      );

      await dmOwner(
        'Message Error',
        e
      );
    }
  }
);

// ============================================================
// INTERACTIONS
// ============================================================

client.on(
  'interactionCreate',
  async i => {
    try {

      // ========================================================
      // SLASH COMMANDS
      // ========================================================

      if (
        i.isChatInputCommand()
      ) {
        const m =
          i.member;

        const g =
          i.guild;

        if (!g) {
          return i.reply({
            content:
              'هذا الأمر داخل السيرفر فقط.',
            ephemeral: true
          });
        }

        // PING
        if (
          i.commandName ===
          'ping'
        ) {
          return i.reply(
            `🏓 Pong ${client.ws.ping}ms`
          );
        }

        // WARN
        if (
          i.commandName ===
          'warn'
        ) {
          if (!isAdmin(m)) {
            return i.reply({
              content:
                '❌ الإدارة فقط.',
              ephemeral: true
            });
          }

          const t =
            i.options.getMember(
              'user'
            );

          if (!t) {
            return i.reply({
              content:
                '❌ العضو غير موجود.',
              ephemeral: true
            });
          }

          if (
            !canPunish(
              m,
              t
            )
          ) {
            return i.reply({
              content:
                '❌ لا يمكنك معاقبة إداري أعلى منك أو بنفس مستواك.',
              ephemeral: true
            });
          }

          return i.reply({
            content:
              'اختر سبب التحذير:',

            ephemeral:
              true,

            components: [
              new ActionRowBuilder()
                .addComponents(
                  new StringSelectMenuBuilder()
                    .setCustomId(
                      `wr:${t.id}`
                    )
                    .setPlaceholder(
                      'اختر السبب'
                    )
                    .addOptions(
                      ...Object.entries({
                        ...warnReasons,
                        other:
                          'سبب آخر'
                      }).map(
                        ([value, label]) =>
                          new StringSelectMenuOptionBuilder()
                            .setLabel(
                              label
                            )
                            .setValue(
                              value
                            )
                      )
                    )
                )
            ]
          });
        }

        // TIMEOUT
        if (
          i.commandName ===
          'timeout'
        ) {
          if (!isAdmin(m)) {
            return i.reply({
              content:
                '❌ الإدارة فقط.',
              ephemeral: true
            });
          }

          const t =
            i.options.getMember(
              'user'
            );

          const d =
            parseDuration(
              i.options.getString(
                'duration'
              )
            );

          if (
            !t ||
            !d
          ) {
            return i.reply({
              content:
                '❌ العضو أو المدة غير صحيحة.',
              ephemeral: true
            });
          }

          try {
            await issueTimeout(
              g,
              m,
              t,
              d,
              i.options.getString(
                'reason'
              )
            );

            return i.reply(
              `✅ تم Timeout لـ ${t} لمدة ${fmt(d)}.`
            );
          } catch (e) {
            return i.reply({
              content:
                `❌ ${e.message}`,
              ephemeral:
                true
            });
          }
        }

        // SETUP JAIL
        if (
          i.commandName ===
          'setup-jail'
        ) {
          if (!isTop(m)) {
            return i.reply({
              content:
                '❌ المستوى الأعلى فقط.',
              ephemeral:
                true
            });
          }

          return i.reply(
            `✅ تم إعداد رتبة السجن: ${await setupJail(g)}`
          );
        }

        // JAIL
        if (
          i.commandName ===
          'jail'
        ) {
          if (!isHigh(m)) {
            return i.reply({
              content:
                '❌ العليا أو أعلى فقط.',
              ephemeral:
                true
            });
          }

          const t =
            i.options.getMember(
              'user'
            );

          if (!t) {
            return i.reply({
              content:
                '❌ غير موجود.',
              ephemeral:
                true
            });
          }

          if (
            !canPunish(
              m,
              t
            )
          ) {
            return i.reply({
              content:
                '❌ لا يمكنك سجن هذا العضو.',
              ephemeral:
                true
            });
          }

          return i.reply({
            content:
              'اختر مدة السجن:',

            ephemeral:
              true,

            components: [
              new ActionRowBuilder()
                .addComponents(
                  new StringSelectMenuBuilder()
                    .setCustomId(
                      `jd:${t.id}`
                    )
                    .setPlaceholder(
                      'مدة السجن'
                    )
                    .addOptions(
                      ...[
                        '10m',
                        '30m',
                        '1h',
                        '6h',
                        '1d',
                        '3d',
                        '1w'
                      ].map(
                        x =>
                          new StringSelectMenuOptionBuilder()
                            .setLabel(
                              x
                            )
                            .setValue(
                              x
                            )
                      )
                    )
                )
            ]
          });
        }

        // BAN
        if (
          i.commandName ===
          'ban'
        ) {
          if (!isAdmin(m)) {
            return i.reply({
              content:
                '❌ الإدارة فقط.',
              ephemeral:
                true
            });
          }

          const t =
            i.options.getMember(
              'user'
            );

          if (!t) {
            return i.reply({
              content:
                '❌ غير موجود.',
              ephemeral:
                true
            });
          }

          try {
            await issueBan(
              g,
              m,
              t,
              i.options.getString(
                'reason'
              )
            );

            return i.reply(
              `🔨 تم باند ${t}.`
            );
          } catch (e) {
            return i.reply({
              content:
                `❌ ${e.message}`,
              ephemeral:
                true
            });
          }
        }

        // SETUP TICKET CATEGORY
        if (
          i.commandName ===
          'setup-ticket-category'
        ) {
          if (!isTop(m)) {
            return i.reply({
              content:
                '❌ المستوى الأعلى فقط.',
              ephemeral:
                true
            });
          }

          guildCfg(
            g.id
          ).ticketCategoryId =
            i.options
              .getChannel(
                'category'
              )
              .id;

          saveData(true);

          return i.reply(
            '✅ تم حفظ Category التذاكر.'
          );
        }

        // TICKET PANEL
        if (
          i.commandName ===
          'ticket-panel'
        ) {
          if (!isAdmin(m)) {
            return i.reply({
              content:
                '❌ الإدارة فقط.',
              ephemeral:
                true
            });
          }

          await i.channel.send({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  '🎫 الدعم الفني'
                )
                .setDescription(
                  'اضغط لفتح تذكرة خاصة.'
                )
            ],

            components: [
              new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId(
                      'ticket_open'
                    )
                    .setLabel(
                      '🎫 فتح تذكرة'
                    )
                    .setStyle(
                      ButtonStyle.Primary
                    )
                )
            ]
          });

          return i.reply({
            content:
              '✅ تم إرسال اللوحة.',
            ephemeral:
              true
          });
        }

        // APPLICATION PANEL
        if (
          i.commandName ===
          'application-panel'
        ) {
          if (!isTop(m)) {
            return i.reply({
              content:
                '❌ المستوى الأعلى فقط.',
              ephemeral:
                true
            });
          }

          guildCfg(
            g.id
          ).channels.applicationRoom =
            i.channel.id;

          saveData(true);

          await i.channel.send(
            appPanel()
          );

          return i.reply({
            content:
              '✅ تم إرسال لوحة التقديم.',
            ephemeral:
              true
          });
        }

        // SETUP CHANNEL
        if (
          i.commandName ===
          'setup-channel'
        ) {
          if (!isTop(m)) {
            return i.reply({
              content:
                '❌ المستوى الأعلى فقط.',
              ephemeral:
                true
            });
          }

          guildCfg(
            g.id
          ).channels[
            i.options.getString(
              'type'
            )
          ] =
            i.options.getChannel(
              'channel'
            ).id;

          saveData(true);

          return i.reply({
            content:
              '✅ تم الحفظ.',
            ephemeral:
              true
          });
        }

        // SETUP ROLE
        if (
          i.commandName ===
          'setup-role'
        ) {
          if (!isTop(m)) {
            return i.reply({
              content:
                '❌ المستوى الأعلى فقط.',
              ephemeral:
                true
            });
          }

          const c =
            guildCfg(
              g.id
            );

          const r =
            i.options.getRole(
              'role'
            );

          const type =
            i.options.getString(
              'type'
            );

          if (type === 'role1') {
            c.applicationRoles.role1 =
              r.id;
          } else if (
            type === 'role2'
          ) {
            c.applicationRoles.role2 =
              r.id;
          } else {
            c.jailRoleId =
              r.id;
          }

          saveData(true);

          return i.reply({
            content:
              '✅ تم الحفظ.',
            ephemeral:
              true
          });
        }

        // SETUP ADMIN LEVEL
        if (
          i.commandName ===
          'setup-admin-level'
        ) {
          if (!isTop(m)) {
            return i.reply({
              content:
                '❌ المستوى الأعلى فقط.',
              ephemeral:
                true
            });
          }

          const c =
            guildCfg(
              g.id
            );

          c.adminRoles[
            i.options.getString(
              'level'
            )
          ] = [
            i.options.getRole(
              'role1'
            ).id,

            i.options.getRole(
              'role2'
            ).id,

            i.options.getRole(
              'role3'
            ).id
          ];

          saveData(true);

          return i.reply({
            content:
              '✅ تم حفظ هرم الإدارة.',
            ephemeral:
              true
          });
        }

        // PASTON
        if (
          i.commandName ===
          'paston'
        ) {
          const u =
            i.options.getUser(
              'user'
            ) ||
            i.user;

          const amount =
            i.options.getInteger(
              'amount'
            );

          if (amount) {
            if (!isTop(m)) {
              return i.reply({
                content:
                  '❌ إضافة Baston للأونر فقط.',
                ephemeral:
                  true
              });
            }

            userData(
              g.id,
              u.id
            ).baston +=
              amount;

            saveData(true);

            return i.reply(
              `✅ تمت إضافة **${amount} Baston** إلى ${u}. الرصيد الجديد: **${userData(
                g.id,
                u.id
              ).baston} Baston**`
            );
          }

          return i.reply(
            `💰 رصيد ${u}: **${userData(
              g.id,
              u.id
            ).baston} Baston**`
          );
        }

        // SHOP
        if (
          i.commandName ===
          'shop'
        ) {
          return i.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(
                  '🛒 متجر Baston'
                )
                .setDescription(
                  'المتجر جاهز لإضافة العناصر والأسعار.'
                )
            ]
          });
        }

        // DM
        if (
          i.commandName ===
          'dm'
        ) {
          if (!isAdmin(m)) {
            return i.reply({
              content:
                '❌ الإدارة فقط.',
              ephemeral:
                true
            });
          }

          const u =
            i.options.getUser(
              'user'
            );

          await u.send(
            i.options.getString(
              'message'
            )
          ).catch(
            () => {
              throw new Error(
                'تعذر إرسال DM.'
              );
            }
          );

          return i.reply({
            content:
              '✅ تم إرسال DM.',
            ephemeral:
              true
          });
        }

        // DMS
        if (
          i.commandName ===
          'dms'
        ) {
          if (!isAdmin(m)) {
            return i.reply({
              content:
                '❌ الإدارة فقط.',
              ephemeral:
                true
            });
          }

          let ok = 0;
          let fail = 0;

          for (
            const id of
              i.options
                .getString(
                  'users'
                )
                .split(/\s+/)
          ) {
            const u =
              await client.users
                .fetch(id)
                .catch(
                  () => null
                );

            if (
              !u ||
              !(await u.send(
                i.options.getString(
                  'message'
                )
              ).then(
                () => true
              ).catch(
                () => false
              ))
            ) {
              fail++;
            } else {
              ok++;
            }
          }

          return i.reply({
            content:
              `✅ ${ok} تم | ❌ ${fail} فشل`,
            ephemeral:
              true
          });
        }
      }

      // ========================================================
      // BUTTONS
      // ========================================================

      if (i.isButton()) {

        // TICKET OPEN
        if (
          i.customId ===
          'ticket_open'
        ) {
          const c =
            await createTicket(
              i.guild,
              i.user
            );

          return i.reply({
            content:
              `🎫 ${c}`,
            ephemeral:
              true
          });
        }

        // TICKET CLAIM
        if (
          i.customId ===
          'ticket_claim'
        ) {
          const t =
            data.tickets[
              i.channel.id
            ];

          if (!t) {
            return i.reply({
              content:
                'ليست تذكرة.',
              ephemeral:
                true
            });
          }

          if (!isAdmin(i.member)) {
            return i.reply({
              content:
                '❌ الإدارة فقط.',
              ephemeral:
                true
            });
          }

          if (t.claimedBy) {
            return i.reply({
              content:
                'التذكرة مستلمة بالفعل.',
              ephemeral:
                true
            });
          }

          t.claimedBy =
            i.user.id;

          t.claimedLevel =
            level(i.member);

          userData(
            i.guild.id,
            i.user.id
          ).actionPoints += 3;

          userData(
            i.guild.id,
            i.user.id
          ).ticketsClaimed++;

          saveData(true);

          for (
            const member of
              i.guild.members.cache.values()
          ) {
            if (
              !isAdmin(member)
            ) continue;

            const allow =
              member.id ===
                i.user.id ||
              isBotOwner(
                member.id
              ) ||
              level(member) >
                t.claimedLevel;

            await i.channel
              .permissionOverwrites
              .edit(
                member.id,
                {
                  ViewChannel:
                    true,
                  ReadMessageHistory:
                    true,
                  SendMessages:
                    allow
                }
              )
              .catch(() => {});
          }

          await i.message
            .edit({
              components: [
                ticketButtons(t)
              ]
            })
            .catch(() => {});

          await i.channel.send(
            `📥 تم استلام التذكرة بواسطة ${i.user}.`
          );

          return i.reply({
            content:
              '✅ تم الاستلام.',
            ephemeral:
              true
          });
        }

        // TICKET UNCLAIM
        if (
          i.customId ===
          'ticket_unclaim'
        ) {
          const t =
            data.tickets[
              i.channel.id
            ];

          if (!t?.claimedBy) {
            return i.reply({
              content:
                'التذكرة غير مستلمة.',
              ephemeral:
                true
            });
          }

          if (
            i.user.id !==
              t.claimedBy &&
            !isBotOwner(
              i.user.id
            ) &&
            level(i.member) <=
              t.claimedLevel
          ) {
            return i.reply({
              content:
                '❌ لا تملك صلاحية الإلغاء.',
              ephemeral:
                true
            });
          }

          t.claimedBy =
            null;

          t.claimedLevel =
            null;

          const c =
            guildCfg(
              i.guild.id
            );

          for (
            const r of [
              ...c.adminRoles.middle,
              ...c.adminRoles.high,
              ...c.adminRoles.owner
            ]
          ) {
            await i.channel
              .permissionOverwrites
              .edit(
                r,
                {
                  ViewChannel:
                    true,
                  SendMessages:
                    true,
                  ReadMessageHistory:
                    true
                }
              )
              .catch(() => {});
          }

          saveData(true);

          await i.message
            .edit({
              components: [
                ticketButtons(t)
              ]
            })
            .catch(() => {});

          return i.reply(
            '🔓 تم إلغاء الاستلام.'
          );
        }

        // TICKET CLOSE
        if (
          i.customId ===
          'ticket_close'
        ) {
          return closeTicket(i);
        }

        // APPLICATION START
        if (
          i.customId ===
          'app_start'
        ) {
          if (
            !hasTRZ(i.member)
          ) {
            return i.reply({
              content:
                '❌ يجب أن يحتوي اسمك على TRZ.',
              ephemeral:
                true
            });
          }

          const key =
            `${i.guild.id}:${i.user.id}`;

          data.applications[key] ||=
            {
              guildId:
                i.guild.id,
              userId:
                i.user.id,
              status:
                'pending',
              answers: {},
              createdAt:
                Date.now()
            };

          if (
            data.applications[key]
              .status !==
            'pending'
          ) {
            data.applications[key] =
              {
                guildId:
                  i.guild.id,
                userId:
                  i.user.id,
                status:
                  'pending',
                answers: {},
                createdAt:
                  Date.now()
              };
          }

          saveData(true);

          return i.showModal(
            appModal1()
          );
        }

        // APPLICATION ACCEPT / REJECT
        if (
          i.customId.startsWith(
            'app_ok:'
          ) ||
          i.customId.startsWith(
            'app_no:'
          )
        ) {
          if (
            !isTop(i.member)
          ) {
            return i.reply({
              content:
                '❌ الأونر فقط.',
              ephemeral:
                true
            });
          }

          const [
            ,
            gid,
            uid
          ] =
            i.customId.split(
              ':'
            );

          const a =
            data.applications[
              `${gid}:${uid}`
            ];

          if (
            !a ||
            a.status !==
              'pending'
          ) {
            return i.reply({
              content:
                '⚠️ التقديم تم التعامل معه مسبقًا.',
              ephemeral:
                true
            });
          }

          const target =
            await i.guild.members
              .fetch(uid)
              .catch(() => null);

          if (!target) {
            return i.reply({
              content:
                '❌ المتقدم غير موجود.',
              ephemeral:
                true
            });
          }

          const c =
            guildCfg(gid);

          if (
            i.customId.startsWith(
              'app_ok:'
            )
          ) {
            if (
              !c.applicationRoles.role1 ||
              !c.applicationRoles.role2
            ) {
              return i.reply({
                content:
                  '❌ لم يتم إعداد رتب القبول. استخدم /setup-role للرتبتين.',
                ephemeral:
                  true
              });
            }

            await target.roles.add([
              c.applicationRoles.role1,
              c.applicationRoles.role2
            ]);

            a.status =
              'accepted';

            a.processedBy =
              i.user.id;

            a.processedAt =
              Date.now();

            await target
              .send(
                `🎉 تم قبول تقديمك في **${i.guild.name}** ومنحك الرتبتين المحددتين.`
              )
              .catch(() => {});

            await sendLog(
              i.guild,
              'applicationLog',
              new EmbedBuilder()
                .setTitle(
                  '✅ Application Accepted'
                )
                .addFields(
                  {
                    name:
                      'المتقدم',
                    value:
                      `${target}`
                  },
                  {
                    name:
                      'الأونر',
                    value:
                      `${i.user}`
                  },
                  {
                    name:
                      'الوقت',
                    value:
                      nowText()
                  }
                )
            );
          } else {
            a.status =
              'rejected';

            a.processedBy =
              i.user.id;

            a.processedAt =
              Date.now();

            await target
              .send(
                `❌ تم رفض تقديمك في **${i.guild.name}**.`
              )
              .catch(() => {});

            await sendLog(
              i.guild,
              'applicationLog',
              new EmbedBuilder()
                .setTitle(
                  '❌ Application Rejected'
                )
                .addFields(
                  {
                    name:
                      'المتقدم',
                    value:
                      `${target}`
                  },
                  {
                    name:
                      'الإداري',
                    value:
                      `${i.user}`
                  }
                )
            );
          }

          saveData(true);

          return i.update({
            components: [
              new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId(
                      'app_done'
                    )
                    .setLabel(
                      a.status ===
                        'accepted'
                        ? '✅ تم القبول'
                        : '❌ تم الرفض'
                    )
                    .setStyle(
                      a.status ===
                        'accepted'
                        ? ButtonStyle.Success
                        : ButtonStyle.Danger
                    )
                    .setDisabled(
                      true
                    )
                )
            ]
          });
        }

        // PAYMENT CONFIRM
        if (
          i.customId.startsWith(
            'pay_yes:'
          ) ||
          i.customId.startsWith(
            'pay_no:'
          )
        ) {
          const uid =
            i.customId
              .split(':')[1];

          const s =
            data.temp[
              `captcha:${uid}`
            ];

          if (
            !s ||
            uid !==
              i.user.id
          ) {
            return i.reply({
              content:
                '❌ جلسة التحويل انتهت.',
              ephemeral:
                true
            });
          }

          if (
            i.customId.startsWith(
              'pay_no:'
            )
          ) {
            delete data.temp[
              `captcha:${uid}`
            ];

            saveData(true);

            return i.update({
              content:
                '❌ تم الإلغاء.',
              components: []
            });
          }

          const from =
            userData(
              s.guildId,
              uid
            );

          const to =
            userData(
              s.guildId,
              s.to
            );

          if (
            from.baston <
            s.amount
          ) {
            delete data.temp[
              `captcha:${uid}`
            ];

            saveData(true);

            return i.update({
              content:
                '❌ الرصيد غير كافٍ.',
              components: []
            });
          }

          const fee =
            Math.floor(
              s.amount * 0.07
            );

          const received =
            s.amount - fee;

          from.baston -=
            s.amount;

          to.baston +=
            received;

          delete data.temp[
            `captcha:${uid}`
          ];

          saveData(true);

          return i.update({
            content:
              `✅ تم التحويل. الرسوم 7% = ${fee}. المستلم = ${received} Baston.`,
            components: []
          });
        }

        // COMPLAINT
        if (
          i.customId.startsWith(
            'complaint_yes:'
          ) ||
          i.customId.startsWith(
            'complaint_no:'
          )
        ) {
          const key =
            i.customId
              .split(':')
              .slice(1)
              .join(':');

          const c =
            data.complaints[
              key
            ];

          if (
            !c ||
            c.authorId !==
              i.user.id
          ) {
            return i.reply({
              content:
                '❌ هذه الشكوى ليست لك.',
              ephemeral:
                true
            });
          }

          if (
            i.customId.startsWith(
              'complaint_no:'
            )
          ) {
            delete data.complaints[
              key
            ];

            saveData(true);

            return i.update({
              content:
                '❌ تم الإلغاء.',
              components: []
            });
          }

          const ch =
            await fetchText(
              i.guild,
              guildCfg(
                i.guild.id
              ).channels
                .complaintLog
            );

          if (ch) {
            await ch.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle(
                    '📣 شكوى إدارية'
                  )
                  .addFields(
                    {
                      name:
                        'المشتكي',
                      value:
                        `<@${c.authorId}>`
                    },
                    {
                      name:
                        'ضد',
                      value:
                        `<@${c.targetId}>`
                    },
                    {
                      name:
                        'السبب',
                      value:
                        c.reason
                    },
                    {
                      name:
                        'الوقت',
                      value:
                        nowText()
                    }
                  )
              ]
            });
          }

          delete data.complaints[
            key
          ];

          saveData(true);

          return i.update({
            content:
              '✅ تم إرسال الشكوى.',
            components: []
          });
        }
      }

      // ========================================================
      // SELECT MENUS
      // ========================================================

      if (
        i.isStringSelectMenu()
      ) {

        // WARNING REASON
        if (
          i.customId.startsWith(
            'wr:'
          )
        ) {
          const targetId =
            i.customId.split(
              ':'
            )[1];

          const v =
            i.values[0];

          if (
            v === 'other'
          ) {
            const md =
              new ModalBuilder()
                .setCustomId(
                  `wrother:${targetId}`
                )
                .setTitle(
                  'سبب التحذير'
                )
                .addComponents(
                  new ActionRowBuilder()
                    .addComponents(
                      new TextInputBuilder()
                        .setCustomId(
                          'reason'
                        )
                        .setLabel(
                          'السبب'
                        )
                        .setStyle(
                          TextInputStyle.Paragraph
                        )
                        .setRequired(
                          true
                        )
                    )
                );

            return i.showModal(
              md
            );
          }

          return i.update({
            content:
              `السبب: ${warnReasons[v]}\nاختر المدة:`,

            components: [
              new ActionRowBuilder()
                .addComponents(
                  new StringSelectMenuBuilder()
                    .setCustomId(
                      `wd:${targetId}:${v}`
                    )
                    .setPlaceholder(
                      'المدة'
                    )
                    .addOptions(
                      ...[
                        '1h',
                        '6h',
                        '12h',
                        '1d',
                        '3d',
                        '1w'
                      ].map(
                        x =>
                          new StringSelectMenuOptionBuilder()
                            .setLabel(
                              x
                            )
                            .setValue(
                              x
                            )
                      )
                    )
                )
            ]
          });
        }

        // WARNING DURATION
        if (
          i.customId.startsWith(
            'wd:'
          )
        ) {
          const p =
            i.customId.split(
              ':'
            );

          const target =
            await i.guild.members
              .fetch(p[1])
              .catch(
                () => null
              );

          if (!target) {
            return i.update({
              content:
                '❌ غير موجود',
              components: []
            });
          }

          try {
            await issueWarning(
              i.guild,
              i.member,
              target,
              warnReasons[
                p[2]
              ] ||
                'مخالفة القوانين',
              parseDuration(
                i.values[0]
              )
            );

            return i.update({
              content:
                `✅ تم تحذير ${target}.`,
              components: []
            });
          } catch (e) {
            return i.update({
              content:
                `❌ ${e.message}`,
              components: []
            });
          }
        }

        // JAIL DURATION
        if (
          i.customId.startsWith(
            'jd:'
          )
        ) {
          const target =
            await i.guild.members
              .fetch(
                i.customId.split(
                  ':'
                )[1]
              )
              .catch(
                () => null
              );

          if (!target) {
            return i.update({
              content:
                '❌ غير موجود',
              components: []
            });
          }

          try {
            await issueJail(
              i.guild,
              i.member,
              target,
              parseDuration(
                i.values[0]
              ),
              'مخالفة القوانين'
            );

            return i.update({
              content:
                `⛓️ تم سجن ${target} لمدة ${fmt(parseDuration(i.values[0]))}.`,
              components: []
            });
          } catch (e) {
            return i.update({
              content:
                `❌ ${e.message}`,
              components: []
            });
          }
        }
      }

      // ========================================================
      // MODALS
      // ========================================================

      if (
        i.isModalSubmit()
      ) {

        // OTHER WARNING REASON
        if (
          i.customId.startsWith(
            'wrother:'
          )
        ) {
          const targetId =
            i.customId.split(
              ':'
            )[1];

          const reason =
            i.fields.getTextInputValue(
              'reason'
            );

          const md =
            new ModalBuilder()
              .setCustomId(
                `wrother2:${targetId}`
              )
              .setTitle(
                'مدة التحذير'
              )
              .addComponents(
                new ActionRowBuilder()
                  .addComponents(
                    new TextInputBuilder()
                      .setCustomId(
                        'duration'
                      )
                      .setLabel(
                        'المدة (مثال 1h أو 1d)'
                      )
                      .setStyle(
                        TextInputStyle.Short
                      )
                      .setRequired(
                        true
                      )
                  )
              );

          data.temp[
            `warnreason:${i.user.id}`
          ] = {
            targetId,
            reason,
            createdAt:
              Date.now()
          };

          saveData();

          return i.showModal(
            md
          );
        }

        // OTHER WARNING DURATION
        if (
          i.customId.startsWith(
            'wrother2:'
          )
        ) {
          const targetId =
            i.customId.split(
              ':'
            )[1];

          const durationText =
            i.fields.getTextInputValue(
              'duration'
            );

          const s =
            data.temp[
              `warnreason:${i.user.id}`
            ];

          if (!s) {
            return i.reply({
              content:
                '❌ انتهت جلسة التحذير.',
              ephemeral:
                true
            });
          }

          const target =
            await i.guild.members
              .fetch(targetId)
              .catch(
                () => null
              );

          const d =
            parseDuration(
              durationText
            );

          if (
            !target ||
            !d
          ) {
            return i.reply({
              content:
                '❌ العضو أو المدة غير صحيحة.',
              ephemeral:
                true
            });
          }

          try {
            await issueWarning(
              i.guild,
              i.member,
              target,
              s.reason,
              d
            );

            delete data.temp[
              `warnreason:${i.user.id}`
            ];

            saveData(true);

            return i.reply({
              content:
                `✅ تم تحذير ${target} لمدة ${fmt(d)}.`,
              ephemeral:
                true
            });
          } catch (e) {
            return i.reply({
              content:
                `❌ ${e.message}`,
              ephemeral:
                true
            });
          }
        }

        // APPLICATION MODAL 1
        if (
          i.customId ===
          'app_m1'
        ) {
          const a =
            data.applications[
              `${i.guild.id}:${i.user.id}`
            ];

          if (!a) {
            return i.reply({
              content:
                '❌ جلسة التقديم انتهت.',
              ephemeral:
                true
            });
          }

          for (
            let n = 1;
            n <= 5;
            n++
          ) {
            a.answers[
              `q${n}`
            ] =
              i.fields
                .getTextInputValue(
                  `q${n}`
                );
          }

          saveData(true);

          return i.showModal(
            appModal2()
          );
        }

        // APPLICATION MODAL 2
        if (
          i.customId ===
          'app_m2'
        ) {
          const a =
            data.applications[
              `${i.guild.id}:${i.user.id}`
            ];

          if (!a) {
            return i.reply({
              content:
                '❌ جلسة التقديم انتهت.',
              ephemeral:
                true
            });
          }

          for (
            let n = 6;
            n <= 8;
            n++
          ) {
            a.answers[
              `q${n}`
            ] =
              i.fields
                .getTextInputValue(
                  `q${n}`
                );
          }

          await sendApplication(
            i.guild,
            i.user.id
          );

          return i.reply({
            content:
              '✅ تم إرسال التقديم للإدارة.',
            ephemeral:
              true
          });
        }
      }

    } catch (e) {
      console.error(
        'interactionCreate',
        e
      );

      if (
        i.isRepliable()
      ) {
        const msg = {
          content:
            '❌ حدث خطأ غير متوقع.',
          ephemeral:
            true
        };

        if (
          i.replied ||
          i.deferred
        ) {
          await i.followUp(
            msg
          ).catch(
            () => {}
          );
        } else {
          await i.reply(
            msg
          ).catch(
            () => {}
          );
        }
      }

      await dmOwner(
        'Interaction Error',
        e
      );
    }
  }
);

// ============================================================
// PASTON PREFIX TRANSFER
// ============================================================

client.on(
  'messageCreate',
  async m => {
    try {
      if (
        !m.guild ||
        m.author.bot
      ) {
        return;
      }

      const w =
        m.content
          .trim()
          .split(/\s+/);

      if (
        w[0] !== 'p'
      ) {
        return;
      }

      const target =
        m.mentions.users.first();

      const amount =
        Number(
          w[2]
        );

      if (
        !target ||
        !amount ||
        amount <= 0
      ) {
        return m.reply(
          '❌ مثال: `p @User 100`'
        );
      }

      const u =
        userData(
          m.guild.id,
          m.author.id
        );

      if (
        u.baston <
        amount
      ) {
        return m.reply(
          '❌ رصيد Baston غير كافٍ.'
        );
      }

      const code =
        String(
          Math.floor(
            1000 +
              Math.random() *
                9000
          )
        );

      data.temp[
        `captcha:${m.author.id}`
      ] = {
        guildId:
          m.guild.id,
        to:
          target.id,
        amount,
        code,
        createdAt:
          Date.now(),
        stage:
          'captcha'
      };

      saveData(true);

      return m.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              '🔐 CAPTCHA'
            )
            .setDescription(
              `اكتب هذا الرقم في نفس الشات: **${code}**\n` +
              `تحويل **${amount} Baston** إلى ${target}. الرسوم 7% بعد التأكيد.`
            )
        ]
      });

    } catch (e) {
      await dmOwner(
        'Transfer Error',
        e
      );
    }
  }
);

// ============================================================
// CLEANUP
// ============================================================

setInterval(
  async () => {
    try {
      const now =
        Date.now();

      // Warnings
      for (
        const k of
          Object.keys(
            data.warnings
          )
      ) {
        data.warnings[k] =
          data.warnings[k].filter(
            x =>
              x.expiresAt >
              now
          );

        if (
          !data.warnings[k]
            .length
        ) {
          delete data.warnings[k];
        }
      }

      // Jails
      for (
        const k of
          Object.keys(
            data.jails
          )
      ) {
        const j =
          data.jails[k];

        if (
          j.expiresAt <=
          now
        ) {
          const g =
            client.guilds.cache.get(
              j.guildId
            );

          const m =
            await g?.members
              .fetch(
                j.userId
              )
              .catch(
                () => null
              );

          const r =
            g?.roles.cache.get(
              j.roleId
            );

          if (
            m &&
            r
          ) {
            await m.roles
              .remove(
                r,
                'انتهاء مدة السجن'
              )
              .catch(
                () => {}
              );
          }

          delete data.jails[
            k
          ];
        }
      }

      // Temporary data
      for (
        const k of
          Object.keys(
            data.temp
          )
      ) {
        if (
          now -
            (
              data.temp[k]
                .createdAt ||
              now
            ) >
          600000
        ) {
          delete data.temp[k];
        }
      }

      // Closed tickets
      for (
        const k of
          Object.keys(
            data.tickets
          )
      ) {
        if (
          data.tickets[k]
            .closed &&
          now -
            (
              data.tickets[k]
                .closedAt ||
              now
            ) >
            86400000
        ) {
          delete data.tickets[
            k
          ];
        }
      }

      saveData(true);

    } catch (e) {
      console.error(
        'cleanup',
        e
      );

      await dmOwner(
        'Cleanup Error',
        e
      );
    }
  },
  30000
);

// ============================================================
// VOICE XP
// ============================================================

setInterval(
  () => {
    for (
      const g of
        client.guilds.cache.values()
    ) {
      for (
        const m of
          g.members.cache.values()
      ) {
        if (
          !m.user.bot &&
          m.voice.channel
        ) {
          userData(
            g.id,
            m.id
          ).voiceXp += 5;

          userData(
            g.id,
            m.id
          ).xp += 5;
        }
      }
    }

    saveData();
  },
  300000
);

// ============================================================
// TICKET REMINDER
// ============================================================

setInterval(
  async () => {
    const now =
      Date.now();

    for (
      const t of
        Object.values(
          data.tickets
        )
    ) {
      if (
        t.closed ||
        t.reminderSent ||
        t.firstAdminReply ||
        now -
          t.createdAt <
          60000
      ) {
        continue;
      }

      const g =
        client.guilds.cache.get(
          t.guildId
        );

      const c =
        g?.channels.cache.get(
          t.channelId
        );

      if (c) {
        await c.send(
          `<@${t.userId}> برجاء شرح مشكلتك.`
        ).catch(
          () => {}
        );

        t.reminderSent =
          true;
      }
    }

    saveData();
  },
  5000
);

// ============================================================
// OWNER OFFLINE MENTION
// ============================================================

client.on(
  'messageCreate',
  async m => {
    try {
      if (
        !m.guild ||
        m.author.bot ||
        !m.mentions.users.has(
          m.guild.ownerId
        )
      ) {
        return;
      }

      const owner =
        await m.guild.members
          .fetch(
            m.guild.ownerId
          )
          .catch(
            () => null
          );

      if (
        !owner ||
        owner.presence?.status ===
          'offline' ||
        !owner.presence
      ) {
        await m.reply(
          'صاحب السيرفر غير موجود حاليا برجاء كتابة رسالتك'
        ).catch(
          () => {}
        );

        await owner?.send({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                '👑 تم منشنك وأنت غير متاح'
              )
              .addFields(
                {
                  name:
                    'العضو',
                  value:
                    `${m.author}`
                },
                {
                  name:
                    'الروم',
                  value:
                    `${m.channel}`
                },
                {
                  name:
                    'الرسالة',
                  value:
                    m.content.slice(
                      0,
                      1500
                    )
                },
                {
                  name:
                    'الوقت',
                  value:
                    nowText()
                }
              )
          ]
        }).catch(
          () => {}
        );
      }

    } catch (e) {
      await dmOwner(
        'Owner Mention Error',
        e
      );
    }
  }
);

// ============================================================
// READY
// ============================================================

client.once(
  'ready',
  async () => {
    console.log(
      `✅ ${client.user.tag} is online`
    );

    try {
      const app =
        await client.application.fetch();

      botOwnerId =
        app.owner?.id ||
        null;

    } catch {}

    await registerCommands();

    client.user.setActivity(
      `${client.guilds.cache.size} سيرفر | ${PREFIX}نقاط`,
      {
        type:
          ActivityType.Watching
      }
    );
  }
);

// ============================================================
// ERROR PROTECTION
// ============================================================

process.on(
  'unhandledRejection',
  e => {
    console.error(e);
    dmOwner(
      'Unhandled Rejection',
      e
    );
  }
);

process.on(
  'uncaughtException',
  e => {
    console.error(e);
    dmOwner(
      'Uncaught Exception',
      e
    );
  }
);

client.on(
  'error',
  e => {
    console.error(e);
    dmOwner(
      'Discord Client Error',
      e
    );
  }
);

// ============================================================
// LOGIN
// ============================================================

client.login(TOKEN);
