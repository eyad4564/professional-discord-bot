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

    // Normalize data created by older versions of the bot.
    const guildData = data.guilds[guildId];

    if (typeof guildData.currencyEnabled !== "boolean") {
        guildData.currencyEnabled = true;
    }

    guildData.currencyName ||= "Coins";
    guildData.currencySymbol ||= "💰";
    guildData.ticketPanels ||= {};

    if (!guildData.staffRoles) {
        guildData.staffRoles = {
            junior: [...STAFF_ROLES.junior],
            middle: [...STAFF_ROLES.middle],
            senior: [...STAFF_ROLES.senior],
            owner: [...STAFF_ROLES.owner]
        };
    }

    return guildData;
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

    timeout: 2,

    jail: 5,

    ban: 10,

    ticketClaim: 2,

    ticketClose: 1,

    message: 1

};
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
   COINS / PAY
========================================================= */

function getBalance(guildId, userId) {

    const user = getUserData(
        guildId,
        userId
    );

    return Number(user.coins || 0);
}

function addCoins(
    guildId,
    userId,
    amount
) {

    amount = Number(amount);

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return false;
    }

    amount = Math.floor(amount);

    const user =
        getUserData(
            guildId,
            userId
        );

    user.coins =
        Math.floor(
            Number(user.coins || 0)
        ) + amount;

    if (!data.pay.balances[guildId]) {
        data.pay.balances[guildId] = {};
    }

    data.pay.balances[guildId][userId] =
        user.coins;

    saveData();

    return true;
}

function removeCoins(
    guildId,
    userId,
    amount
) {

    amount = Number(amount);

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return false;
    }

    amount = Math.floor(amount);

    const user =
        getUserData(
            guildId,
            userId
        );

    const current =
        Math.floor(
            Number(user.coins || 0)
        );

    if (amount > current) {
        return false;
    }

    user.coins =
        current - amount;

    if (!data.pay.balances[guildId]) {
        data.pay.balances[guildId] = {};
    }

    data.pay.balances[guildId][userId] =
        user.coins;

    saveData();

    return true;
}

/* =========================================================
   TIME PARSER
========================================================= */

function parseDuration(input) {

    if (!input) {
        return null;
    }

    const value =
        String(input)
            .trim()
            .toLowerCase();

    const match =
        value.match(
            /^(\d+)\s*(s|m|h|d|w)$/
        );

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

    if (
        !ms ||
        ms <= 0
    ) {
        return "غير محددة";
    }

    let seconds =
        Math.floor(ms / 1000);

    const weeks =
        Math.floor(
            seconds / 604800
        );

    seconds %= 604800;

    const days =
        Math.floor(
            seconds / 86400
        );

    seconds %= 86400;

    const hours =
        Math.floor(
            seconds / 3600
        );

    seconds %= 3600;

    const minutes =
        Math.floor(
            seconds / 60
        );

    seconds %= 60;

    const parts = [];

    if (weeks) {
        parts.push(
            `${weeks} أسبوع`
        );
    }

    if (days) {
        parts.push(
            `${days} يوم`
        );
    }

    if (hours) {
        parts.push(
            `${hours} ساعة`
        );
    }

    if (minutes) {
        parts.push(
            `${minutes} دقيقة`
        );
    }

    if (seconds) {
        parts.push(
            `${seconds} ثانية`
        );
    }

    return (
        parts.join(" و ") ||
        "0 ثانية"
    );
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
            getGuildData(
                guild.id
            );

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
   EMBEDS
========================================================= */

function errorEmbed(message) {

    return new EmbedBuilder()

        .setColor(
            0xED4245
        )

        .setDescription(
            `❌ ${message}`
        );
}

function successEmbed(
    title,
    description = null
) {

    const embed =
        new EmbedBuilder()
            .setColor(
                0x57F287
            );

    if (
        description !== null &&
        description !== undefined
    ) {

        embed
            .setTitle(
                `✅ ${title}`
            )
            .setDescription(
                String(description)
            );

    } else {

        embed.setDescription(
            `✅ ${title}`
        );

    }

    return embed;
}

/* =========================================================
   STAFF CHECK
========================================================= */

function checkStaffMessage(message) {

    if (
        !message.guild
    ) {
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

    const id =
        String(value)
            .replace(
                /[<@!>]/g,
                ""
            );

    try {

        return await guild.members.fetch(
            id
        );

    } catch {

        return null;
    }
}

/* =========================================================
   BAN
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
        `**العضو:** ${target.user.tag}\n` +
        `**بواسطة:** ${actor.user.tag}\n` +
        `**السبب:** ${reason}`,
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
            `**العضو:** ${user.tag}\n` +
            `**بواسطة:** ${actor.user.tag}\n` +
            `**السبب:** ${reason}`,
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

    if (
        !data.warnings[guildId]
    ) {

        data.warnings[guildId] = {};

    }

    if (
        !data.warnings[guildId][userId]
    ) {

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

        .setDescription(
            "حظر عضو من السيرفر"
        )

        .addUserOption(option =>
            option

                .setName("member")

                .setDescription(
                    "العضو المراد حظره"
                )

                .setRequired(true)
        )

        .addStringOption(option =>
            option

                .setName("reason")

                .setDescription(
                    "سبب الحظر"
                )

                .setRequired(false)
        ),

    /* =========================
       UNBAN
    ========================= */

    new SlashCommandBuilder()

        .setName("unban")

        .setDescription(
            "إلغاء حظر عضو"
        )

        .addStringOption(option =>
            option

                .setName("userid")

                .setDescription(
                    "ID العضو"
                )

                .setRequired(true)
        )

        .addStringOption(option =>
            option

                .setName("reason")

                .setDescription(
                    "سبب إلغاء الحظر"
                )

                .setRequired(false)
        ),

    /* =========================
       WARN
    ========================= */

    new SlashCommandBuilder()

        .setName("warn")

        .setDescription(
            "إعطاء تحذير لعضو"
        )

        .addUserOption(option =>
            option

                .setName("member")

                .setDescription(
                    "العضو"
                )

                .setRequired(true)
        )

        .addStringOption(option =>
            option

                .setName("reason")

                .setDescription(
                    "سبب التحذير"
                )

                .setRequired(true)
        )

        .addStringOption(option =>
            option

                .setName("duration")

                .setDescription(
                    "المدة مثل 30m أو 2h أو 7d"
                )

                .setRequired(true)
        ),

    /* =========================
       TIMEOUT
    ========================= */

    new SlashCommandBuilder()

        .setName("timeout")

        .setDescription(
            "إعطاء تايم أوت لعضو"
        )

        .addUserOption(option =>
            option

                .setName("member")

                .setDescription(
                    "العضو"
                )

                .setRequired(true)
        )

        .addStringOption(option =>
            option

                .setName("reason")

                .setDescription(
                    "سبب التايم أوت"
                )

                .setRequired(true)
        )

        .addStringOption(option =>
            option

                .setName("duration")

                .setDescription(
                    "المدة مثل 10m أو 1h أو 1d"
                )

                .setRequired(true)
        ),

    /* =========================
       JAIL
    ========================= */

    new SlashCommandBuilder()

        .setName("jail")

        .setDescription(
            "سجن عضو"
        )

        .addUserOption(option =>
            option

                .setName("member")

                .setDescription(
                    "العضو"
                )

                .setRequired(true)
        )

        .addStringOption(option =>
            option

                .setName("reason")

                .setDescription(
                    "سبب السجن"
                )

                .setRequired(true)
        )

        .addStringOption(option =>
            option

                .setName("duration")

                .setDescription(
                    "مدة السجن مثل 30m أو 1h أو 1d"
                )

                .setRequired(true)
        ),

    /* =========================
       TIME
    ========================= */

    new SlashCommandBuilder()

        .setName("time")

        .setDescription(
            "عرض معلومات السجن والوقت المتبقي"
        ),

    /* =========================
       CLOSE
    ========================= */

    new SlashCommandBuilder()

        .setName("close")

        .setDescription(
            "إغلاق التذكرة الحالية"
        ),

    /* =========================
       DELETE
    ========================= */

    new SlashCommandBuilder()

        .setName("delete")

        .setDescription(
            "حذف التذكرة الحالية"
        ),

    /* =========================
       POINTS
    ========================= */

    new SlashCommandBuilder()

        .setName("points")

        .setDescription(
            "عرض نقاط وإحصائيات عضو"
        )

        .addUserOption(option =>
            option

                .setName("member")

                .setDescription(
                    "العضو"
                )

                .setRequired(false)
        ),

    /* =========================
       XP
    ========================= */

    new SlashCommandBuilder()

        .setName("xp")

        .setDescription(
            "عرض XP عضو"
        )

        .addUserOption(option =>
            option

                .setName("member")

                .setDescription(
                    "العضو"
                )

                .setRequired(false)
        ),

    /* =========================
       BALANCE
    ========================= */

    new SlashCommandBuilder()

        .setName("balance")

        .setDescription(
            "عرض رصيد العملات"
        )

        .addUserOption(option =>
            option

                .setName("member")

                .setDescription(
                    "العضو"
                )

                .setRequired(false)
        ),

    /* =========================
       PAY
    ========================= */

    new SlashCommandBuilder()

        .setName("pay")

        .setDescription(
            "تحويل عملات إلى عضو"
        )

        .addUserOption(option =>
            option

                .setName("member")

                .setDescription(
                    "العضو الذي سيستلم العملات"
                )

                .setRequired(true)
        )

        .addIntegerOption(option =>
            option

                .setName("amount")

                .setDescription(
                    "عدد العملات"
                )

                .setMinValue(1)

                .setRequired(true)
        ),

    /* =========================
       SETUP
    ========================= */

    new SlashCommandBuilder()

        .setName("setup")

        .setDescription(
            "فتح لوحة إعدادات البوت للسيرفر"
        ),

    /* =========================
       ADD COINS
    ========================= */

    new SlashCommandBuilder()

        .setName("addcoins")

        .setDescription(
            "إضافة عملات لعضو"
        )

        .addUserOption(option =>
            option

                .setName("member")

                .setDescription(
                    "العضو"
                )

                .setRequired(true)
        )

        .addIntegerOption(option =>
            option

                .setName("amount")

                .setDescription(
                    "عدد العملات"
                )

                .setMinValue(1)

                .setRequired(true)
        ),

    /* =========================
       REMOVE COINS
    ========================= */

    new SlashCommandBuilder()

        .setName("removecoins")

        .setDescription(
            "خصم عملات من عضو"
        )

        .addUserOption(option =>
            option

                .setName("member")

                .setDescription(
                    "العضو"
                )

                .setRequired(true)
        )

        .addIntegerOption(option =>
            option

                .setName("amount")

                .setDescription(
                    "عدد العملات"
                )

                .setMinValue(1)

                .setRequired(true)
        ),

    /* =========================
       SET COINS
    ========================= */

    new SlashCommandBuilder()

        .setName("setcoins")

        .setDescription(
            "تحديد رصيد عضو"
        )

        .addUserOption(option =>
            option

                .setName("member")

                .setDescription(
                    "العضو"
                )

                .setRequired(true)
        )

        .addIntegerOption(option =>
            option

                .setName("amount")

                .setDescription(
                    "الرصيد الجديد"
                )

                .setMinValue(0)

                .setRequired(true)
        ),

    /* =========================
       TICKET PANEL
    ========================= */

    new SlashCommandBuilder()

        .setName("panel")

        .setDescription(
            "إنشاء لوحة تذاكر"
        )

        .addChannelOption(option =>
            option

                .setName("category")

                .setDescription(
                    "قسم التذاكر"
                )

                .addChannelTypes(
                    ChannelType.GuildCategory
                )

                .setRequired(true)
        )

        .addStringOption(option =>
            option

                .setName("title")

                .setDescription(
                    "عنوان لوحة التذاكر"
                )

                .setMaxLength(80)

                .setRequired(false)
        ),

    /* =========================
       STATS
    ========================= */

    new SlashCommandBuilder()

        .setName("stats")

        .setDescription(
            "عرض إحصائيات عضو"
        )

        .addUserOption(option =>
            option

                .setName("member")

                .setDescription(
                    "العضو"
                )

                .setRequired(false)
        ),

    /* =========================
       HELP
    ========================= */

    new SlashCommandBuilder()

        .setName("help")

        .setDescription(
            "عرض جميع أوامر ومميزات البوت"
        )

].map(
    command => command.toJSON()
);


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

client.once(
    "ready",
    async () => {

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
                `👑 Bot Owner ID: ${
                    APPLICATION_OWNER_ID ||
                    "غير معروف"
                }`
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
                    name:
                        `${client.guilds.cache.size} Servers`,

                    type:
                        ActivityType.Watching
                }

            ],

            status: "online"

        });

        await registerSlashCommands();

        console.log(
            `🌐 البوت يعمل في ${
                client.guilds.cache.size
            } سيرفر.`
        );

    }
);
