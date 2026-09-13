require("dotenv").config();

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
    SlashCommandBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");

/* =========================================================
   BOT CONFIG
========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
    console.error("❌ DISCORD_TOKEN غير موجود في Railway Environment Variables.");
    process.exit(1);
}

const PREFIX = "$";

/*
    ضع ID صاحب البوت هنا إذا أردت Owner أساسي للبوت.
    يمكن تركه فارغًا وسيتم جلب Owner من Discord عند التشغيل.
*/
let APPLICATION_OWNER_ID = null;

/* =========================================================
   STAFF ROLES
========================================================= */

const STAFF_ROLES = {

    junior: [
        "1547161676502274171",
        "1547161677642866718",
        "1547161680209772544"
    ],

    middle: [
        "1547161661570293840",
        "1547161660073185290",
        "1547161660853198878"
    ],

    senior: [
        "1547161630113140817",
        "1547161630758928474",
        "1547161631610642493"
    ],

    owner: [
        "1547161594604036127",
        "1547161595438825534",
        "1547161596139274261"
    ]
};

/*
    Level:
    0 = Member
    1 = Junior
    2 = Middle
    3 = Senior
    4 = Owner
*/

function getStaffLevel(member) {

    if (!member || !member.roles) {
        return 0;
    }

    const roleIds = member.roles.cache.map(role => role.id);

    if (
        APPLICATION_OWNER_ID &&
        member.id === APPLICATION_OWNER_ID
    ) {
        return 4;
    }

    if (
        roleIds.some(id => STAFF_ROLES.owner.includes(id))
    ) {
        return 4;
    }

    if (
        roleIds.some(id => STAFF_ROLES.senior.includes(id))
    ) {
        return 3;
    }

    if (
        roleIds.some(id => STAFF_ROLES.middle.includes(id))
    ) {
        return 2;
    }

    if (
        roleIds.some(id => STAFF_ROLES.junior.includes(id))
    ) {
        return 1;
    }

    return 0;
}

/* =========================================================
   STAFF PERMISSIONS
========================================================= */

function isStaff(member) {
    return getStaffLevel(member) > 0;
}

function isOwnerStaff(member) {
    return getStaffLevel(member) >= 4;
}

function isSeniorStaff(member) {
    return getStaffLevel(member) >= 3;
}

function isMiddleStaff(member) {
    return getStaffLevel(member) >= 2;
}

function canManage(member, requiredLevel = 1) {
    return getStaffLevel(member) >= requiredLevel;
}

/*
    يمنع الموظف من معاقبة شخص مساوي أو أعلى منه.
*/
function canModerateTarget(actor, target) {

    if (!actor || !target) {
        return false;
    }

    if (actor.id === target.id) {
        return false;
    }

    if (
        APPLICATION_OWNER_ID &&
        actor.id === APPLICATION_OWNER_ID
    ) {
        return true;
    }

    const actorLevel = getStaffLevel(actor);
    const targetLevel = getStaffLevel(target);

    if (actorLevel >= 4) {
        return true;
    }

    if (targetLevel >= actorLevel) {
        return false;
    }

    return true;
}

/* =========================================================
   CLIENT
========================================================= */

const client = new Client({

    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ],

    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ]

});

/* =========================================================
   DATABASE
========================================================= */

const DATA_FILE = path.join(__dirname, "data.json");

const DEFAULT_DATA = {

    guilds: {},

    users: {},

    warnings: {},

    jails: {},

    tickets: {},

    ticketPanels: {},

    ratings: {},

    pendingRatings: {},

    stats: {},

    pay: {
        balances: {},
        enabled: {}
    }

};

let data = DEFAULT_DATA;

function saveData() {

    try {

        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(data, null, 2),
            "utf8"
        );

    } catch (error) {

        console.error(
            "❌ فشل حفظ data.json:",
            error
        );

    }
}

function loadData() {

    try {

        if (!fs.existsSync(DATA_FILE)) {

            data = DEFAULT_DATA;

            saveData();

            return;
        }

        const raw = fs.readFileSync(
            DATA_FILE,
            "utf8"
        );

        const parsed = JSON.parse(raw);

        data = {
            ...DEFAULT_DATA,
            ...parsed,

            guilds: parsed.guilds || {},
            users: parsed.users || {},
            warnings: parsed.warnings || {},
            jails: parsed.jails || {},
            tickets: parsed.tickets || {},
            ticketPanels: parsed.ticketPanels || {},
            ratings: parsed.ratings || {},
            pendingRatings: parsed.pendingRatings || {},
            stats: parsed.stats || {},

            pay: {
                balances:
                    parsed.pay?.balances || {},
                enabled:
                    parsed.pay?.enabled || {}
            }
        };

    } catch (error) {

        console.error(
            "❌ خطأ في قراءة data.json:",
            error
        );

        data = DEFAULT_DATA;

        saveData();
    }
}

loadData();

/* =========================================================
   GUILD DATA
========================================================= */

function getGuildData(guildId) {

    if (!data.guilds[guildId]) {

        data.guilds[guildId] = {

            setupCompleted: false,

            ticketCategoryId: null,

            jailRoleId: null,

            logsChannelId: null,

            welcomeChannelId: null,

            goodbyeChannelId: null,

            welcomeEnabled: false,

            goodbyeEnabled: false,

            currencyEnabled: false,

            currencyName: "Coins",

            currencySymbol: "💰",

            staffRoles: {

                junior: [...STAFF_ROLES.junior],

                middle: [...STAFF_ROLES.middle],

                senior: [...STAFF_ROLES.senior],

                owner: [...STAFF_ROLES.owner]

            },

            ticketPanels: {},

            antiSpam: {

                enabled: true,

                maxMessages: 5,

                timeWindow: 5000,

                deleteMessages: true

            }

        };

        saveData();
    }

    return data.guilds[guildId];
}

/* =========================================================
   USER DATA
========================================================= */

function getUserData(guildId, userId) {

    if (!data.users[guildId]) {
        data.users[guildId] = {};
    }

    if (!data.users[guildId][userId]) {

        data.users[guildId][userId] = {

            xp: 0,

            actionPoints: 0,

            warnings: 0,

            timeouts: 0,

            jails: 0,

            ticketsClaimed: 0,

            bans: 0,

            messages: 0,

            coins: 0,

            lastXp: 0,

            lastDaily: 0

        };

        saveData();
    }

    return data.users[guildId][userId];
}

/* =========================================================
   STAFF STATS
========================================================= */

function getStats(guildId, userId) {

    if (!data.stats[guildId]) {
        data.stats[guildId] = {};
    }

    if (!data.stats[guildId][userId]) {

        data.stats[guildId][userId] = {

            warnings: 0,

            timeouts: 0,

            jails: 0,

            ticketsClaimed: 0,

            ticketsClosed: 0,

            points: 0,

            xp: 0,

            messages: 0,

            ratings: 0,

            goodRatings: 0

        };

        saveData();
    }

    return data.stats[guildId][userId];
}

/* =========================================================
   POINT SYSTEM
========================================================= */

const POINTS = {

    warning: 3,

    timeout: 3,

    ticketClaim: 3,

    jail: 5,

    goodRating: 3

};

function addPoints(guildId, userId, amount) {

    const user = getUserData(
        guildId,
        userId
    );

    const stats = getStats(
        guildId,
        userId
    );

    user.actionPoints += amount;
    stats.points += amount;

    saveData();
}

/* =========================================================
   XP SYSTEM
========================================================= */

const XP_PER_MESSAGE = 10;

const XP_COOLDOWN = 30 * 1000;

function addXP(guildId, userId) {

    const user = getUserData(
        guildId,
        userId
    );

    const now = Date.now();

    if (
        now - user.lastXp <
        XP_COOLDOWN
    ) {
        return;
    }

    user.xp += XP_PER_MESSAGE;

    user.messages++;

    user.lastXp = now;

    const stats = getStats(
        guildId,
        userId
    );

    stats.xp += XP_PER_MESSAGE;
    stats.messages++;

    saveData();
}

/* =========================================================
   COINS
========================================================= */

function getBalance(guildId, userId) {

    const user = getUserData(
        guildId,
        userId
    );

    return user.coins || 0;
}

function addCoins(
    guildId,
    userId,
    amount
) {

    const user = getUserData(
        guildId,
        userId
    );

    user.coins += amount;

    if (!data.pay.balances[guildId]) {
        data.pay.balances[guildId] = {};
    }

    data.pay.balances[guildId][userId] =
        user.coins;

    saveData();
}

function removeCoins(
    guildId,
    userId,
    amount
) {

    const user = getUserData(
        guildId,
        userId
    );

    user.coins = Math.max(
        0,
        user.coins - amount
    );

    if (!data.pay.balances[guildId]) {
        data.pay.balances[guildId] = {};
    }

    data.pay.balances[guildId][userId] =
        user.coins;

    saveData();
}

/* =========================================================
   TIME PARSER
========================================================= */

function parseDuration(input) {

    if (!input) {
        return null;
    }

    const value = String(input)
        .trim()
        .toLowerCase();

    const match =
        value.match(/^(\d+)\s*(s|m|h|d|w)$/);

    if (!match) {
        return null;
    }

    const amount =
        Number(match[1]);

    const unit =
        match[2];

    const units = {

        s: 1000,

        m: 60 * 1000,

        h: 60 * 60 * 1000,

        d: 24 * 60 * 60 * 1000,

        w: 7 * 24 * 60 * 60 * 1000

    };

    return amount * units[unit];
}

function formatDuration(ms) {

    if (!ms || ms <= 0) {
        return "غير محددة";
    }

    let seconds =
        Math.floor(ms / 1000);

    const weeks =
        Math.floor(seconds / 604800);

    seconds %= 604800;

    const days =
        Math.floor(seconds / 86400);

    seconds %= 86400;

    const hours =
        Math.floor(seconds / 3600);

    seconds %= 3600;

    const minutes =
        Math.floor(seconds / 60);

    seconds %= 60;

    const parts = [];

    if (weeks) {
        parts.push(`${weeks} أسبوع`);
    }

    if (days) {
        parts.push(`${days} يوم`);
    }

    if (hours) {
        parts.push(`${hours} ساعة`);
    }

    if (minutes) {
        parts.push(`${minutes} دقيقة`);
    }

    if (seconds) {
        parts.push(`${seconds} ثانية`);
    }

    return parts.join(" و ") || "0 ثانية";
}

/* =========================================================
   LOGS
========================================================= */

async function sendLog(
    guild,
    title,
    description,
    color = 0x5865F2
) {

    try {

        const guildData =
            getGuildData(guild.id);

        if (
            !guildData.logsChannelId
        ) {
            return;
        }

        const channel =
            guild.channels.cache.get(
                guildData.logsChannelId
            );

        if (
            !channel ||
            !channel.isTextBased()
        ) {
            return;
        }

        const embed =
            new EmbedBuilder()

                .setColor(color)

                .setTitle(title)

                .setDescription(
                    description
                )

                .setTimestamp()

                .setFooter({
                    text: guild.name
                });

        await channel.send({
            embeds: [embed]
        });

    } catch (error) {

        console.error(
            "Log Error:",
            error
        );

    }
}

/* =========================================================
   ERROR MESSAGE
========================================================= */

function errorEmbed(message) {

    return new EmbedBuilder()

        .setColor(0xED4245)

        .setDescription(
            `❌ ${message}`
        );
}

function successEmbed(message) {

    return new EmbedBuilder()

        .setColor(0x57F287)

        .setDescription(
            `✅ ${message}`
        );
}

/* =========================================================
   STAFF CHECK
========================================================= */

function checkStaffMessage(message) {

    if (!message.guild) {
        return false;
    }

    return isStaff(
        message.member
    );
}

/* =========================================================
   MEMBER RESOLVER
========================================================= */

async function resolveMember(
    guild,
    value
) {

    if (!value) {
        return null;
    }

    let id =
        String(value)
            .replace(/[<@!>]/g, "");

    try {

        return await guild.members.fetch(id);

    } catch {

        return null;
    }
}

/* =========================================================
   BAN PERMISSION
========================================================= */

async function executeBan(
    guild,
    actor,
    target,
    reason = "بدون سبب"
) {

    if (!target) {
        throw new Error(
            "لم يتم العثور على العضو."
        );
    }

    if (
        !canModerateTarget(
            actor,
            target
        )
    ) {
        throw new Error(
            "لا يمكنك تبنيد عضو رتبته مساوية أو أعلى من رتبتك."
        );
    }

    if (
        !target.bannable
    ) {
        throw new Error(
            "البوت لا يستطيع تبنيد هذا العضو. تأكد من ترتيب الرتب والصلاحيات."
        );
    }

    await target.ban({
        reason
    });

    const stats =
        getStats(
            guild.id,
            actor.id
        );

    stats.bans =
        (stats.bans || 0) + 1;

    const user =
        getUserData(
            guild.id,
            actor.id
        );

    user.bans =
        (user.bans || 0) + 1;

    saveData();

    await sendLog(
        guild,
        "🚫 Ban",
        `**العضو:** ${target.user.tag}\n**بواسطة:** ${actor.user.tag}\n**السبب:** ${reason}`,
        0xED4245
    );
}

/* =========================================================
   UNBAN
========================================================= */

async function executeUnban(
    guild,
    actor,
    userId,
    reason = "بدون سبب"
) {

    if (
        getStaffLevel(actor) < 1
    ) {
        throw new Error(
            "ليس لديك صلاحية استخدام الأمر."
        );
    }

    try {

        const user =
            await client.users.fetch(
                userId
            );

        await guild.members.unban(
            user.id,
            reason
        );

        await sendLog(
            guild,
            "♻️ Unban",
            `**العضو:** ${user.tag}\n**بواسطة:** ${actor.user.tag}\n**السبب:** ${reason}`,
            0x57F287
        );

        return user;

    } catch {

        throw new Error(
            "لم أستطع إلغاء الباند. تأكد من ID العضو وأنه مبند."
        );
    }
}

/* =========================================================
   WARN DATA
========================================================= */

function getWarningList(
    guildId,
    userId
) {

    if (!data.warnings[guildId]) {
        data.warnings[guildId] = {};
    }

    if (!data.warnings[guildId][userId]) {
        data.warnings[guildId][userId] = [];
    }

    return data.warnings[guildId][userId];
}

/* =========================================================
   JAIL DATA
========================================================= */

function getJailData(
    guildId,
    userId
) {

    if (!data.jails[guildId]) {
        data.jails[guildId] = {};
    }

    return data.jails[guildId][userId] || null;
}

/* =========================================================
   TICKET DATA
========================================================= */

function getTicketData(
    guildId,
    channelId
) {

    if (!data.tickets[guildId]) {
        data.tickets[guildId] = {};
    }

    return data.tickets[guildId][channelId] || null;
}

/* =========================================================
   CREATE TICKET OBJECT
========================================================= */

function createTicketObject(
    guildId,
    channelId,
    ownerId
) {

    if (!data.tickets[guildId]) {
        data.tickets[guildId] = {};
    }

    data.tickets[guildId][channelId] = {

        channelId,

        ownerId,

        claimedBy: null,

        createdAt: Date.now(),

        closedAt: null,

        closedBy: null,

        status: "open"

    };

    saveData();

    return data.tickets[guildId][channelId];
}

/* =========================================================
   ANTI SPAM MEMORY
========================================================= */

const spamTracker = new Map();

/*
    سيتم استخدامه في الجزء الثاني
    للتعامل مع الرسائل المتكررة وحذفها.
*/

function getSpamKey(
    guildId,
    userId
) {

    return `${guildId}:${userId}`;
}

/* =========================================================
   SLASH COMMANDS
========================================================= */

const slashCommands = [

    /* =========================
       BAN
    ========================= */

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("حظر عضو من السيرفر")

        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو المراد حظره")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب الحظر")
                .setRequired(false)
        ),

    /* =========================
       UNBAN
    ========================= */

    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("إلغاء حظر عضو")

        .addStringOption(option =>
            option
                .setName("userid")
                .setDescription("ID العضو")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب إلغاء الحظر")
                .setRequired(false)
        ),

    /* =========================
       WARN
    ========================= */

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("إعطاء تحذير لعضو")

        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب التحذير")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("duration")
                .setDescription("مدة التحذير مثل 30m أو 2h أو 7d")
                .setRequired(true)
        ),

    /* =========================
       TIMEOUT
    ========================= */

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("إعطاء تايم أوت لعضو")

        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب التايم أوت")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("duration")
                .setDescription("المدة مثل 10m أو 1h أو 1d")
                .setRequired(true)
        ),

    /* =========================
       JAIL
    ========================= */

    new SlashCommandBuilder()
        .setName("jail")
        .setDescription("سجن عضو")

        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب السجن")
                .setRequired(true)
        )

        .addStringOption(option =>
            option
                .setName("duration")
                .setDescription("مدة السجن مثل 30m أو 1h أو 1d")
                .setRequired(true)
        ),

    /* =========================
       JAIL TIME
    ========================= */

    new SlashCommandBuilder()
        .setName("time")
        .setDescription("عرض معلومات السجن والوقت المتبقي"),

    /* =========================
       CLOSE TICKET
    ========================= */

    new SlashCommandBuilder()
        .setName("close")
        .setDescription("إغلاق التذكرة الحالية"),

    /* =========================
       DELETE TICKET
    ========================= */

    new SlashCommandBuilder()
        .setName("delete")
        .setDescription("حذف التذكرة الحالية"),

    /* =========================
       POINTS
    ========================= */

    new SlashCommandBuilder()
        .setName("points")
        .setDescription("عرض نقاط وإحصائيات عضو")

        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),

    /* =========================
       XP
    ========================= */

    new SlashCommandBuilder()
        .setName("xp")
        .setDescription("عرض XP عضو")

        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),

    /* =========================
       BALANCE
    ========================= */

    new SlashCommandBuilder()
        .setName("balance")
        .setDescription("عرض رصيد العملات")

        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),

    /* =========================
       PAY
    ========================= */

    new SlashCommandBuilder()
        .setName("pay")
        .setDescription("تحويل عملات إلى عضو")

        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو الذي سيستلم العملات")
                .setRequired(true)
        )

        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("عدد العملات")
                .setMinValue(1)
                .setRequired(true)
        ),

    /* =========================
       SETUP
    ========================= */

    new SlashCommandBuilder()
        .setName("setup")
        .setDescription("فتح لوحة إعدادات البوت للسيرفر"),

    /* =========================
       STATS
    ========================= */

    new SlashCommandBuilder()
        .setName("stats")
        .setDescription("عرض إحصائيات عضو")

        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),

    /* =========================
       HELP
    ========================= */

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("عرض جميع أوامر ومميزات البوت")

].map(command => command.toJSON());


/* =========================================================
   REGISTER SLASH COMMANDS
========================================================= */

async function registerSlashCommands() {

    try {

        if (!client.user) {
            console.error(
                "❌ لا يمكن تسجيل Slash Commands قبل تسجيل دخول البوت."
            );

            return;
        }

        const rest =
            new REST({
                version: "10"
            }).setToken(TOKEN);

        console.log(
            "⏳ جاري تسجيل Slash Commands..."
        );

        await rest.put(

            Routes.applicationCommands(
                client.user.id
            ),

            {
                body: slashCommands
            }

        );

        console.log(
            `✅ تم تسجيل ${slashCommands.length} Slash Commands بنجاح.`
        );

    } catch (error) {

        console.error(
            "❌ فشل تسجيل Slash Commands:",
            error
        );

    }
}


/* =========================================================
   READY EVENT
========================================================= */

client.once("ready", async () => {

    console.log(
        `✅ تم تسجيل الدخول باسم ${client.user.tag}`
    );

    try {

        await client.application.fetch();

        APPLICATION_OWNER_ID =
            client.application.owner?.id ||
            client.application.owner?.user?.id ||
            null;

        console.log(
            `👑 Bot Owner ID: ${APPLICATION_OWNER_ID || "غير معروف"}`
        );

    } catch (error) {

        console.error(
            "⚠️ تعذر الحصول على Bot Owner:",
            error
        );

    }

    client.user.setPresence({

        activities: [

            {
                name: `${client.guilds.cache.size} Servers`,
                type: ActivityType.Watching
            }

        ],

        status: "online"

    });

    await registerSlashCommands();

    console.log(
        `🌐 البوت يعمل في ${client.guilds.cache.size} سيرفر.`
    );

});
// ==========================================================
// PART 2 - MODERATION / POINTS / JAIL / TICKETS
// ==========================================================

// ==========================================================
// WARNING SYSTEM
// ==========================================================

async function executeWarn(guild, actor, target, reason, durationText) {
    if (!guild || !actor || !target) {
        throw new Error("بيانات التحذير غير مكتملة.");
    }

    if (target.id === actor.id) {
        throw new Error("لا يمكنك تحذير نفسك.");
    }

    if (!canModerateTarget(actor, target)) {
        throw new Error("لا يمكنك تحذير عضو بنفس مستواك أو أعلى منك.");
    }

    const duration = parseDuration(durationText);

    if (!duration || duration <= 0) {
        throw new Error("مدة التحذير غير صحيحة. مثال: `30m` أو `2h` أو `7d`.");
    }

    const guildId = guild.id;
    const userId = target.id;

    const warnings = getWarningList(guildId, userId);

    const warning = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        guildId,
        userId,
        moderatorId: actor.id,
        reason: reason || "لم يتم تحديد سبب",
        createdAt: Date.now(),
        expiresAt: Date.now() + duration
    };

    warnings.push(warning);

    if (!data.warnings[guildId]) {
        data.warnings[guildId] = {};
    }

    data.warnings[guildId][userId] = warnings;

    addPoints(guildId, actor.id, POINTS.warning);

    const user = getUserData(guildId, actor.id);
    user.warnings = (user.warnings || 0) + 1;

    saveData();

    await sendLog(
        guild,
        "⚠️ تحذير جديد",
        [
            `**العضو:** ${target}`,
            `**المشرف:** ${actor}`,
            `**السبب:** ${reason || "غير محدد"}`,
            `**المدة:** ${formatDuration(duration)}`,
            `**عدد التحذيرات الحالية:** ${warnings.length}`
        ].join("\n"),
        0xF1C40F
    );

    // إذا وصل إلى 3 تحذيرات فعالة
    if (warnings.length >= 3) {
        try {
            if (target.moderatable) {
                await target.timeout(
                    30 * 60 * 1000,
                    "الوصول إلى 3 تحذيرات"
                );

                const stats = getStats(guildId, actor.id);
                stats.timeouts = (stats.timeouts || 0) + 1;

                const actorData = getUserData(guildId, actor.id);
                actorData.timeouts = (actorData.timeouts || 0) + 1;

                addPoints(
                    guildId,
                    actor.id,
                    POINTS.timeout
                );

                saveData();

                await sendLog(
                    guild,
                    "⏱️ تايم تلقائي",
                    `${target} حصل على تايم لمدة 30 دقيقة بسبب وصوله إلى 3 تحذيرات.`,
                    0xE67E22
                );
            }
        } catch (error) {
            console.error("Auto timeout error:", error);
        }
    }

    return warning;
}


// ==========================================================
// TIMEOUT SYSTEM
// ==========================================================

async function executeTimeout(
    guild,
    actor,
    target,
    reason,
    durationText
) {
    if (!guild || !actor || !target) {
        throw new Error("بيانات التايم غير مكتملة.");
    }

    if (target.id === actor.id) {
        throw new Error("لا يمكنك إعطاء تايم لنفسك.");
    }

    if (!canModerateTarget(actor, target)) {
        throw new Error("لا يمكنك إعطاء تايم لعضو بنفس مستواك أو أعلى منك.");
    }

    const duration = parseDuration(durationText);

    if (!duration || duration <= 0) {
        throw new Error(
            "مدة التايم غير صحيحة. مثال: `10m` أو `1h` أو `1d`."
        );
    }

    if (duration > 28 * 24 * 60 * 60 * 1000) {
        throw new Error("أقصى مدة للتايم هي 28 يومًا.");
    }

    if (!target.moderatable) {
        throw new Error("البوت لا يستطيع إعطاء تايم لهذا العضو.");
    }

    await target.timeout(
        duration,
        reason || "بدون سبب"
    );

    const stats = getStats(guild.id, actor.id);
    stats.timeouts = (stats.timeouts || 0) + 1;

    const actorData = getUserData(guild.id, actor.id);
    actorData.timeouts = (actorData.timeouts || 0) + 1;

    addPoints(
        guild.id,
        actor.id,
        POINTS.timeout
    );

    saveData();

    await sendLog(
        guild,
        "⏱️ تايم",
        [
            `**العضو:** ${target}`,
            `**المشرف:** ${actor}`,
            `**المدة:** ${formatDuration(duration)}`,
            `**السبب:** ${reason || "غير محدد"}`
        ].join("\n"),
        0xE67E22
    );

    return duration;
}


// ==========================================================
// JAIL SYSTEM
// ==========================================================

async function executeJail(
    guild,
    actor,
    target,
    reason,
    durationText
) {
    if (!guild || !actor || !target) {
        throw new Error("بيانات السجن غير مكتملة.");
    }

    const actorLevel = getStaffLevel(actor);

    if (actorLevel < 3) {
        throw new Error(
            "❌ نظام السجن متاح فقط للإدارة العليا والأونر."
        );
    }

    if (target.id === actor.id) {
        throw new Error("لا يمكنك سجن نفسك.");
    }

    if (!canModerateTarget(actor, target)) {
        throw new Error(
            "لا يمكنك سجن عضو بنفس مستواك أو أعلى منك."
        );
    }

    const duration = parseDuration(durationText);

    if (!duration || duration <= 0) {
        throw new Error(
            "مدة السجن غير صحيحة. مثال: `30m` أو `2h` أو `7d`."
        );
    }

    const guildData = getGuildData(guild.id);

    if (!guildData.jailRoleId) {
        throw new Error(
            "❌ لم يتم تحديد رتبة السجن. استخدم إعدادات السجن أولًا."
        );
    }

    const jailRole = guild.roles.cache.get(
        guildData.jailRoleId
    );

    if (!jailRole) {
        throw new Error(
            "❌ رتبة السجن المحددة غير موجودة."
        );
    }

    if (!guild.members.me.permissions.has(
        PermissionsBitField.Flags.ManageRoles
    )) {
        throw new Error(
            "❌ البوت يحتاج صلاحية Manage Roles."
        );
    }

    if (
        jailRole.position >= guild.members.me.roles.highest.position
    ) {
        throw new Error(
            "❌ رتبة السجن أعلى من رتبة البوت."
        );
    }

    const oldRoles = target.roles.cache
        .filter(role => role.id !== guild.id)
        .map(role => role.id);

    try {
        if (oldRoles.length > 0) {
            await target.roles.remove(
                oldRoles,
                "تطبيق نظام السجن"
            );
        }

        await target.roles.add(
            jailRole,
            reason || "بدون سبب"
        );
    } catch (error) {
        console.error("Jail role error:", error);
        throw new Error(
            "❌ لم أستطع تطبيق رتبة السجن على العضو."
        );
    }

    if (!data.jails[guild.id]) {
        data.jails[guild.id] = {};
    }

    data.jails[guild.id][target.id] = {
        userId: target.id,
        guildId: guild.id,
        moderatorId: actor.id,
        reason: reason || "غير محدد",
        duration,
        createdAt: Date.now(),
        expiresAt: Date.now() + duration,
        oldRoles
    };

    const stats = getStats(
        guild.id,
        actor.id
    );

    stats.jails = (stats.jails || 0) + 1;

    const actorData = getUserData(
        guild.id,
        actor.id
    );

    actorData.jails = (actorData.jails || 0) + 1;

    addPoints(
        guild.id,
        actor.id,
        POINTS.jail
    );

    saveData();

    await sendLog(
        guild,
        "🔒 سجن عضو",
        [
            `**العضو:** ${target}`,
            `**المشرف:** ${actor}`,
            `**المدة:** ${formatDuration(duration)}`,
            `**السبب:** ${reason || "غير محدد"}`
        ].join("\n"),
        0x8E44AD
    );

    return duration;
}


// ==========================================================
// RELEASE FROM JAIL
// ==========================================================

async function releaseFromJail(
    guild,
    userId,
    automatic = false
) {
    if (!guild || !userId) {
        return false;
    }

    const jailData =
        getJailData(
            guild.id,
            userId
        );

    if (!jailData) {
        return false;
    }

    let member = null;

    try {
        member = await guild.members
            .fetch(userId);
    } catch {
        member = null;
    }

    if (member) {
        const oldRoles =
            Array.isArray(jailData.oldRoles)
                ? jailData.oldRoles
                : [];

        const validRoles = oldRoles
            .map(id => guild.roles.cache.get(id))
            .filter(Boolean)
            .filter(role =>
                role.id !== guild.id &&
                role.position <
                guild.members.me.roles.highest.position
            );

        try {
            if (validRoles.length > 0) {
                await member.roles.add(
                    validRoles,
                    automatic
                        ? "انتهاء مدة السجن"
                        : "إلغاء السجن"
                );
            }

            const jailRole =
                guild.roles.cache.get(
                    getGuildData(guild.id).jailRoleId
                );

            if (
                jailRole &&
                member.roles.cache.has(jailRole.id)
            ) {
                await member.roles.remove(
                    jailRole,
                    automatic
                        ? "انتهاء مدة السجن"
                        : "إلغاء السجن"
                );
            }
        } catch (error) {
            console.error(
                "Release jail roles error:",
                error
            );
        }
    }

    delete data.jails[guild.id][userId];

    if (
        Object.keys(data.jails[guild.id]).length === 0
    ) {
        delete data.jails[guild.id];
    }

    saveData();

    await sendLog(
        guild,
        automatic
            ? "🔓 انتهاء السجن"
            : "🔓 فك السجن",
        `تم فك السجن عن <@${userId}>.`,
        0x2ECC71
    );

    return true;
}


// ==========================================================
// JAIL TIME
// ==========================================================

function getRemainingJailTime(
    guildId,
    userId
) {
    const jail =
        getJailData(
            guildId,
            userId
        );

    if (!jail) {
        return null;
    }

    const remaining =
        jail.expiresAt - Date.now();

    if (remaining <= 0) {
        return 0;
    }

    return remaining;
}


// ==========================================================
// POINTS COMMAND DATA
// ==========================================================

function buildPointsEmbed(
    guild,
    member
) {
    const user =
        getUserData(
            guild.id,
            member.id
        );

    const stats =
        getStats(
            guild.id,
            member.id
        );

    return new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle("⭐ نقاط العضو")
        .setThumbnail(
            member.displayAvatarURL({
                size: 256
            })
        )
        .setDescription(
            `إحصائيات ${member}`
        )
        .addFields(
            {
                name: "⭐ نقاط الإجراءات",
                value: `\`${user.actionPoints || 0}\``,
                inline: true
            },
            {
                name: "⚠️ التحذيرات",
                value: `\`${stats.warnings || user.warnings || 0}\``,
                inline: true
            },
            {
                name: "⏱️ التايمات",
                value: `\`${stats.timeouts || user.timeouts || 0}\``,
                inline: true
            },
            {
                name: "🔒 السجون",
                value: `\`${stats.jails || user.jails || 0}\``,
                inline: true
            },
            {
                name: "🎫 التذاكر المستلمة",
                value: `\`${stats.ticketsClaimed || user.ticketsClaimed || 0}\``,
                inline: true
            },
            {
                name: "👍 التقييمات الجيدة",
                value: `\`${stats.goodRatings || 0}\``,
                inline: true
            },
            {
                name: "✨ XP",
                value: `\`${user.xp || 0}\``,
                inline: true
            },
            {
                name: "💰 الرصيد",
                value: `\`${user.coins || 0}\``,
                inline: true
            }
        )
        .setFooter({
            text: guild.name
        })
        .setTimestamp();
}


// ==========================================================
// XP EMBED
// ==========================================================

function buildXPEmbed(
    guild,
    member
) {
    const user =
        getUserData(
            guild.id,
            member.id
        );

    const level =
        Math.floor(
            (user.xp || 0) / 1500
        );

    const nextLevel =
        ((level + 1) * 1500);

    const currentLevelXP =
        (user.xp || 0) -
        (level * 1500);

    return new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle("✨ XP العضو")
        .setThumbnail(
            member.displayAvatarURL({
                size: 256
            })
        )
        .addFields(
            {
                name: "👤 العضو",
                value: `${member}`,
                inline: true
            },
            {
                name: "✨ XP",
                value: `\`${user.xp || 0}\``,
                inline: true
            },
            {
                name: "🏆 المستوى",
                value: `\`${level}\``,
                inline: true
            },
            {
                name: "📈 التقدم",
                value:
                    `\`${currentLevelXP} / 1500\``,
                inline: true
            },
            {
                name: "🎯 XP للمستوى القادم",
                value:
                    `\`${Math.max(
                        0,
                        nextLevel - (user.xp || 0)
                    )}\``,
                inline: true
            }
        )
        .setTimestamp();
}


// ==========================================================
// BALANCE EMBED
// ==========================================================

function buildBalanceEmbed(
    guild,
    member
) {
    const guildData =
        getGuildData(guild.id);

    const user =
        getUserData(
            guild.id,
            member.id
        );

    return new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle("💰 الرصيد")
        .setThumbnail(
            member.displayAvatarURL({
                size: 256
            })
        )
        .setDescription(
            `رصيد ${member}`
        )
        .addFields({
            name:
                `${guildData.currencySymbol || "💰"} ${
                    guildData.currencyName || "Coins"
                }`,
            value:
                `\`${user.coins || 0}\``,
            inline: false
        })
        .setTimestamp();
}


// ==========================================================
// TICKET OBJECT HELPERS
// ==========================================================

function isTicketOwner(
    ticket,
    member
) {
    return Boolean(
        ticket &&
        member &&
        ticket.ownerId === member.id
    );
}

function isTicketClaimer(
    ticket,
    member
) {
    return Boolean(
        ticket &&
        member &&
        ticket.claimedBy === member.id
    );
}

function canManageTicket(
    ticket,
    member
) {
    if (!ticket || !member) {
        return false;
    }

    if (ticket.ownerId === member.id) {
        return true;
    }

    if (ticket.claimedBy === member.id) {
        return true;
    }

    const level =
        getStaffLevel(member);

    if (level >= 4) {
        return true;
    }

    if (!ticket.claimedBy) {
        return level >= 1;
    }

    const claimer =
        member.guild.members.cache.get(
            ticket.claimedBy
        );

    if (!claimer) {
        return level >= 1;
    }

    return level >
        getStaffLevel(claimer);
}


// ==========================================================
// TICKET PERMISSION HELPERS
// ==========================================================

function canWriteInTicket(
    ticket,
    member
) {
    if (!ticket || !member) {
        return false;
    }

    if (ticket.ownerId === member.id) {
        return true;
    }

    if (ticket.claimedBy === member.id) {
        return true;
    }

    if (!ticket.claimedBy) {
        return getStaffLevel(member) >= 1;
    }

    const claimer =
        member.guild.members.cache.get(
            ticket.claimedBy
        );

    if (!claimer) {
        return getStaffLevel(member) >= 1;
    }

    return getStaffLevel(member) >
        getStaffLevel(claimer);
}


// ==========================================================
// CLAIM TICKET
// ==========================================================

async function claimTicket(
    channel,
    member
) {
    const ticket =
        getTicketData(
            member.guild.id,
            channel.id
        );

    if (!ticket) {
        throw new Error(
            "هذه القناة ليست تذكرة."
        );
    }

    if (ticket.status !== "open") {
        throw new Error(
            "هذه التذكرة مغلقة."
        );
    }

    if (ticket.claimedBy) {
        throw new Error(
            `التذكرة مستلمة بالفعل بواسطة <@${ticket.claimedBy}>.`
        );
    }

    if (getStaffLevel(member) < 1) {
        throw new Error(
            "❌ لا تملك صلاحية استلام التذاكر."
        );
    }

    ticket.claimedBy = member.id;

    const stats =
        getStats(
            member.guild.id,
            member.id
        );

    stats.ticketsClaimed =
        (stats.ticketsClaimed || 0) + 1;

    const user =
        getUserData(
            member.guild.id,
            member.id
        );

    user.ticketsClaimed =
        (user.ticketsClaimed || 0) + 1;

    addPoints(
        member.guild.id,
        member.id,
        POINTS.ticketClaim
    );

    saveData();

    try {
        await channel.permissionOverwrites.edit(
            ticket.ownerId,
            {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            }
        );

        await channel.permissionOverwrites.edit(
            member.id,
            {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            }
        );
    } catch (error) {
        console.error(
            "Ticket permissions error:",
            error
        );
    }

    await sendLog(
        member.guild,
        "🎫 استلام تذكرة",
        `**التذكرة:** ${channel}\n**المستلم:** ${member}`,
        0x2ECC71
    );

    return ticket;
}


// ==========================================================
// UNCLAIM TICKET
// ==========================================================

async function unclaimTicket(
    channel,
    member
) {
    const ticket =
        getTicketData(
            member.guild.id,
            channel.id
        );

    if (!ticket) {
        throw new Error(
            "هذه القناة ليست تذكرة."
        );
    }

    if (!ticket.claimedBy) {
        throw new Error(
            "التذكرة غير مستلمة."
        );
    }

    const currentClaimer =
        member.guild.members.cache.get(
            ticket.claimedBy
        );

    const actorLevel =
        getStaffLevel(member);

    const claimerLevel =
        currentClaimer
            ? getStaffLevel(currentClaimer)
            : 0;

    // المستلم نفسه يستطيع إلغاء الاستلام
    // أو شخص أعلى منه في الإدارة
    if (
        member.id !== ticket.claimedBy &&
        actorLevel <= claimerLevel
    ) {
        throw new Error(
            "❌ لا يمكنك إلغاء استلام هذه التذكرة."
        );
    }

    const oldClaimer =
        ticket.claimedBy;

    ticket.claimedBy = null;

    saveData();

    await sendLog(
        member.guild,
        "🎫 إلغاء استلام تذكرة",
        [
            `**التذكرة:** ${channel}`,
            `**المستلم السابق:** <@${oldClaimer}>`,
            `**بواسطة:** ${member}`
        ].join("\n"),
        0xE67E22
    );

    return ticket;
}


// ==========================================================
// CLOSE TICKET
// ==========================================================

async function closeTicket(
    channel,
    member
) {
    const ticket =
        getTicketData(
            member.guild.id,
            channel.id
        );

    if (!ticket) {
        throw new Error(
            "هذه القناة ليست تذكرة."
        );
    }

    if (ticket.status === "closed") {
        throw new Error(
            "❌ التذكرة مغلقة بالفعل."
        );
    }

    if (!canManageTicket(member, ticket)) {
        throw new Error(
            "❌ ليس لديك صلاحية إغلاق هذه التذكرة."
        );
    }

    ticket.status = "closed";
    ticket.closedAt = Date.now();
    ticket.closedBy = member.id;

    if (!data.stats[member.guild.id]) {
        data.stats[member.guild.id] = {};
    }

    const stats =
        getStats(
            member.guild.id,
            member.id
        );

    stats.ticketsClosed =
        (stats.ticketsClosed || 0) + 1;

    saveData();

    await sendLog(
        member.guild,
        "🔒 إغلاق تذكرة",
        [
            `**التذكرة:** ${channel}`,
            `**صاحب التذكرة:** <@${ticket.ownerId}>`,
            `**بواسطة:** ${member}`
        ].join("\n"),
        0xE74C3C
    );

    return ticket;
}


// ==========================================================
// DELETE TICKET
// ==========================================================

async function deleteTicket(
    channel,
    member
) {
    const guildId =
        member.guild.id;

    const ticket =
        getTicketData(
            guildId,
            channel.id
        );

    if (!ticket) {
        throw new Error(
            "هذه القناة ليست تذكرة."
        );
    }

    if (!canManageTicket(member, ticket)) {
        throw new Error(
            "❌ ليس لديك صلاحية حذف هذه التذكرة."
        );
    }

    ticket.status = "closed";
    ticket.closedAt = Date.now();
    ticket.closedBy = member.id;

    // إنشاء طلب تقييم إذا كان هناك موظف مستلم
    if (
        ticket.ownerId &&
        ticket.claimedBy
    ) {
        if (!data.pendingRatings[guildId]) {
            data.pendingRatings[guildId] = {};
        }

        data.pendingRatings[guildId][ticket.ownerId] = {
            staffId: ticket.claimedBy,
            ticketId: ticket.channelId,
            createdAt: Date.now()
        };
    }

    saveData();

    await sendLog(
        member.guild,
        "🗑️ حذف تذكرة",
        [
            `**التذكرة:** ${channel}`,
            `**صاحب التذكرة:** <@${ticket.ownerId}>`,
            `**المستلم:** ${
                ticket.claimedBy
                    ? `<@${ticket.claimedBy}>`
                    : "غير مستلمة"
            }`,
            `**بواسطة:** ${member}`
        ].join("\n"),
        0x992D22
    );

    return ticket;
}


// ==========================================================
// ADD TICKET RATING
// ==========================================================

async function addTicketRating(
    guildId,
    ownerId,
    stars
) {
    stars =
        Number(stars);

    if (
        !Number.isInteger(stars) ||
        stars < 1 ||
        stars > 5
    ) {
        throw new Error(
            "التقييم يجب أن يكون من 1 إلى 5 نجوم."
        );
    }

    if (!data.pendingRatings[guildId]) {
        throw new Error(
            "لا يوجد تقييم معلق."
        );
    }

    const pending =
        data.pendingRatings[guildId][ownerId];

    if (!pending) {
        throw new Error(
            "لا يوجد تقييم معلق."
        );
    }

    const staffId =
        pending.staffId;

    if (!staffId) {
        delete data.pendingRatings[guildId][ownerId];

        saveData();

        return {
            stars,
            staffId: null
        };
    }

    if (!data.ratings[guildId]) {
        data.ratings[guildId] = [];
    }

    data.ratings[guildId].push({
        ownerId,
        staffId,
        stars,
        ticketId: pending.ticketId,
        createdAt: Date.now()
    });

    // التقييم الجيد = 4 أو 5 نجوم
    if (stars >= 4) {
        addPoints(
            guildId,
            staffId,
            POINTS.goodRating
        );
    }

    const stats =
        getStats(
            guildId,
            staffId
        );

    stats.ratings =
        (stats.ratings || 0) + 1;

    if (stars >= 4) {
        stats.goodRatings =
            (stats.goodRatings || 0) + 1;
    }

    delete data.pendingRatings[guildId][ownerId];

    saveData();

    return {
        stars,
        staffId
    };
}


// ==========================================================
// CLEAN EXPIRED WARNINGS
// ==========================================================

function cleanExpiredWarnings() {
    const now =
        Date.now();

    let changed = false;

    for (
        const guildId of Object.keys(
            data.warnings
        )
    ) {
        const guildWarnings =
            data.warnings[guildId];

        if (!guildWarnings) {
            continue;
        }

        for (
            const userId of Object.keys(
                guildWarnings
            )
        ) {
            const warnings =
                guildWarnings[userId];

            if (!Array.isArray(warnings)) {
                continue;
            }

            const activeWarnings =
                warnings.filter(
                    warning =>
                        !warning.expiresAt ||
                        warning.expiresAt > now
                );

            if (
                activeWarnings.length !==
                warnings.length
            ) {
                data.warnings[guildId][userId] =
                    activeWarnings;

                changed = true;
            }
        }
    }

    if (changed) {
        saveData();
    }
}


// ==========================================================
// CLEAN EXPIRED JAILS
// ==========================================================

async function cleanExpiredJails() {
    const now =
        Date.now();

    for (
        const guildId of Object.keys(
            data.jails
        )
    ) {
        const guildJails =
            data.jails[guildId];

        if (!guildJails) {
            continue;
        }

        for (
            const userId of Object.keys(
                guildJails
            )
        ) {
            const jail =
                guildJails[userId];

            if (!jail) {
                continue;
            }

            if (
                jail.expiresAt &&
                jail.expiresAt <= now
            ) {
                try {
                    const guild =
                        client.guilds.cache.get(
                            guildId
                        );

                    if (!guild) {
                        continue;
                    }

                    const member =
                        await guild.members
                            .fetch(userId)
                            .catch(() => null);

                    if (member) {
                        await releaseFromJail(
                            guild,
                            member
                        );
                    } else {
                        delete data.jails[guildId][userId];
                        saveData();
                    }
                } catch (error) {
                    console.error(
                        "❌ Jail cleanup error:",
                        error
                    );
                }
            }
        }
    }
}


// ==========================================================
// AUTOMATIC CLEANUP
// ==========================================================

setInterval(
    async () => {
        try {
            cleanExpiredWarnings();

            await cleanExpiredJails();
        } catch (error) {
            console.error(
                "❌ Cleanup error:",
                error
            );
        }
    },
    10000
);
// ==========================================================
// PART 3
// INTERACTION HANDLER
// ==========================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // ==================================================
            // SLASH COMMANDS
            // ==================================================

            if (interaction.isChatInputCommand()) {

                const command =
                    interaction.commandName;

                const guild =
                    interaction.guild;

                if (!guild) {
                    return interaction.reply({
                        embeds: [
                            errorEmbed(
                                "❌ هذا الأمر يعمل داخل السيرفر فقط."
                            )
                        ],
                        ephemeral: true
                    });
                }

                const member =
                    await guild.members
                        .fetch(interaction.user.id)
                        .catch(() => null);

                if (!member) {
                    return interaction.reply({
                        embeds: [
                            errorEmbed(
                                "❌ لم أستطع العثور على حسابك داخل السيرفر."
                            )
                        ],
                        ephemeral: true
                    });
                }


                // ==================================================
                // BAN
                // ==================================================

                if (command === "ban") {

                    if (!isStaff(member)) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ ليس لديك صلاحية استخدام هذا الأمر."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const target =
                        interaction.options.getMember(
                            "member"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) || "بدون سبب";

                    if (!target) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ لم أستطع العثور على العضو."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    await executeBan(
                        guild,
                        member,
                        target,
                        reason
                    );

                    return interaction.reply({
                        embeds: [
                            successEmbed(
                                "🔨 تم حظر العضو",
                                `تم حظر ${target} بنجاح.\n**السبب:** ${reason}`
                            )
                        ]
                    });
                }


                // ==================================================
                // UNBAN
                // ==================================================

                if (command === "unban") {

                    if (!isStaff(member)) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ ليس لديك صلاحية استخدام هذا الأمر."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const userId =
                        interaction.options.getString(
                            "userid"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) || "بدون سبب";

                    await executeUnban(
                        guild,
                        member,
                        userId,
                        reason
                    );

                    return interaction.reply({
                        embeds: [
                            successEmbed(
                                "🔓 تم فك الحظر",
                                `تم فك الحظر عن المستخدم.\n**ID:** \`${userId}\``
                            )
                        ]
                    });
                }


                // ==================================================
                // WARN
                // ==================================================

                if (command === "warn") {

                    if (!isStaff(member)) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ ليس لديك صلاحية استخدام هذا الأمر."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const target =
                        interaction.options.getMember(
                            "member"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        );

                    const duration =
                        interaction.options.getString(
                            "duration"
                        );

                    if (!target) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ لم أستطع العثور على العضو."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    await executeWarn(
                        guild,
                        member,
                        target,
                        reason,
                        duration
                    );

                    return interaction.reply({
                        embeds: [
                            successEmbed(
                                "⚠️ تم تحذير العضو",
                                [
                                    `**العضو:** ${target}`,
                                    `**السبب:** ${reason}`,
                                    `**المدة:** ${duration}`,
                                    `**النقاط:** +${POINTS.warning}`
                                ].join("\n")
                            )
                        ]
                    });
                }


                // ==================================================
                // TIMEOUT
                // ==================================================

                if (command === "timeout") {

                    if (!isStaff(member)) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ ليس لديك صلاحية استخدام هذا الأمر."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const target =
                        interaction.options.getMember(
                            "member"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        );

                    const duration =
                        interaction.options.getString(
                            "duration"
                        );

                    if (!target) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ لم أستطع العثور على العضو."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    await executeTimeout(
                        guild,
                        member,
                        target,
                        reason,
                        duration
                    );

                    return interaction.reply({
                        embeds: [
                            successEmbed(
                                "🔇 تم إعطاء Timeout",
                                [
                                    `**العضو:** ${target}`,
                                    `**السبب:** ${reason}`,
                                    `**المدة:** ${duration}`,
                                    `**النقاط:** +${POINTS.timeout}`
                                ].join("\n")
                            )
                        ]
                    });
                }


                // ==================================================
                // JAIL
                // ==================================================

                if (command === "jail") {

                    if (!isSeniorStaff(member)) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ أمر السجن متاح للإدارة العليا فقط."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const target =
                        interaction.options.getMember(
                            "member"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        );

                    const duration =
                        interaction.options.getString(
                            "duration"
                        );

                    if (!target) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ لم أستطع العثور على العضو."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    await executeJail(
                        guild,
                        member,
                        target,
                        reason,
                        duration
                    );

                    return interaction.reply({
                        embeds: [
                            successEmbed(
                                "🔒 تم سجن العضو",
                                [
                                    `**العضو:** ${target}`,
                                    `**السبب:** ${reason}`,
                                    `**المدة:** ${duration}`,
                                    `**النقاط:** +${POINTS.jail}`
                                ].join("\n")
                            )
                        ]
                    });
                }


                // ==================================================
                // TIME
                // ==================================================

                if (command === "time") {

                    const target =
                        interaction.options.getMember(
                            "member"
                        ) || member;

                    const jail =
                        getJailData(
                            guild.id,
                            target.id
                        );

                    if (!jail) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    `❌ ${target.user.username} ليس مسجونًا حاليًا.`
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const remaining =
                        getRemainingJailTime(
                            jail
                        );

                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(0x3498DB)
                                .setTitle("⏱️ مدة السجن")
                                .setDescription(
                                    [
                                        `**العضو:** ${target}`,
                                        `**الوقت المتبقي:** ${remaining}`
                                    ].join("\n")
                                )
                        ]
                    });
                }


                // ==================================================
                // POINTS
                // ==================================================

                if (command === "points") {

                    const target =
                        interaction.options.getMember(
                            "member"
                        ) || member;

                    const embed =
                        buildPointsEmbed(
                            guild.id,
                            target.id
                        );

                    return interaction.reply({
                        embeds: [embed]
                    });
                }


                // ==================================================
                // XP
                // ==================================================

                if (command === "xp") {

                    const target =
                        interaction.options.getMember(
                            "member"
                        ) || member;

                    const embed =
                        buildXPEmbed(
                            guild.id,
                            target.id
                        );

                    return interaction.reply({
                        embeds: [embed]
                    });
                }


                // ==================================================
                // BALANCE
                // ==================================================

                if (command === "balance") {

                    const target =
                        interaction.options.getMember(
                            "member"
                        ) || member;

                    const embed =
                        buildBalanceEmbed(
                            guild.id,
                            target.id
                        );

                    return interaction.reply({
                        embeds: [embed]
                    });
                }


                // ==================================================
                // PAY
                // ==================================================

                if (command === "pay") {

                    const guildData =
                        getGuildData(
                            guild.id
                        );

                    if (
                        !guildData.currencyEnabled
                    ) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ نظام العملة غير مفعل في هذا السيرفر."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const target =
                        interaction.options.getMember(
                            "member"
                        );

                    const amount =
                        interaction.options.getInteger(
                            "amount"
                        );

                    if (!target) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ العضو غير موجود."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    if (
                        target.id === member.id
                    ) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ لا يمكنك تحويل العملة لنفسك."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const balance =
                        getBalance(
                            guild.id,
                            member.id
                        );

                    if (balance < amount) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    `❌ رصيدك غير كافٍ.\nرصيدك الحالي: **${balance}**`
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    removeCoins(
                        guild.id,
                        member.id,
                        amount
                    );

                    addCoins(
                        guild.id,
                        target.id,
                        amount
                    );

                    const currencyName =
                        guildData.currencyName ||
                        "Coins";

                    return interaction.reply({
                        embeds: [
                            successEmbed(
                                "💸 تم التحويل",
                                [
                                    `**من:** ${member}`,
                                    `**إلى:** ${target}`,
                                    `**المبلغ:** ${amount} ${currencyName}`
                                ].join("\n")
                            )
                        ]
                    });
                }


                             // ==================================================
                // STATS
                // ==================================================

                if (command === "stats") {

                    const target =
                        interaction.options.getMember(
                            "member"
                        ) || member;

                    const stats =
                        getStats(
                            guild.id,
                            target.id
                        );

                    const user =
                        getUserData(
                            guild.id,
                            target.id
                        );

                    const embed =
                        new EmbedBuilder()
                            .setColor(0x5865F2)
                            .setTitle("📊 إحصائيات العضو")
                            .setThumbnail(
                                target.displayAvatarURL({
                                    size: 256
                                })
                            )
                            .setDescription(
                                [
                                    `👤 **العضو:** ${target}`,
                                    "",
                                    `⚠️ التحذيرات: **${stats.warnings || 0}**`,
                                    `🔇 الـTimeouts: **${stats.timeouts || 0}**`,
                                    `🔒 مرات السجن: **${stats.jails || 0}**`,
                                    `🎫 التذاكر المستلمة: **${stats.ticketsClaimed || 0}**`,
                                    `🔒 التذاكر المغلقة: **${stats.ticketsClosed || 0}**`,
                                    `⭐ التقييمات: **${stats.ratings || 0}**`,
                                    `👍 التقييمات الجيدة: **${stats.goodRatings || 0}**`,
                                    `🏆 نقاط الإدارة: **${user.actionPoints || 0}**`,
                                    `✨ XP: **${user.xp || 0}**`,
                                    `💬 الرسائل: **${user.messages || 0}**`
                                ].join("\n")
                            )
                            .setFooter({
                                text:
                                    `إحصائيات ${target.user.username}`
                            });

                    return interaction.reply({
                        embeds: [
                            embed
                        ]
                    });
                }


                // ==================================================
                // CLOSE
                // ==================================================

                if (command === "close") {

                    if (!isStaff(member)) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ ليس لديك صلاحية استخدام هذا الأمر."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const ticket =
                        getTicketData(
                            guild.id,
                            interaction.channel.id
                        );

                    if (!ticket) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ هذه القناة ليست تذكرة."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    await closeTicket(
                        interaction.channel,
                        member
                    );

                    await interaction.reply({
                        embeds: [
                            successEmbed(
                                "🔒 تم إغلاق التذكرة",
                                "سيتم حذف التذكرة خلال 3 ثوانٍ."
                            )
                        ]
                    });

                    setTimeout(
                        async () => {
                            try {
                                await interaction.channel.delete(
                                    "Ticket closed"
                                );
                            } catch (error) {
                                console.error(
                                    "❌ خطأ أثناء حذف التذكرة:",
                                    error
                                );
                            }
                        },
                        3000
                    );

                    return;
                }


                // ==================================================
                // DELETE
                // ==================================================

                if (command === "delete") {

                    if (!isStaff(member)) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ ليس لديك صلاحية استخدام هذا الأمر."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const ticket =
                        getTicketData(
                            guild.id,
                            interaction.channel.id
                        );

                    if (!ticket) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ هذه القناة ليست تذكرة."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    await deleteTicket(
                        interaction.channel,
                        member
                    );

                    await interaction.reply({
                        embeds: [
                            successEmbed(
                                "🗑️ حذف التذكرة",
                                "سيتم حذف التذكرة خلال 3 ثوانٍ."
                            )
                        ]
                    });

                    setTimeout(
                        async () => {
                            try {
                                await interaction.channel.delete(
                                    "Ticket deleted"
                                );
                            } catch (error) {
                                console.error(
                                    "❌ خطأ أثناء حذف التذكرة:",
                                    error
                                );
                            }
                        },
                        3000
                    );

                    return;
                }


                // ==================================================
                // SETUP
                // ==================================================

                if (command === "setup") {

                    if (!isOwnerStaff(member)) {
                        return interaction.reply({
                            embeds: [
                                errorEmbed(
                                    "❌ إعدادات البوت متاحة للأونر فقط."
                                )
                            ],
                            ephemeral: true
                        });
                    }

                    const guildData =
                        getGuildData(
                            guild.id
                        );

                    guildData.setupCompleted =
                        true;

                    saveData();

                    return interaction.reply({
                        embeds: [
                            successEmbed(
                                "⚙️ تم تشغيل النظام",
                                "تم تجهيز إعدادات البوت لهذا السيرفر بنجاح."
                            )
                        ]
                    });
                }


                // ==================================================
                // HELP
                // ==================================================

                if (command === "help") {

                    const embed =
                        new EmbedBuilder()
                            .setColor(0x5865F2)
                            .setTitle("🤖 أوامر البوت")
                            .setDescription(
                                [
                                    "### 🛡️ الإدارة",
                                    "`/ban` — حظر عضو",
                                    "`/unban` — فك الحظر",
                                    "`/warn` — تحذير عضو",
                                    "`/timeout` — إعطاء Timeout",
                                    "`/jail` — سجن عضو",
                                    "`/time` — معرفة مدة السجن",
                                    "",
                                    "### 🎫 التذاكر",
                                    "`/close` — إغلاق التذكرة",
                                    "`/delete` — حذف التذكرة",
                                    "",
                                    "### 🏆 النقاط و XP",
                                    "`/points` — عرض النقاط",
                                    "`/xp` — عرض XP",
                                    "`/stats` — الإحصائيات",
                                    "",
                                    "### 💰 الاقتصاد",
                                    "`/balance` — عرض الرصيد",
                                    "`/pay` — تحويل العملات",
                                    "",
                                    "### ⚙️ النظام",
                                    "`/setup` — تجهيز البوت"
                                ].join("\n")
                            )
                            .setFooter({
                                text:
                                    `${guild.name} • نظام المساعدة`
                            });

                    return interaction.reply({
                        embeds: [
                            embed
                        ]
                    });
                }

                return;
            }

// ==================================================
// BUTTONS
// ==================================================

if (interaction.isButton()) {

    const {
        customId
    } = interaction;

    // ==================================================
    // OPEN TICKET
    // ==================================================

    if (
        customId.startsWith("open_ticket")
    ) {

        const guildData =
            getGuildData(guild.id);

        if (!guildData.ticketCategoryId) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "❌ لم يتم تحديد قسم التذاكر."
                    )
                ],
                ephemeral: true
            });
        }

        const existingTicket =
            Object.values(
                data.tickets[guild.id] || {}
            ).find(
                ticket =>
                    ticket.ownerId === member.id &&
                    ticket.status === "open"
            );

        if (existingTicket) {

            const existingChannel =
                guild.channels.cache.get(
                    existingTicket.channelId
                );

            return interaction.reply({
                embeds: [
                    errorEmbed(
                        existingChannel
                            ? `❌ لديك تذكرة مفتوحة بالفعل: ${existingChannel}`
                            : "❌ لديك تذكرة مفتوحة بالفعل."
                    )
                ],
                ephemeral: true
            });
        }

        const category =
            guild.channels.cache.get(
                guildData.ticketCategoryId
            );

        if (
            !category ||
            category.type !== ChannelType.GuildCategory
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "❌ قسم التذاكر المحدد غير موجود."
                    )
                ],
                ephemeral: true
            });
        }

        await interaction.deferReply({
            ephemeral: true
        });

        const safeUsername =
            member.user.username
                .toLowerCase()
                .replace(
                    /[^a-z0-9-_]/g,
                    "-"
                )
                .slice(0, 70);

        const staffRoleIds = [
            ...(guildData.staffRoles?.junior || []),
            ...(guildData.staffRoles?.middle || []),
            ...(guildData.staffRoles?.senior || []),
            ...(guildData.staffRoles?.owner || [])
        ];

        const permissionOverwrites = [
            {
                id: guild.roles.everyone.id,
                deny: [
                    PermissionsBitField.Flags.ViewChannel
                ]
            },
            {
                id: member.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            },
            {
                id: client.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.ManageMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            }
        ];

        for (
            const roleId of staffRoleIds
        ) {

            if (
                guild.roles.cache.has(roleId)
            ) {

                permissionOverwrites.push({
                    id: roleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                });

            }
        }

        const channel =
            await guild.channels.create({
                name:
                    `ticket-${safeUsername}`,

                type:
                    ChannelType.GuildText,

                parent:
                    category.id,

                permissionOverwrites
            });

        if (!data.tickets[guild.id]) {
            data.tickets[guild.id] = {};
        }

        data.tickets[guild.id][channel.id] =
            createTicketObject(
                guild.id,
                channel.id,
                member.id
            );

        saveData();

        const ticketButtons =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_claim"
                        )
                        .setLabel(
                            "استلام التذكرة"
                        )
                        .setEmoji("📥")
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_unclaim"
                        )
                        .setLabel(
                            "إلغاء الاستلام"
                        )
                        .setEmoji("📤")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_close"
                        )
                        .setLabel(
                            "إغلاق التذكرة"
                        )
                        .setEmoji("🔒")
                        .setStyle(
                            ButtonStyle.Danger
                        )
                );

        const ticketEmbed =
            new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(
                    "🎫 تذكرة دعم"
                )
                .setDescription(
                    [
                        `مرحبًا ${member} 👋`,
                        "",
                        "تم إنشاء تذكرتك بنجاح.",
                        "",
                        "📥 يمكن للإدارة استلام التذكرة.",
                        "📤 يمكن للمستلم إلغاء الاستلام.",
                        "🔒 يمكن للإدارة إغلاق التذكرة.",
                        "",
                        "يرجى كتابة مشكلتك بالتفصيل وسيتم الرد عليك قريبًا."
                    ].join("\n")
                );

        await channel.send({
            content: `${member}`,
            embeds: [
                ticketEmbed
            ],
            components: [
                ticketButtons
            ]
        });

        await interaction.editReply({
            embeds: [
                successEmbed(
                    `✅ تم إنشاء التذكرة بنجاح: ${channel}`
                )
            ]
        });

        await sendLog(
            guild,
            "🎫 فتح تذكرة",
            [
                `**العضو:** ${member}`,
                `**التذكرة:** ${channel}`,
                `**القناة:** ${channel.name}`
            ].join("\n"),
            0x57F287
        );

        return;
    }

    // ==================================================
    // CLAIM TICKET
    // ==================================================

    if (
        customId === "ticket_claim"
    ) {

        if (!isStaff(member)) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "❌ هذا الزر مخصص للإدارة فقط."
                    )
                ],
                ephemeral: true
            });
        }

        const ticket =
            getTicketData(
                guild.id,
                interaction.channel.id
            );

        if (!ticket) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "❌ هذه القناة ليست تذكرة."
                    )
                ],
                ephemeral: true
            });
        }

        if (ticket.claimedBy) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        `❌ التذكرة مستلمة بالفعل من <@${ticket.claimedBy}>.`
                    )
                ],
                ephemeral: true
            });
        }

        await interaction.deferReply({
            ephemeral: true
        });

        await claimTicket(
            interaction.channel,
            member
        );

        await interaction.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle(
                        "📥 تم استلام التذكرة"
                    )
                    .setDescription(
                        [
                            `👤 **المستلم:** ${member}`,
                            "",
                            "سيتم متابعة التذكرة من قبل الموظف المستلم.",
                            "يمكن للعضو صاحب التذكرة والموظف المستلم متابعة المحادثة."
                        ].join("\n")
                    )
            ]
        });

        await interaction.editReply({
            embeds: [
                successEmbed(
                    "✅ تم استلام التذكرة بنجاح."
                )
            ]
        });

        return;
    }

    // ==================================================
    // UNCLAIM TICKET
    // ==================================================

    if (
        customId === "ticket_unclaim"
    ) {

        if (!isStaff(member)) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "❌ هذا الزر مخصص للإدارة فقط."
                    )
                ],
                ephemeral: true
            });
        }

        await interaction.deferReply({
            ephemeral: true
        });

        await unclaimTicket(
            interaction.channel,
            member
        );

        await interaction.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xE67E22)
                    .setTitle(
                        "📤 تم إلغاء استلام التذكرة"
                    )
                    .setDescription(
                        `تم إلغاء استلام التذكرة بواسطة ${member}.\n\n📥 يمكن لموظف آخر استلامها الآن.`
                    )
            ]
        });

        await interaction.editReply({
            embeds: [
                successEmbed(
                    "✅ تم إلغاء استلام التذكرة."
                )
            ]
        });

        return;
    }

    // ==================================================
    // CLOSE TICKET BUTTON
    // ==================================================

    if (
        customId === "ticket_close"
    ) {

        const ticket =
            getTicketData(
                guild.id,
                interaction.channel.id
            );

        if (!ticket) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "❌ هذه القناة ليست تذكرة."
                    )
                ],
                ephemeral: true
            });
        }

        if (
            !canManageTicket(
                member,
                ticket
            )
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "❌ لا تملك صلاحية إغلاق هذه التذكرة."
                    )
                ],
                ephemeral: true
            });
        }

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle(
                        "🔒 جاري إغلاق التذكرة"
                    )
                    .setDescription(
                        "سيتم إغلاق التذكرة خلال **3 ثوانٍ**."
                    )
            ]
        });

        await sendLog(
            guild,
            "🔒 إغلاق تذكرة",
            [
                `**التذكرة:** ${interaction.channel}`,
                `**العضو:** <@${ticket.ownerId}>`,
                `**بواسطة:** ${member}`
            ].join("\n"),
            0xED4245
        );

        setTimeout(
            async () => {

                try {

                    await deleteTicket(
                        interaction.channel,
                        member
                    );

                } catch (error) {

                    console.error(
                        "❌ Ticket Close Error:",
                        error
                    );

                }

            },
            3000
        );

        return;
    }

    // ==================================================
    // TICKET RATING
    // ==================================================

    if (
        customId.startsWith(
            "ticket_rating_"
        )
    ) {

        const rating =
            Number(
                customId.replace(
                    "ticket_rating_",
                    ""
                )
            );

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "❌ التقييم غير صالح."
                    )
                ],
                ephemeral: true
            });
        }

        const pending =
            data.pendingRatings[
                member.id
            ];

        if (!pending) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "❌ لا يوجد تقييم معلق لك."
                    )
                ],
                ephemeral: true
            });
        }

        await addTicketRating(
            guild.id,
            pending.ticketId,
            rating
        );

        delete data.pendingRatings[
            member.id
        ];

        saveData();

        return interaction.reply({
            embeds: [
                successEmbed(
                    `⭐ شكرًا لك! تم تسجيل تقييمك: **${rating}/5**`
                )
            ],
            ephemeral: true
        });
    }

    return;
}

// ==================================================
// SELECT MENUS
// ==================================================

if (
    interaction.isStringSelectMenu()
) {

    const {
        customId
    } = interaction;

    // ==================================================
    // TICKET PANEL SELECT
    // ==================================================

    if (
        customId.startsWith(
            "ticket_panel_"
        )
    ) {

        const guildData =
            getGuildData(
                guild.id
            );

        if (!guildData.ticketCategoryId) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "❌ لم يتم تحديد قسم التذاكر."
                    )
                ],
                ephemeral: true
            });
        }

        const existingTicket =
            Object.values(
                data.tickets[guild.id] || {}
            ).find(
                ticket =>
                    ticket.ownerId === member.id &&
                    ticket.status === "open"
            );

        if (existingTicket) {

            const existingChannel =
                guild.channels.cache.get(
                    existingTicket.channelId
                );

            return interaction.reply({
                embeds: [
                    errorEmbed(
                        existingChannel
                            ? `❌ لديك تذكرة مفتوحة بالفعل: ${existingChannel}`
                            : "❌ لديك تذكرة مفتوحة بالفعل."
                    )
                ],
                ephemeral: true
            });
        }

        const category =
            guild.channels.cache.get(
                guildData.ticketCategoryId
            );

        if (
            !category ||
            category.type !== ChannelType.GuildCategory
        ) {
            return interaction.reply({
                embeds: [
                    errorEmbed(
                        "❌ قسم التذاكر المحدد غير موجود."
                    )
                ],
                ephemeral: true
            });
        }

        await interaction.deferReply({
            ephemeral: true
        });

        const selectedValue =
            interaction.values[0];

        const panelId =
            customId.replace(
                "ticket_panel_",
                ""
            );

        const panel =
            guildData.ticketPanels?.[
                panelId
            ];

        const panelName =
            panel?.name ||
            "تذكرة دعم";

        const safeUsername =
            member.user.username
                .toLowerCase()
                .replace(
                    /[^a-z0-9-_]/g,
                    "-"
                )
                .slice(0, 60);

        const staffRoleIds = [
            ...(guildData.staffRoles?.junior || []),
            ...(guildData.staffRoles?.middle || []),
            ...(guildData.staffRoles?.senior || []),
            ...(guildData.staffRoles?.owner || [])
        ];

        const permissionOverwrites = [
            {
                id: guild.roles.everyone.id,
                deny: [
                    PermissionsBitField.Flags.ViewChannel
                ]
            },
            {
                id: member.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            },
            {
                id: client.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.ManageMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            }
        ];

        for (
            const roleId of staffRoleIds
        ) {

            if (
                guild.roles.cache.has(roleId)
            ) {

                permissionOverwrites.push({
                    id: roleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                });

            }
        }

        const channel =
            await guild.channels.create({
                name:
                    `ticket-${safeUsername}`,

                type:
                    ChannelType.GuildText,

                parent:
                    category.id,

                permissionOverwrites
            });

        if (!data.tickets[guild.id]) {
            data.tickets[guild.id] = {};
        }

        data.tickets[guild.id][channel.id] =
            createTicketObject(
                guild.id,
                channel.id,
                member.id
            );

                saveData();

        const ticketButtons =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_claim"
                        )
                        .setLabel(
                            "استلام التذكرة"
                        )
                        .setEmoji("📥")
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_unclaim"
                        )
                        .setLabel(
                            "إلغاء الاستلام"
                        )
                        .setEmoji("📤")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_close"
                        )
                        .setLabel(
                            "إغلاق التذكرة"
                        )
                        .setEmoji("🔒")
                        .setStyle(
                            ButtonStyle.Danger
                        )
                );

        const ticketEmbed =
            new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle("🎫 تذكرة دعم")
                .setDescription(
                    [
                        `مرحباً <@${member.id}> 👋`,
                        "",
                        "تم إنشاء تذكرتك بنجاح.",
                        "",
                        "📥 **استلام التذكرة**",
                        "يقوم أحد أعضاء الإدارة باستلام التذكرة.",
                        "",
                        "📤 **إلغاء الاستلام**",
                        "إلغاء استلام التذكرة والسماح لمشرف آخر باستلامها.",
                        "",
                        "🔒 **إغلاق التذكرة**",
                        "إغلاق التذكرة وحذفها بعد التأكيد.",
                        "",
                        "⚠️ يرجى شرح مشكلتك بالتفصيل وانتظار أحد أعضاء الإدارة."
                    ].join("\n")
                )
                .setFooter({
                    text: `صاحب التذكرة: ${member.user.username}`
                })
                .setTimestamp();

        await ticketChannel.send({
            content: `<@${member.id}>`,
            embeds: [ticketEmbed],
            components: [ticketButtons]
        });

        await interaction.editReply({
            content:
                `✅ تم إنشاء تذكرتك بنجاح: ${ticketChannel}`
        });

        await sendLog(
            guild,
            "🎫 إنشاء تذكرة",
            [
                `**العضو:** ${member}`,
                `**القناة:** ${ticketChannel}`,
                `**بواسطة:** ${member}`
            ].join("\n"),
            0x57F287
        );

        return;
    }

    // ==================================================
    // CLAIM TICKET
    // ==================================================

    if (customId === "ticket_claim") {

        if (!interaction.guild) {
            return interaction.reply({
                content:
                    "❌ هذا الزر يعمل داخل السيرفر فقط.",
                ephemeral: true
            });
        }

        const guild =
            interaction.guild;

        const member =
            interaction.member;

        if (!isStaff(member)) {
            return interaction.reply({
                content:
                    "❌ ليس لديك صلاحية لاستلام التذاكر.",
                ephemeral: true
            });
        }

        const ticket =
            getTicketData(
                guild.id,
                interaction.channel.id
            );

        if (!ticket) {
            return interaction.reply({
                content:
                    "❌ هذه القناة ليست تذكرة.",
                ephemeral: true
            });
        }

        if (ticket.status !== "open") {
            return interaction.reply({
                content:
                    "❌ هذه التذكرة مغلقة بالفعل.",
                ephemeral: true
            });
        }

        if (ticket.claimedBy) {
            return interaction.reply({
                content:
                    `❌ التذكرة مستلمة بالفعل بواسطة <@${ticket.claimedBy}>.`,
                ephemeral: true
            });
        }

        try {

            await claimTicket(
                interaction.channel,
                member
            );

            const embed =
                new EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle("📥 تم استلام التذكرة")
                    .setDescription(
                        [
                            `👤 **المستلم:** ${member}`,
                            "",
                            "يمكن الآن متابعة التذكرة من قبل المستلم.",
                            "",
                            "📤 يمكن للمستلم إلغاء الاستلام إذا أراد."
                        ].join("\n")
                    )
                    .setTimestamp();

            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {

            return interaction.reply({
                content:
                    `❌ ${error.message}`,
                ephemeral: true
            });
        }

        return;
    }

    // ==================================================
    // UNCLAIM TICKET
    // ==================================================

    if (customId === "ticket_unclaim") {

        if (!interaction.guild) {
            return interaction.reply({
                content:
                    "❌ هذا الزر يعمل داخل السيرفر فقط.",
                ephemeral: true
            });
        }

        const guild =
            interaction.guild;

        const member =
            interaction.member;

        if (!isStaff(member)) {
            return interaction.reply({
                content:
                    "❌ ليس لديك صلاحية لإلغاء استلام التذكرة.",
                ephemeral: true
            });
        }

        const ticket =
            getTicketData(
                guild.id,
                interaction.channel.id
            );

        if (!ticket) {
            return interaction.reply({
                content:
                    "❌ هذه القناة ليست تذكرة.",
                ephemeral: true
            });
        }

        if (!ticket.claimedBy) {
            return interaction.reply({
                content:
                    "❌ التذكرة غير مستلمة حالياً.",
                ephemeral: true
            });
        }

        try {

            await unclaimTicket(
                interaction.channel,
                member
            );

            const embed =
                new EmbedBuilder()
                    .setColor(0xE67E22)
                    .setTitle("📤 تم إلغاء استلام التذكرة")
                    .setDescription(
                        [
                            `**بواسطة:** ${member}`,
                            "",
                            "أصبحت التذكرة متاحة مرة أخرى لأعضاء الإدارة المؤهلين لاستلامها."
                        ].join("\n")
                    )
                    .setTimestamp();

            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {

            return interaction.reply({
                content:
                    `❌ ${error.message}`,
                ephemeral: true
            });
        }

        return;
    }

    // ==================================================
    // CLOSE TICKET
    // ==================================================

    if (customId === "ticket_close") {

        if (!interaction.guild) {
            return interaction.reply({
                content:
                    "❌ هذا الزر يعمل داخل السيرفر فقط.",
                ephemeral: true
            });
        }

        const guild =
            interaction.guild;

        const member =
            interaction.member;

        const channel =
            interaction.channel;

        const ticket =
            getTicketData(
                guild.id,
                channel.id
            );

        if (!ticket) {
            return interaction.reply({
                content:
                    "❌ هذه القناة ليست تذكرة.",
                ephemeral: true
            });
        }

        if (
            !canManageTicket(
                member,
                ticket
            )
        ) {
            return interaction.reply({
                content:
                    "❌ لا يمكنك إغلاق هذه التذكرة.",
                ephemeral: true
            });
        }

        if (ticket.status === "closed") {
            return interaction.reply({
                content:
                    "❌ هذه التذكرة قيد الإغلاق بالفعل.",
                ephemeral: true
            });
        }

        ticket.status = "closed";
        ticket.closedAt = Date.now();
        ticket.closedBy = member.id;

        saveData();

        await interaction.reply({
            content:
                "🔒 سيتم إغلاق التذكرة وحذفها خلال **3 ثوانٍ**..."
        });

        await sendLog(
            guild,
            "🔒 إغلاق تذكرة",
            [
                `**القناة:** ${channel}`,
                `**صاحب التذكرة:** <@${ticket.ownerId}>`,
                `**بواسطة:** ${member}`
            ].join("\n"),
            0xED4245
        );

        setTimeout(async () => {

            try {

                await deleteTicket(
                    channel,
                    member
                );

            } catch (error) {

                console.error(
                    "Ticket delete error:",
                    error
                );
            }

        }, 3000);

        return;
    }

    // ==================================================
    // TICKET RATING
    // ==================================================

    if (
        customId.startsWith(
            "ticket_rating_"
        )
    ) {

        const rating =
            Number(
                customId.replace(
                    "ticket_rating_",
                    ""
                )
            );

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            return interaction.reply({
                content:
                    "❌ التقييم غير صالح.",
                ephemeral: true
            });
        }

        const pending =
            data.pendingRatings?.[
                interaction.user.id
            ];

        if (!pending) {
            return interaction.reply({
                content:
                    "❌ لا يوجد تقييم معلق لك.",
                ephemeral: true
            });
        }

        try {

            await addTicketRating(
                interaction.guild,
                pending.ticketId,
                interaction.user.id,
                rating
            );

            delete data.pendingRatings[
                interaction.user.id
            ];

            saveData();

            const stars =
                "⭐".repeat(rating);

            await interaction.reply({
                content:
                    `✅ تم تسجيل تقييمك بنجاح ${stars}\nشكراً لك على تقييم الخدمة ❤️`,
                ephemeral: true
            });

        } catch (error) {

            return interaction.reply({
                content:
                    `❌ ${error.message}`,
                ephemeral: true
            });
        }

        return;
    }
}

// ==================================================
// SELECT MENUS
// ==================================================

if (interaction.isStringSelectMenu()) {

    const {
        customId
    } = interaction;

    // ==================================================
    // TICKET PANEL
    // ==================================================

    if (
        customId.startsWith(
            "ticket_panel_"
        )
    ) {

        if (!interaction.guild) {
            return interaction.reply({
                content:
                    "❌ هذا النظام يعمل داخل السيرفر فقط.",
                ephemeral: true
            });
        }

        const guild =
            interaction.guild;

        const member =
            interaction.member;

        const guildData =
            getGuildData(
                guild.id
            );

        const selectedValue =
            interaction.values?.[0];

        if (!selectedValue) {
            return interaction.reply({
                content:
                    "❌ لم يتم اختيار نوع التذكرة.",
                ephemeral: true
            });
        }

        if (
            !guildData.ticketCategoryId
        ) {
            return interaction.reply({
                content:
                    "❌ لم يتم إعداد قسم التذاكر بعد.",
                ephemeral: true
            });
        }

        const category =
            guild.channels.cache.get(
                guildData.ticketCategoryId
            );

        if (
            !category ||
            category.type !==
                ChannelType.GuildCategory
        ) {
            return interaction.reply({
                content:
                    "❌ قسم التذاكر غير موجود أو غير صالح.",
                ephemeral: true
            });
        }

        const existingTicket =
            Object.values(
                data.tickets[guild.id] || {}
            ).find(
                ticket =>
                    ticket.ownerId === member.id &&
                    ticket.status === "open"
            );

        if (existingTicket) {

            const existingChannel =
                guild.channels.cache.get(
                    existingTicket.channelId
                );

            if (existingChannel) {
                return interaction.reply({
                    content:
                        `❌ لديك تذكرة مفتوحة بالفعل: ${existingChannel}`,
                    ephemeral: true
                });
            }
        }

        const panelId =
            customId.replace(
                "ticket_panel_",
                ""
            );

        const panel =
            guildData.ticketPanels?.[
                panelId
            ];

        const panelName =
            panel?.name ||
            selectedValue ||
            "دعم";

        await interaction.deferReply({
            ephemeral: true
        });

        const safeName =
            member.user.username
                .toLowerCase()
                .replace(
                    /[^a-z0-9-_]/g,
                    ""
                )
                .slice(0, 20) ||
            member.id.slice(-6);

        const channelName =
            `ticket-${safeName}`;

        const staffRoleIds = [
            ...(guildData.staffRoles?.junior || []),
            ...(guildData.staffRoles?.middle || []),
            ...(guildData.staffRoles?.senior || []),
            ...(guildData.staffRoles?.owner || [])
        ];

        const overwrites = [

            {
                id: guild.roles.everyone.id,
                deny: [
                    PermissionsBitField.Flags.ViewChannel
                ]
            },

            {
                id: member.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.AttachFiles
                ]
            },

            {
                id: guild.members.me.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.ManageChannels,
                    PermissionsBitField.Flags.ManageMessages
                ]
            }
        ];

        for (
            const roleId of
            [...new Set(staffRoleIds)]
        ) {

            overwrites.push({
                id: roleId,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            });
        }

        let ticketChannel;

        try {

            ticketChannel =
                await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: category.id,
                    permissionOverwrites:
                        overwrites
                });

        } catch (error) {

            console.error(
                "Ticket panel create error:",
                error
            );

            return interaction.editReply({
                content:
                    "❌ حدث خطأ أثناء إنشاء التذكرة. تأكد أن البوت لديه صلاحية إدارة القنوات."
            });
        }

        if (!data.tickets[guild.id]) {
            data.tickets[guild.id] = {};
        }

        data.tickets[guild.id][
            ticketChannel.id
        ] =
            createTicketObject(
                guild.id,
                ticketChannel.id,
                member.id
            );

        data.tickets[guild.id][
            ticketChannel.id
        ].panelId = panelId;

        data.tickets[guild.id][
            ticketChannel.id
        ].panelName = panelName;

        saveData();

        const ticketButtons =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_claim"
                        )
                        .setLabel(
                            "استلام التذكرة"
                        )
                        .setEmoji("📥")
                        .setStyle(
                            ButtonStyle.Primary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_unclaim"
                        )
                        .setLabel(
                            "إلغاء الاستلام"
                        )
                        .setEmoji("📤")
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            "ticket_close"
                        )
                        .setLabel(
                            "إغلاق التذكرة"
                        )
                        .setEmoji("🔒")
                        .setStyle(
                            ButtonStyle.Danger
                        )
                );

        const ticketEmbed =
    new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(
            `🎫 ${panelName}`
        )
        .setDescription(
            [
                `مرحباً <@${member.id}> 👋`,
                "",
                "تم إنشاء تذكرتك بنجاح.",
                "",
                "📥 **استلام التذكرة**",
                "يقوم أحد أعضاء الإدارة باستلام التذكرة.",
                "",
                "📤 **إلغاء الاستلام**",
                "إلغاء استلام التذكرة.",
                "",
                "🔒 **إغلاق التذكرة**",
                "إغلاق التذكرة وحذفها.",
                "",
                "⚠️ يرجى شرح طلبك بالتفصيل وانتظار الإدارة."
            ].join("\n")
        )
        .setFooter({
            text:
                `صاحب التذكرة: ${member.user.username}`
        })
        .setTimestamp();

await ticketChannel.send({
    content:
        `<@${member.id}>`,
    embeds: [
        ticketEmbed
    ],
    components: [
        ticketButtons
    ]
});

await interaction.editReply({
    content:
        `✅ تم إنشاء تذكرتك بنجاح: ${ticketChannel}`
});

await sendLog(
    guild,
    "🎫 إنشاء تذكرة من لوحة",
    [
        `**نوع التذكرة:** ${panelName}`,
        `**العضو:** ${member}`,
        `**القناة:** ${ticketChannel}`
    ].join("\n"),
    0x57F287
);

return;
    }

    return;
}

// ==================================================
// INTERACTION ERROR HANDLER
// ==================================================

} catch (error) {

    console.error(
        "Interaction Error:",
        error
    );

    try {

        if (
            interaction.replied ||
            interaction.deferred
        ) {

            await interaction.followUp({
                content:
                    "❌ حدث خطأ غير متوقع أثناء تنفيذ العملية.",
                ephemeral: true
            });

        } else {

            await interaction.reply({
                content:
                    "❌ حدث خطأ غير متوقع أثناء تنفيذ العملية.",
                ephemeral: true
            });
        }

    } catch (replyError) {

        console.error(
            "Error while replying:",
            replyError
        );
    }
}

});

// ==================================================
// MESSAGE CREATE
// ==================================================

client.on(
    "messageCreate",
    async message => {

        try {

            if (!message.guild) return;

            if (message.author.bot) return;

            const guild =
                message.guild;

            const member =
                message.member;

            if (!member) return;

            const guildData =
                getGuildData(
                    guild.id
                );

            // ==================================================
            // XP
            // ==================================================

            addXP(
                guild.id,
                member.id
            );

            // ==================================================
            // ANTI SPAM
            // ==================================================

            if (
                guildData.antiSpam?.enabled
            ) {

                const key =
                    getSpamKey(
                        guild.id,
                        member.id
                    );

                const now =
                    Date.now();

                let messages =
                    spamTracker.get(key) || [];

                messages =
                    messages.filter(
                        timestamp =>
                            now - timestamp <=
                            guildData.antiSpam.timeWindow
                    );

                messages.push(now);

                spamTracker.set(
                    key,
                    messages
                );

                if (
                    messages.length >=
                    guildData.antiSpam.maxMessages
                ) {

                    if (
                        guildData.antiSpam.deleteMessages
                    ) {

                        try {

                            await message.delete();

                        } catch (error) {

                            console.error(
                                "Spam delete error:",
                                error
                            );
                        }
                    }

                    spamTracker.set(
                        key,
                        []
                    );

                    const warningMessage =
                        await message.channel
                            .send({
                                content:
                                    `⚠️ ${member} كفاية سبام! لا ترسل رسائل متكررة بشكل مزعج.`
                            })
                            .catch(
                                () => null
                            );

                    if (warningMessage) {

                        setTimeout(
                            async () => {

                                try {

                                    await warningMessage.delete();

                                } catch {}
                            },
                            5000
                        );
                    }

                    await sendLog(
                        guild,
                        "🚨 Anti-Spam",
                        [
                            `**العضو:** ${member}`,
                            `**القناة:** ${message.channel}`,
                            `**عدد الرسائل:** ${guildData.antiSpam.maxMessages}`
                        ].join("\n"),
                        0xED4245
                    );

                    return;
                }
            }

            // ==================================================
            // TICKET MESSAGE PERMISSIONS
            // ==================================================

            const ticket =
                getTicketData(
                    guild.id,
                    message.channel.id
                );

            if (ticket) {

                if (
                    ticket.status !== "open"
                ) {

                    try {

                        await message.delete();

                    } catch {}

                    return;
                }

                const allowed =
                    canWriteInTicket(
                        member,
                        ticket
                    );

                if (!allowed) {

                    try {

                        await message.delete();

                    } catch {}

                    const warning =
                        await message.channel
                            .send({
                                content:
                                    `🔒 ${member} لا يمكنك الكتابة في هذه التذكرة حالياً.`
                            })
                            .catch(
                                () => null
                            );

                    if (warning) {

                        setTimeout(
                            async () => {

                                try {

                                    await warning.delete();

                                } catch {}
                            },
                            3000
                        );
                    }

                    return;
                }
            }

        } catch (error) {

            console.error(
                "messageCreate Error:",
                error
            );
        }
    }
);

// ==================================================
// MEMBER JOIN
// ==================================================

client.on(
    "guildMemberAdd",
    async member => {

        try {

            const guild =
                member.guild;

            const guildData =
                getGuildData(
                    guild.id
                );

            if (
                !guildData.welcomeEnabled
            ) return;

            if (
                !guildData.welcomeChannelId
            ) return;

            const channel =
                guild.channels.cache.get(
                    guildData.welcomeChannelId
                );

            if (!channel) return;

            const embed =
                new EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle(
                        "👋 عضو جديد!"
                    )
                    .setDescription(
                        [
                            `مرحباً ${member} 👋`,
                            "",
                            `نورت السيرفر **${guild.name}** ❤️`,
                            "",
                            `👥 أنت العضو رقم **${guild.memberCount}**`
                        ].join("\n")
                    )
                    .setThumbnail(
                        member.user.displayAvatarURL({
                            size: 256
                        })
                    )
                    .setFooter({
                        text:
                            guild.name
                    })
                    .setTimestamp();

            await channel.send({
                embeds: [
                    embed
                ]
            });

            await sendLog(
                guild,
                "👋 دخول عضو",
                [
                    `**العضو:** ${member}`,
                    `**اسم الحساب:** ${member.user.username}`,
                    `**عدد الأعضاء:** ${guild.memberCount}`
                ].join("\n"),
                0x57F287
            );

        } catch (error) {

            console.error(
                "guildMemberAdd Error:",
                error
            );
        }
    }
);

// ==================================================
// MEMBER LEAVE
// ==================================================

client.on(
    "guildMemberRemove",
    async member => {

        try {

            const guild =
                member.guild;

            const guildData =
                getGuildData(
                    guild.id
                );

            if (
                !guildData.goodbyeEnabled
            ) return;

            if (
                !guildData.goodbyeChannelId
            ) return;

            const channel =
                guild.channels.cache.get(
                    guildData.goodbyeChannelId
                );

            if (!channel) return;

            const embed =
                new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle(
                        "👋 عضو غادر السيرفر"
                    )
                    .setDescription(
                        [
                            `غادر السيرفر **${guild.name}**.`,
                            "",
                            `👤 العضو: **${member.user.username}**`,
                            `🆔 ID: \`${member.id}\``,
                            "",
                            `👥 عدد الأعضاء الآن: **${guild.memberCount}**`
                        ].join("\n")
                    )
                    .setThumbnail(
                        member.user.displayAvatarURL({
                            size: 256
                        })
                    )
                    .setFooter({
                        text:
                            guild.name
                    })
                    .setTimestamp();

            await channel.send({
                embeds: [
                    embed
                ]
            });

            await sendLog(
                guild,
                "👋 خروج عضو",
                [
                    `**العضو:** ${member.user.username}`,
                    `**ID:** ${member.id}`,
                    `**عدد الأعضاء:** ${guild.memberCount}`
                ].join("\n"),
                0xED4245
            );

        } catch (error) {

            console.error(
                "guildMemberRemove Error:",
                error
            );
        }
    }
);

// ==================================================
// CHANNEL DELETE
// ==================================================

client.on(
    "channelDelete",
    async channel => {

        try {

            if (!channel.guild) return;

            const tickets =
                data.tickets[
                    channel.guild.id
                ];

            if (!tickets) return;

            if (
                tickets[channel.id]
            ) {

                delete tickets[
                    channel.id
                ];

                saveData();
            }

        } catch (error) {

            console.error(
                "channelDelete Error:",
                error
            );
        }
    }
);

// ==================================================
// GUILD CREATE
// ==================================================

client.on(
    "guildCreate",
    async guild => {

        try {

            getGuildData(
                guild.id
            );

            saveData();

            console.log(
                `✅ Joined guild: ${guild.name} (${guild.id})`
            );

        } catch (error) {

            console.error(
                "guildCreate Error:",
                error
            );
        }
    }
);

// ==================================================
// GUILD DELETE
// ==================================================

client.on(
    "guildDelete",
    async guild => {

        try {

            delete data.guilds[
                guild.id
            ];

            saveData();

            console.log(
                `❌ Left guild: ${guild.name} (${guild.id})`
            );

        } catch (error) {

            console.error(
                "guildDelete Error:",
                error
            );
        }
    }
);

// ==================================================
// AUTO SAVE
// ==================================================

setInterval(
    () => {

        try {

            saveData();

        } catch (error) {

            console.error(
                "Auto save error:",
                error
            );
        }

    },
    60 * 1000
);

// ==================================================
// CLEANUP
// ==================================================

setInterval(
    () => {

        try {

            cleanExpiredWarnings();

            cleanExpiredJails();

            saveData();

        } catch (error) {

            console.error(
                "Cleanup error:",
                error
            );
        }

    },
    30 * 1000
);

// ==================================================
// FINAL LOGIN
// ==================================================

client.login(
    TOKEN
)
.then(
    () => {

        console.log(
            "✅ Discord login successful."
        );

    }
)
.catch(
    error => {

        console.error(
            "❌ Discord login failed:",
            error
        );

        process.exit(1);
    }
);
