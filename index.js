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
   CONFIG
========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
    console.error(
        "❌ DISCORD_TOKEN غير موجود في Railway Environment Variables."
    );
    process.exit(1);
}

const PREFIX = "$";

let APPLICATION_OWNER_ID = null;

/* =========================================================
   DEFAULT STAFF ROLES
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
    0 = Member
    1 = Junior
    2 = Middle
    3 = Senior
    4 = Owner
*/

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

const DATA_FILE = path.join(
    __dirname,
    "data.json"
);

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

let data = {
    ...DEFAULT_DATA
};

/* =========================================================
   LOAD DATA
========================================================= */

function loadData() {

    try {

        if (!fs.existsSync(DATA_FILE)) {

            data = {
                ...DEFAULT_DATA,
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

            saveData();

            return;
        }

        const raw =
            fs.readFileSync(
                DATA_FILE,
                "utf8"
            );

        const parsed =
            JSON.parse(raw);

        data = {

            ...DEFAULT_DATA,

            ...parsed,

            guilds:
                parsed.guilds || {},

            users:
                parsed.users || {},

            warnings:
                parsed.warnings || {},

            jails:
                parsed.jails || {},

            tickets:
                parsed.tickets || {},

            ticketPanels:
                parsed.ticketPanels || {},

            ratings:
                parsed.ratings || {},

            pendingRatings:
                parsed.pendingRatings || {},

            stats:
                parsed.stats || {},

            pay: {
                balances:
                    parsed.pay?.balances || {},

                enabled:
                    parsed.pay?.enabled || {}
            }
        };

    } catch (error) {

        console.error(
            "❌ خطأ أثناء قراءة data.json:",
            error
        );

        data = {
            ...DEFAULT_DATA,
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

        saveData();
    }
}

/* =========================================================
   SAVE DATA
========================================================= */

function saveData() {

    try {

        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(
                data,
                null,
                2
            ),
            "utf8"
        );

    } catch (error) {

        console.error(
            "❌ فشل حفظ البيانات:",
            error
        );
    }
}

loadData();

/* =========================================================
   GUILD DEFAULT DATA
========================================================= */

function createDefaultGuildData() {

    return {

        setupCompleted: false,

        ticketCategoryId: null,

        jailRoleId: null,

        logsChannelId: null,

        welcomeChannelId: null,

        goodbyeChannelId: null,

        welcomeEnabled: false,

        goodbyeEnabled: false,

        currencyEnabled: true,

        currencyName: "Coins",

        currencySymbol: "💰",

        staffRoles: {

            junior: [
                ...STAFF_ROLES.junior
            ],

            middle: [
                ...STAFF_ROLES.middle
            ],

            senior: [
                ...STAFF_ROLES.senior
            ],

            owner: [
                ...STAFF_ROLES.owner
            ]
        },

        ticketPanels: {},

        antiSpam: {

            enabled: true,

            maxMessages: 5,

            timeWindow: 5000,

            deleteMessages: true
        }
    };
}

/* =========================================================
   GET GUILD DATA
========================================================= */

function getGuildData(guildId) {

    if (!data.guilds[guildId]) {

        data.guilds[guildId] =
            createDefaultGuildData();

        saveData();
    }

    const defaults =
        createDefaultGuildData();

    const current =
        data.guilds[guildId];

    data.guilds[guildId] = {

        ...defaults,

        ...current,

        staffRoles: {

            ...defaults.staffRoles,

            ...(current.staffRoles || {}),

            junior:
                Array.isArray(
                    current.staffRoles?.junior
                )
                    ? current.staffRoles.junior
                    : [
                        ...defaults.staffRoles.junior
                    ],

            middle:
                Array.isArray(
                    current.staffRoles?.middle
                )
                    ? current.staffRoles.middle
                    : [
                        ...defaults.staffRoles.middle
                    ],

            senior:
                Array.isArray(
                    current.staffRoles?.senior
                )
                    ? current.staffRoles.senior
                    : [
                        ...defaults.staffRoles.senior
                    ],

            owner:
                Array.isArray(
                    current.staffRoles?.owner
                )
                    ? current.staffRoles.owner
                    : [
                        ...defaults.staffRoles.owner
                    ]
        },

        ticketPanels:
            current.ticketPanels || {},

        antiSpam: {

            ...defaults.antiSpam,

            ...(current.antiSpam || {})
        }
    };

    return data.guilds[guildId];
}

/* =========================================================
   USER DATA
========================================================= */

function getUserData(
    guildId,
    userId
) {

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

            ticketsClosed: 0,

            bans: 0,

            messages: 0,

            coins: 0,

            lastXp: 0,

            lastDaily: 0
        };

    }

    const user =
        data.users[guildId][userId];

    user.xp ||= 0;
    user.actionPoints ||= 0;
    user.warnings ||= 0;
    user.timeouts ||= 0;
    user.jails ||= 0;
    user.ticketsClaimed ||= 0;
    user.ticketsClosed ||= 0;
    user.bans ||= 0;
    user.messages ||= 0;
    user.coins ||= 0;
    user.lastXp ||= 0;
    user.lastDaily ||= 0;

    return user;
}

/* =========================================================
   STAFF STATS
========================================================= */

function getStats(
    guildId,
    userId
) {

    if (!data.stats[guildId]) {
        data.stats[guildId] = {};
    }

    if (!data.stats[guildId][userId]) {

        data.stats[guildId][userId] = {

            warnings: 0,

            timeouts: 0,

            jails: 0,

            bans: 0,

            ticketsClaimed: 0,

            ticketsClosed: 0,

            points: 0,

            xp: 0,

            messages: 0,

            ratings: 0,

            goodRatings: 0
        };
    }

    const stats =
        data.stats[guildId][userId];

    stats.warnings ||= 0;
    stats.timeouts ||= 0;
    stats.jails ||= 0;
    stats.bans ||= 0;
    stats.ticketsClaimed ||= 0;
    stats.ticketsClosed ||= 0;
    stats.points ||= 0;
    stats.xp ||= 0;
    stats.messages ||= 0;
    stats.ratings ||= 0;
    stats.goodRatings ||= 0;

    return stats;
}

/* =========================================================
   STAFF LEVEL
========================================================= */

function getStaffLevel(member) {

    if (
        !member ||
        !member.roles ||
        !member.guild
    ) {
        return 0;
    }

    if (
        APPLICATION_OWNER_ID &&
        member.id === APPLICATION_OWNER_ID
    ) {
        return 4;
    }

    const guildData =
        getGuildData(
            member.guild.id
        );

    const staffRoles =
        guildData.staffRoles ||
        STAFF_ROLES;

    const roleIds =
        member.roles.cache.map(
            role => role.id
        );

    if (
        staffRoles.owner?.some(
            id => roleIds.includes(id)
        )
    ) {
        return 4;
    }

    if (
        staffRoles.senior?.some(
            id => roleIds.includes(id)
        )
    ) {
        return 3;
    }

    if (
        staffRoles.middle?.some(
            id => roleIds.includes(id)
        )
    ) {
        return 2;
    }

    if (
        staffRoles.junior?.some(
            id => roleIds.includes(id)
        )
    ) {
        return 1;
    }

    return 0;
}

/* =========================================================
   STAFF CHECKS
========================================================= */

function isStaff(member) {
    return getStaffLevel(member) >= 1;
}

function isMiddleStaff(member) {
    return getStaffLevel(member) >= 2;
}

function isSeniorStaff(member) {
    return getStaffLevel(member) >= 3;
}

function isOwnerStaff(member) {
    return getStaffLevel(member) >= 4;
}

function canManage(
    member,
    level = 1
) {
    return getStaffLevel(member) >= level;
}

/* =========================================================
   MODERATION HIERARCHY
========================================================= */

function canModerateTarget(
    actor,
    target
) {

    if (
        !actor ||
        !target
    ) {
        return false;
    }

    if (
        actor.id === target.id
    ) {
        return false;
    }

    if (
        APPLICATION_OWNER_ID &&
        actor.id === APPLICATION_OWNER_ID
    ) {
        return true;
    }

    const actorLevel =
        getStaffLevel(actor);

    const targetLevel =
        getStaffLevel(target);

    if (
        actorLevel >= 4
    ) {
        return true;
    }

    if (
        actorLevel <= 0
    ) {
        return false;
    }

    return targetLevel < actorLevel;
}

/* =========================================================
   POINTS
========================================================= */

const POINTS = {

    warning: 3,

    timeout: 3,

    jail: 5,

    ticketClaim: 3,

    ticketClose: 1,

    goodRating: 3

};

/* =========================================================
   ADD POINTS
========================================================= */

function addPoints(
    guildId,
    userId,
    amount
) {

    amount =
        Number(amount);

    if (
        !Number.isFinite(amount)
    ) {
        return;
    }

    const user =
        getUserData(
            guildId,
            userId
        );

    const stats =
        getStats(
            guildId,
            userId
        );

    user.actionPoints += amount;

    stats.points += amount;

    saveData();
}

/* =========================================================
   XP
========================================================= */

const XP_PER_MESSAGE = 10;

const XP_COOLDOWN =
    30 * 1000;

function addXP(
    guildId,
    userId
) {

    const user =
        getUserData(
            guildId,
            userId
        );

    const now =
        Date.now();

    if (
        now - user.lastXp <
        XP_COOLDOWN
    ) {
        return;
    }

    user.xp +=
        XP_PER_MESSAGE;

    user.messages += 1;

    user.lastXp =
        now;

    const stats =
        getStats(
            guildId,
            userId
        );

    stats.xp +=
        XP_PER_MESSAGE;

    stats.messages += 1;

    saveData();
}

/* =========================================================
   COINS
========================================================= */

function getBalance(
    guildId,
    userId
) {

    return Math.floor(
        Number(
            getUserData(
                guildId,
                userId
            ).coins || 0
        )
    );
}

function addCoins(
    guildId,
    userId,
    amount
) {

    amount =
        Math.floor(
            Number(amount)
        );

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return false;
    }

    const user =
        getUserData(
            guildId,
            userId
        );

    user.coins +=
        amount;

    if (
        !data.pay.balances[guildId]
    ) {
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

    amount =
        Math.floor(
            Number(amount)
        );

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return false;
    }

    const user =
        getUserData(
            guildId,
            userId
        );

    if (
        user.coins < amount
    ) {
        return false;
    }

    user.coins -=
        amount;

    if (
        !data.pay.balances[guildId]
    ) {
        data.pay.balances[guildId] = {};
    }

    data.pay.balances[guildId][userId] =
        user.coins;

    saveData();

    return true;
}

/* =========================================================
   DURATION
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

        m:
            60 * 1000,

        h:
            60 * 60 * 1000,

        d:
            24 * 60 * 60 * 1000,

        w:
            7 *
            24 *
            60 *
            60 *
            1000
    };

    return (
        amount *
        units[unit]
    );
}

function formatDuration(ms) {

    if (
        !ms ||
        ms <= 0
    ) {
        return "غير محددة";
    }

    let seconds =
        Math.floor(
            ms / 1000
        );

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
   EMBEDS
========================================================= */

function errorEmbed(message) {

    return new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(
            `❌ ${message}`
        );
}

function successEmbed(
    title,
    description
) {

    const embed =
        new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(
                `✅ ${title}`
            );

    if (description) {
        embed.setDescription(
            description
        );
    }

    return embed;
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

        if (!guild) {
            return;
        }

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

    } catch (error) {

        console.error(
            "❌ Log Error:",
            error
        );
    }
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
   WARNING DATA
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

    if (
        !data.jails[guildId]
    ) {
        data.jails[guildId] = {};
    }

    return (
        data.jails[guildId][userId] ||
        null
    );
}

/* =========================================================
   TICKET DATA
========================================================= */

function getTicketData(
    guildId,
    channelId
) {

    if (
        !data.tickets[guildId]
    ) {
        data.tickets[guildId] = {};
    }

    return (
        data.tickets[guildId][channelId] ||
        null
    );
}

/* =========================================================
   CREATE TICKET DATA
========================================================= */

function createTicketObject(
    guildId,
    channelId,
    ownerId,
    panelId = null,
    panelName = null
) {

    if (
        !data.tickets[guildId]
    ) {
        data.tickets[guildId] = {};
    }

    const ticket = {

        channelId,

        ownerId,

        claimedBy: null,

        panelId,

        panelName,

        createdAt:
            Date.now(),

        closedAt: null,

        closedBy: null,

        status: "open"
    };

    data.tickets[guildId][channelId] =
        ticket;

    saveData();

    return ticket;
}

/* =========================================================
   ANTI SPAM
========================================================= */

const spamTracker =
    new Map();

function getSpamKey(
    guildId,
    userId
) {

    return (
        `${guildId}:${userId}`
    );
}

/* =========================================================
   NEXT PART
========================================================= */

/*
   الجزء القادم يحتوي على:

   /ban
   /unban
   /warn
   /warning
   /timeout
   /jail
   /time
   /close
   /delete
   /points
   /xp
   /balance
   /pay
   /setup
   /panel
   /setup-ticket-panel
   /stats
   /help

   + التسجيل الحقيقي لكل Slash Commands.
*/
// ============================================================
// PART 2 — SLASH COMMANDS
// ============================================================

const slashCommands = [

    // --------------------------------------------------------
    // /ban
    // --------------------------------------------------------
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

    // --------------------------------------------------------
    // /unban
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("إلغاء حظر عضو")
        .addStringOption(option =>
            option
                .setName("userid")
                .setDescription("Discord User ID")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب إلغاء الحظر")
                .setRequired(false)
        ),

    // --------------------------------------------------------
    // /warn
    // --------------------------------------------------------
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
                .setName("duration")
                .setDescription("مدة التحذير مثل 10m أو 1h أو 1d")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب التحذير")
                .setRequired(true)
        ),

    // --------------------------------------------------------
    // /warning
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("warning")
        .setDescription("إعطاء تحذير لعضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("duration")
                .setDescription("مدة التحذير")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب التحذير")
                .setRequired(true)
        ),

    // --------------------------------------------------------
    // /timeout
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("إعطاء Timeout لعضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("duration")
                .setDescription("المدة مثل 10m أو 1h أو 1d")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب التايم")
                .setRequired(true)
        ),

    // --------------------------------------------------------
    // /jail
    // --------------------------------------------------------
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
                .setName("duration")
                .setDescription("مدة السجن")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب السجن")
                .setRequired(true)
        ),

    // --------------------------------------------------------
    // /time
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("time")
        .setDescription("معرفة الوقت المتبقي للسجن")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),

    // --------------------------------------------------------
    // /points
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("points")
        .setDescription("عرض نقاط العضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),

    // --------------------------------------------------------
    // /xp
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("xp")
        .setDescription("عرض XP العضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),

    // --------------------------------------------------------
    // /balance
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("balance")
        .setDescription("عرض رصيد العضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),

    // --------------------------------------------------------
    // /pay
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("pay")
        .setDescription("تحويل عملة لعضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو المستلم")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("المبلغ")
                .setMinValue(1)
                .setRequired(true)
        ),

    // --------------------------------------------------------
    // /addcoins
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("addcoins")
        .setDescription("إضافة عملة لعضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("المبلغ")
                .setMinValue(1)
                .setRequired(true)
        ),

    // --------------------------------------------------------
    // /removecoins
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("removecoins")
        .setDescription("خصم عملة من عضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("المبلغ")
                .setMinValue(1)
                .setRequired(true)
        ),

    // --------------------------------------------------------
    // /setcoins
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("setcoins")
        .setDescription("تحديد رصيد عضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("amount")
                .setDescription("الرصيد الجديد")
                .setMinValue(0)
                .setRequired(true)
        ),

    // --------------------------------------------------------
    // /stats
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("stats")
        .setDescription("عرض إحصائيات عضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),

    // --------------------------------------------------------
    // /close
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("close")
        .setDescription("إغلاق التذكرة الحالية"),

    // --------------------------------------------------------
    // /delete
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("delete")
        .setDescription("حذف التذكرة الحالية"),

    // --------------------------------------------------------
    // /setup
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("setup")
        .setDescription("إعداد البوت في السيرفر"),

    // --------------------------------------------------------
    // /setup-ticket-panel
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("setup-ticket-panel")
        .setDescription("إنشاء وإرسال لوحة تذاكر جديدة")
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("اسم لوحة التذاكر")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("description")
                .setDescription("وصف لوحة التذاكر")
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName("button")
                .setDescription("اسم زر فتح التذكرة")
                .setRequired(false)
        )
        .addChannelOption(option =>
            option
                .setName("category")
                .setDescription("كاتيجوري التذاكر")
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
        ),

    // --------------------------------------------------------
    // /help
    // --------------------------------------------------------
    new SlashCommandBuilder()
        .setName("help")
        .setDescription("عرض جميع أوامر البوت")

].map(command => command.toJSON());


// ============================================================
// REGISTER SLASH COMMANDS
// ============================================================

async function registerSlashCommands() {

    try {

        const rest = new REST({
            version: "10"
        }).setToken(TOKEN);

        console.log("🔄 جاري تسجيل أوامر Slash...");

        await rest.put(
            Routes.applicationCommands(client.user.id),
            {
                body: slashCommands
            }
        );

        console.log(
            `✅ تم تسجيل ${slashCommands.length} أمر Slash بنجاح.`
        );

    } catch (error) {

        console.error(
            "❌ خطأ أثناء تسجيل أوامر Slash:",
            error
        );

    }
}


// ============================================================
// COMMAND PERMISSION HELPERS
// ============================================================

function requireGuild(interaction) {

    if (!interaction.guild) {
        return false;
    }

    return true;
}


function requireStaff(interaction, level = 1) {

    if (!interaction.guild) {
        return false;
    }

    const guildData =
        getGuildData(interaction.guild.id);

    const currentLevel =
        getStaffLevel(
            interaction.member,
            guildData
        );

    return currentLevel >= level;
}


function getInteractionMember(interaction) {

    return (
        interaction.member ||
        interaction.guild?.members.cache.get(
            interaction.user.id
        )
    );
}


async function resolveInteractionMember(
    interaction,
    optionName = "member"
) {

    const user =
        interaction.options.getUser(optionName);

    if (!user) {
        return null;
    }

    try {

        return await interaction.guild.members.fetch(
            user.id
        );

    } catch {

        return null;
    }
}


// ============================================================
// TARGET HIERARCHY CHECK
// ============================================================

function canModerateInteractionTarget(
    interaction,
    target
) {

    if (!target) {
        return false;
    }

    const guildData =
        getGuildData(
            interaction.guild.id
        );

    const actorLevel =
        getStaffLevel(
            interaction.member,
            guildData
        );

    if (actorLevel >= 4) {
        return true;
    }

    const targetLevel =
        getStaffLevel(
            target,
            guildData
        );

    if (targetLevel >= actorLevel) {
        return false;
    }

    if (
        target.id === interaction.user.id
    ) {
        return false;
    }

    return true;
}


// ============================================================
// INTERACTION CREATE
// ============================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // =================================================
            // CHAT INPUT / SLASH COMMANDS
            // =================================================

            if (
                interaction.isChatInputCommand()
            ) {

                if (!interaction.guild) {

                    await interaction.reply({
                        content:
                            "❌ هذا الأمر يعمل داخل السيرفر فقط.",
                        ephemeral: true
                    });

                    return;
                }


                const command =
                    interaction.commandName;


                // =============================================
                // /help
                // =============================================

                if (
                    command === "help"
                ) {

                    const embed =
                        new EmbedBuilder()
                            .setColor(0x5865F2)
                            .setTitle(
                                "🤖 أوامر البوت"
                            )
                            .setDescription(
                                "البوت الاحترافي المتعدد الأنظمة"
                            )
                            .addFields(

                                {
                                    name: "🛡️ الإدارة",
                                    value:
                                        "`/ban`\n" +
                                        "`/unban`\n" +
                                        "`/warn`\n" +
                                        "`/warning`\n" +
                                        "`/timeout`\n" +
                                        "`/jail`\n" +
                                        "`/time`"
                                },

                                {
                                    name: "🎫 التذاكر",
                                    value:
                                        "`/close`\n" +
                                        "`/delete`\n" +
                                        "`/setup-ticket-panel`"
                                },

                                {
                                    name: "⭐ النقاط و XP",
                                    value:
                                        "`/points`\n" +
                                        "`/xp`\n" +
                                        "`/stats`"
                                },

                                {
                                    name: "💰 الاقتصاد",
                                    value:
                                        "`/balance`\n" +
                                        "`/pay`\n" +
                                        "`/addcoins`\n" +
                                        "`/removecoins`\n" +
                                        "`/setcoins`"
                                },

                                {
                                    name: "⚙️ الإعداد",
                                    value:
                                        "`/setup`"
                                }

                            )
                            .setTimestamp();

                    await interaction.reply({
                        embeds: [embed]
                    });

                    return;
                }


                // =============================================
                // /points
                // =============================================

                if (
                    command === "points"
                ) {

                    const target =
                        await resolveInteractionMember(
                            interaction
                        );

                    const member =
                        target ||
                        interaction.member;

                    const user =
                        getUserData(
                            interaction.guild.id,
                            member.id
                        );

                    await interaction.reply({
                        embeds: [
                            buildPointsEmbed(
                                member,
                                user
                            )
                        ]
                    });

                    return;
                }


                // =============================================
                // /xp
                // =============================================

                if (
                    command === "xp"
                ) {

                    const target =
                        await resolveInteractionMember(
                            interaction
                        );

                    const member =
                        target ||
                        interaction.member;

                    const user =
                        getUserData(
                            interaction.guild.id,
                            member.id
                        );

                    await interaction.reply({
                        embeds: [
                            buildXPEmbed(
                                member,
                                user
                            )
                        ]
                    });

                    return;
                }


                // =============================================
                // /balance
                // =============================================

                if (
                    command === "balance"
                ) {

                    const target =
                        await resolveInteractionMember(
                            interaction
                        );

                    const member =
                        target ||
                        interaction.member;

                    const guildData =
                        getGuildData(
                            interaction.guild.id
                        );

                    const user =
                        getUserData(
                            interaction.guild.id,
                            member.id
                        );

                    await interaction.reply({
                        embeds: [
                            buildBalanceEmbed(
                                member,
                                user,
                                guildData
                            )
                        ]
                    });

                    return;
                }


                // =============================================
                // /stats
                // =============================================

                if (
                    command === "stats"
                ) {

                    const target =
                        await resolveInteractionMember(
                            interaction
                        );

                    const member =
                        target ||
                        interaction.member;

                    const user =
                        getUserData(
                            interaction.guild.id,
                            member.id
                        );

                    const stats =
                        getStats(
                            interaction.guild.id,
                            member.id
                        );

                    const embed =
                        new EmbedBuilder()
                            .setColor(0x5865F2)
                            .setTitle(
                                `📊 إحصائيات ${member.user.username}`
                            )
                            .setThumbnail(
                                member.user.displayAvatarURL({
                                    size: 256
                                })
                            )
                            .addFields(

                                {
                                    name: "⚠️ التحذيرات",
                                    value:
                                        String(
                                            user.warnings || 0
                                        ),
                                    inline: true
                                },

                                {
                                    name: "⏱️ التايم",
                                    value:
                                        String(
                                            user.timeouts || 0
                                        ),
                                    inline: true
                                },

                                {
                                    name: "🔒 السجن",
                                    value:
                                        String(
                                            user.jails || 0
                                        ),
                                    inline: true
                                },

                                {
                                    name: "🔨 الباند",
                                    value:
                                        String(
                                            user.bans || 0
                                        ),
                                    inline: true
                                },

                                {
                                    name: "🎫 التذاكر",
                                    value:
                                        String(
                                            user.ticketsClaimed || 0
                                        ),
                                    inline: true
                                },

                                {
                                    name: "⭐ النقاط",
                                    value:
                                        String(
                                            user.actionPoints || 0
                                        ),
                                    inline: true
                                },

                                {
                                    name: "✨ XP",
                                    value:
                                        String(
                                            user.xp || 0
                                        ),
                                    inline: true
                                },

                                {
                                    name: "💬 الرسائل",
                                    value:
                                        String(
                                            user.messages || 0
                                        ),
                                    inline: true
                                },

                                {
                                    name: "⭐ التقييمات الجيدة",
                                    value:
                                        String(
                                            user.goodRatings || 0
                                        ),
                                    inline: true
                                }

                            )
                            .setTimestamp();

                    await interaction.reply({
                        embeds: [embed]
                    });

                    return;
                }


                // =============================================
                // /pay
                // =============================================

                if (
                    command === "pay"
                ) {

                    const guildData =
                        getGuildData(
                            interaction.guild.id
                        );

                    if (
                        guildData.currencyEnabled === false
                    ) {

                        await interaction.reply({
                            content:
                                "❌ نظام العملة غير مفعل.",
                            ephemeral: true
                        });

                        return;
                    }

                    const target =
                        await resolveInteractionMember(
                            interaction
                        );

                    const amount =
                        interaction.options.getInteger(
                            "amount"
                        );

                    if (!target) {

                        await interaction.reply({
                            content:
                                "❌ لم أجد العضو.",
                            ephemeral: true
                        });

                        return;
                    }

                    if (
                        target.id ===
                        interaction.user.id
                    ) {

                        await interaction.reply({
                            content:
                                "❌ لا يمكنك تحويل العملة لنفسك.",
                            ephemeral: true
                        });

                        return;
                    }

                    if (
                        target.user.bot
                    ) {

                        await interaction.reply({
                            content:
                                "❌ لا يمكنك تحويل العملة لبوت.",
                            ephemeral: true
                        });

                        return;
                    }

                    const sender =
                        getUserData(
                            interaction.guild.id,
                            interaction.user.id
                        );

                    if (
                        Number(sender.coins || 0) <
                        amount
                    ) {

                        await interaction.reply({
                            content:
                                `❌ رصيدك غير كافٍ.\nرصيدك الحالي: ${guildData.currencySymbol} ${sender.coins || 0}`,
                            ephemeral: true
                        });

                        return;
                    }

                    removeCoins(
                        interaction.guild.id,
                        interaction.user.id,
                        amount
                    );

                    addCoins(
                        interaction.guild.id,
                        target.id,
                        amount
                    );

                    const symbol =
                        guildData.currencySymbol;

                    await interaction.reply({
                        content:
                            `✅ تم تحويل **${amount} ${symbol}** إلى ${target}.`
                    });

                    return;
                }


                // =============================================
                // /addcoins
                // =============================================

                if (
                    command === "addcoins"
                ) {

                    if (
                        !requireStaff(
                            interaction,
                            3
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ هذا الأمر متاح للإدارة العليا والأونر فقط.",
                            ephemeral: true
                        });

                        return;
                    }

                    const target =
                        await resolveInteractionMember(
                            interaction
                        );

                    const amount =
                        interaction.options.getInteger(
                            "amount"
                        );

                    if (!target) {

                        await interaction.reply({
                            content:
                                "❌ العضو غير موجود.",
                            ephemeral: true
                        });

                        return;
                    }

                    addCoins(
                        interaction.guild.id,
                        target.id,
                        amount
                    );

                    const guildData =
                        getGuildData(
                            interaction.guild.id
                        );

                    await interaction.reply({
                        content:
                            `✅ تمت إضافة **${amount} ${guildData.currencySymbol}** إلى ${target}.`
                    });

                    return;
                }


                // =============================================
                // /removecoins
                // =============================================

                if (
                    command === "removecoins"
                ) {

                    if (
                        !requireStaff(
                            interaction,
                            3
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ هذا الأمر متاح للإدارة العليا والأونر فقط.",
                            ephemeral: true
                        });

                        return;
                    }

                    const target =
                        await resolveInteractionMember(
                            interaction
                        );

                    const amount =
                        interaction.options.getInteger(
                            "amount"
                        );

                    if (!target) {

                        await interaction.reply({
                            content:
                                "❌ العضو غير موجود.",
                            ephemeral: true
                        });

                        return;
                    }

                    const user =
                        getUserData(
                            interaction.guild.id,
                            target.id
                        );

                    const current =
                        Number(
                            user.coins || 0
                        );

                    const removed =
                        Math.min(
                            current,
                            amount
                        );

                    removeCoins(
                        interaction.guild.id,
                        target.id,
                        removed
                    );

                    const guildData =
                        getGuildData(
                            interaction.guild.id
                        );

                    await interaction.reply({
                        content:
                            `✅ تم خصم **${removed} ${guildData.currencySymbol}** من ${target}.`
                    });

                    return;
                }


                // =============================================
                // /setcoins
                // =============================================

                if (
                    command === "setcoins"
                ) {

                    if (
                        !requireStaff(
                            interaction,
                            3
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ هذا الأمر متاح للإدارة العليا والأونر فقط.",
                            ephemeral: true
                        });

                        return;
                    }

                    const target =
                        await resolveInteractionMember(
                            interaction
                        );

                    const amount =
                        interaction.options.getInteger(
                            "amount"
                        );

                    if (!target) {

                        await interaction.reply({
                            content:
                                "❌ العضو غير موجود.",
                            ephemeral: true
                        });

                        return;
                    }

                    const user =
                        getUserData(
                            interaction.guild.id,
                            target.id
                        );

                    user.coins =
                        amount;

                    saveData();

                    const guildData =
                        getGuildData(
                            interaction.guild.id
                        );

                    await interaction.reply({
                        content:
                            `✅ تم تحديد رصيد ${target} إلى **${amount} ${guildData.currencySymbol}**.`
                    });

                    return;
                }


                // =============================================
                // /ban
                // =============================================

                if (
                    command === "ban"
                ) {

                    if (
                        !requireStaff(
                            interaction,
                            1
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ ليس لديك صلاحية استخدام الباند.",
                            ephemeral: true
                        });

                        return;
                    }

                    const target =
                        await resolveInteractionMember(
                            interaction
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) ||
                        "بدون سبب";

                    if (!target) {

                        await interaction.reply({
                            content:
                                "❌ العضو غير موجود.",
                            ephemeral: true
                        });

                        return;
                    }

                    if (
                        !canModerateInteractionTarget(
                            interaction,
                            target
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ لا يمكنك معاقبة عضو بنفس مستواك أو أعلى منك.",
                            ephemeral: true
                        });

                        return;
                    }

                    if (
                        !target.bannable
                    ) {

                        await interaction.reply({
                            content:
                                "❌ لا أستطيع حظر هذا العضو. تأكد أن رتبة البوت أعلى منه.",
                            ephemeral: true
                        });

                        return;
                    }

                    const result =
                        await executeBan(
                            interaction.guild,
                            target,
                            interaction.member,
                            reason
                        );

                    await interaction.reply({
                        content:
                            result.message
                    });

                    return;
                }


                // =============================================
                // /unban
                // =============================================

                if (
                    command === "unban"
                ) {

                    if (
                        !requireStaff(
                            interaction,
                            1
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ ليس لديك صلاحية استخدام فك الباند.",
                            ephemeral: true
                        });

                        return;
                    }

                    const userId =
                        interaction.options.getString(
                            "userid"
                        );

                    const reason =
                        interaction.options.getString(
                            "reason"
                        ) ||
                        "بدون سبب";

                    try {

                        await interaction.guild.bans.remove(
                            userId,
                            reason
                        );

                        await interaction.reply({
                            content:
                                `✅ تم إلغاء حظر العضو صاحب الـ ID:\n\`${userId}\``
                        });

                    } catch {

                        await interaction.reply({
                            content:
                                "❌ لم أستطع إلغاء الحظر. تأكد من الـ ID وأن البوت لديه صلاحية Ban Members.",
                            ephemeral: true
                        });

                    }

                    return;
                }


                // =============================================
                // /warn + /warning
                // =============================================

                if (
                    command === "warn" ||
                    command === "warning"
                ) {

                    if (
                        !requireStaff(
                            interaction,
                            1
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ ليس لديك صلاحية إعطاء تحذيرات.",
                            ephemeral: true
                        });

                        return;
                    }

                    const target =
                        await resolveInteractionMember(
                            interaction
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

                        await interaction.reply({
                            content:
                                "❌ العضو غير موجود.",
                            ephemeral: true
                        });

                        return;
                    }

                    if (
                        !canModerateInteractionTarget(
                            interaction,
                            target
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ لا يمكنك تحذير عضو بنفس مستواك أو أعلى منك.",
                            ephemeral: true
                        });

                        return;
                    }

                    const result =
                        await executeWarn(
                            interaction.guild,
                            target,
                            interaction.member,
                            reason,
                            duration
                        );

                    await interaction.reply({
                        content:
                            result.message
                    });

                    return;
                }


                // =============================================
                // /timeout
                // =============================================

                if (
                    command === "timeout"
                ) {

                    if (
                        !requireStaff(
                            interaction,
                            1
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ ليس لديك صلاحية استخدام التايم.",
                            ephemeral: true
                        });

                        return;
                    }

                    const target =
                        await resolveInteractionMember(
                            interaction
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

                        await interaction.reply({
                            content:
                                "❌ العضو غير موجود.",
                            ephemeral: true
                        });

                        return;
                    }

                    if (
                        !canModerateInteractionTarget(
                            interaction,
                            target
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ لا يمكنك إعطاء تايم لعضو بنفس مستواك أو أعلى منك.",
                            ephemeral: true
                        });

                        return;
                    }

                    const result =
                        await executeTimeout(
                            interaction.guild,
                            target,
                            interaction.member,
                            reason,
                            duration
                        );

                    await interaction.reply({
                        content:
                            result.message
                    });

                    return;
                }


                // =============================================
                // /jail
                // =============================================

                if (
                    command === "jail"
                ) {

                    if (
                        !requireStaff(
                            interaction,
                            3
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ السجن متاح للإدارة العليا والأونر فقط.",
                            ephemeral: true
                        });

                        return;
                    }

                    const target =
                        await resolveInteractionMember(
                            interaction
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

                        await interaction.reply({
                            content:
                                "❌ العضو غير موجود.",
                            ephemeral: true
                        });

                        return;
                    }

                    if (
                        !canModerateInteractionTarget(
                            interaction,
                            target
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ لا يمكنك سجن عضو بنفس مستواك أو أعلى منك.",
                            ephemeral: true
                        });

                        return;
                    }

                    const result =
                        await executeJail(
                            interaction.guild,
                            target,
                            interaction.member,
                            reason,
                            duration
                        );

                    await interaction.reply({
                        content:
                            result.message
                    });

                    return;
                }


                // =============================================
                // /time
                // =============================================

                if (
                    command === "time"
                ) {

                    const target =
                        await resolveInteractionMember(
                            interaction
                        );

                    const member =
                        target ||
                        interaction.member;

                    const jail =
                        getActiveJail(
                            interaction.guild.id,
                            member.id
                        );

                    if (!jail) {

                        await interaction.reply({
                            content:
                                `✅ ${member.id === interaction.user.id ? "أنت" : member.user.username} غير مسجون حاليًا.`
                        });

                        return;
                    }

                    const remaining =
                        Math.max(
                            0,
                            jail.expiresAt -
                            Date.now()
                        );

                    await interaction.reply({
                        content:
                            `🔒 ${member} مسجون حاليًا.\n⏳ الوقت المتبقي: **${formatDuration(remaining)}**`
                    });

                    return;
                }


                // =============================================
                // /close
                // =============================================

                if (
                    command === "close"
                ) {

                    const result =
                        await closeTicket(
                            interaction.channel,
                            interaction.member
                        );

                    await interaction.reply({
                        content:
                            result.message,
                        ephemeral:
                            !result.success
                    });

                    return;
                }


                // =============================================
                // /delete
                // =============================================

                if (
                    command === "delete"
                ) {

                    const result =
                        await deleteTicket(
                            interaction.channel,
                            interaction.member
                        );

                    await interaction.reply({
                        content:
                            result.message,
                        ephemeral:
                            !result.success
                    });

                    return;
                }


                // =============================================
                // /setup-ticket-panel
                // =============================================

                if (
                    command === "setup-ticket-panel"
                ) {

                    if (
                        !requireStaff(
                            interaction,
                            3
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ إنشاء لوحات التذاكر متاح للإدارة العليا والأونر فقط.",
                            ephemeral: true
                        });

                        return;
                    }

                    const name =
                        interaction.options.getString(
                            "name"
                        );

                    const description =
                        interaction.options.getString(
                            "description"
                        ) ||
                        "اضغط على الزر بالأسفل لفتح تذكرة.";

                    const buttonText =
                        interaction.options.getString(
                            "button"
                        ) ||
                        "🎫 فتح تذكرة";

                    const category =
                        interaction.options.getChannel(
                            "category"
                        );

                    if (
                        !category ||
                        category.type !==
                        ChannelType.GuildCategory
                    ) {

                        await interaction.reply({
                            content:
                                "❌ يجب اختيار Category صحيحة.",
                            ephemeral: true
                        });

                        return;
                    }

                    const guildData =
                        getGuildData(
                            interaction.guild.id
                        );

                    guildData.ticketCategoryId =
                        category.id;

                    const panelId =
                        `panel_${Date.now()}_${Math.random()
                            .toString(36)
                            .slice(2, 7)}`;

                    guildData.ticketPanels[
                        panelId
                    ] = {

                        id:
                            panelId,

                        name:
                            name,

                        description:
                            description,

                        buttonText:
                            buttonText,

                        categoryId:
                            category.id,

                        channelId:
                            interaction.channel.id,

                        createdBy:
                            interaction.user.id,

                        createdAt:
                            Date.now()

                    };

                    saveData();

                    const panelEmbed =
                        new EmbedBuilder()
                            .setColor(0x5865F2)
                            .setTitle(
                                `🎫 ${name}`
                            )
                            .setDescription(
                                description
                            )
                            .setFooter({
                                text:
                                    "نظام التذاكر الاحترافي"
                            })
                            .setTimestamp();

                    const button =
                        new ButtonBuilder()
                            .setCustomId(
                                `open_ticket_${panelId}`
                            )
                            .setLabel(
                                buttonText
                            )
                            .setEmoji("🎫")
                            .setStyle(
                                ButtonStyle.Primary
                            );

                    const row =
                        new ActionRowBuilder()
                            .addComponents(
                                button
                            );

                    await interaction.reply({
                        content:
                            "✅ تم إنشاء لوحة التذاكر وإرسالها.",
                        ephemeral: true
                    });

                    await interaction.channel.send({
                        embeds: [
                            panelEmbed
                        ],
                        components: [
                            row
                        ]
                    });

                    return;
                }


                // =============================================
                // /setup
                // =============================================

                if (
                    command === "setup"
                ) {

                    if (
                        !requireStaff(
                            interaction,
                            3
                        )
                    ) {

                        await interaction.reply({
                            content:
                                "❌ أمر الإعداد متاح للإدارة العليا والأونر فقط.",
                            ephemeral: true
                        });

                        return;
                    }

                    const guildData =
                        getGuildData(
                            interaction.guild.id
                        );

                    guildData.setupCompleted =
                        true;

                    saveData();

                    await interaction.reply({
                        content:
                            "✅ تم تفعيل إعداد البوت لهذا السيرفر.\n\n" +
                            "يمكنك الآن استخدام أنظمة البوت وإعداد التذاكر والأدوار.",
                        ephemeral: true
                    });

                    return;
                }

            }

        } catch (error) {

            console.error(
                "❌ Interaction Error:",
                error
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                try {

                    await interaction.followUp({
                        content:
                            "❌ حدث خطأ غير متوقع أثناء تنفيذ الأمر.",
                        ephemeral: true
                    });

                } catch {}

            } else {

                try {

                    await interaction.reply({
                        content:
                            "❌ حدث خطأ غير متوقع أثناء تنفيذ الأمر.",
                        ephemeral: true
                    });

                } catch {}

            }

        }

    }
);


// ============================================================
// END OF PART 2
// ============================================================
// ============================================================
// PART 3 — MODERATION + TICKETS
// ============================================================


// ============================================================
// MODERATION — BAN
// ============================================================

async function executeBan(
    guild,
    target,
    moderator,
    reason = "بدون سبب"
) {

    try {

        if (!target) {
            return {
                success: false,
                message: "❌ العضو غير موجود."
            };
        }

        if (!target.bannable) {
            return {
                success: false,
                message:
                    "❌ لا أستطيع حظر هذا العضو. تأكد أن رتبة البوت أعلى منه."
            };
        }

        await target.ban({
            reason:
                `${reason} | بواسطة ${moderator.user.tag}`
        });

        const user =
            getUserData(
                guild.id,
                target.id
            );

        user.bans =
            Number(user.bans || 0) + 1;

        const stats =
            getStats(
                guild.id,
                target.id
            );

        stats.bans =
            Number(stats.bans || 0) + 1;

        saveData();

        await sendLog(
            guild,
            "🔨 عضو تم حظره",
            [
                `👤 العضو: ${target}`,
                `🛡️ بواسطة: ${moderator}`,
                `📝 السبب: ${reason}`
            ].join("\n"),
            0xED4245
        );

        return {
            success: true,
            message:
                `🔨 تم حظر ${target} بنجاح.\n📝 السبب: **${reason}**`
        };

    } catch (error) {

        console.error(
            "executeBan:",
            error
        );

        return {
            success: false,
            message:
                "❌ حدث خطأ أثناء تنفيذ الباند."
        };
    }
}


// ============================================================
// MODERATION — WARN
// ============================================================

async function executeWarn(
    guild,
    target,
    moderator,
    reason,
    durationInput
) {

    try {

        if (!target) {
            return {
                success: false,
                message: "❌ العضو غير موجود."
            };
        }

        const duration =
            parseDuration(
                durationInput
            );

        if (!duration) {
            return {
                success: false,
                message:
                    "❌ مدة التحذير غير صحيحة.\nمثال: `10m` أو `1h` أو `1d`"
            };
        }

        const now =
            Date.now();

        const guildWarnings =
            getGuildWarnings(
                guild.id
            );

        if (
            !guildWarnings[target.id]
        ) {

            guildWarnings[target.id] =
                [];
        }

        const activeBefore =
            guildWarnings[target.id]
                .filter(
                    warning =>
                        warning.expiresAt >
                        now
                )
                .length;

        const warning = {

            id:
                `warn_${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,

            userId:
                target.id,

            moderatorId:
                moderator.id,

            reason:
                reason || "بدون سبب",

            duration:
                duration,

            createdAt:
                now,

            expiresAt:
                now + duration

        };

        guildWarnings[target.id]
            .push(warning);

        const user =
            getUserData(
                guild.id,
                moderator.id
            );

        user.warnings =
            Number(user.warnings || 0) + 1;

        addPoints(
            guild.id,
            moderator.id,
            POINTS.warning
        );

        const stats =
            getStats(
                guild.id,
                moderator.id
            );

        stats.warnings =
            Number(stats.warnings || 0) + 1;

        saveData();

        // ----------------------------------------------------
        // 3 WARNS = 30 MIN TIMEOUT
        // ----------------------------------------------------

        const activeAfter =
            guildWarnings[target.id]
                .filter(
                    item =>
                        item.expiresAt >
                        now
                )
                .length;

        let autoTimeout = false;

        if (
            activeBefore < 3 &&
            activeAfter >= 3 &&
            target.moderatable
        ) {

            try {

                await target.timeout(
                    30 * 60 * 1000,
                    "وصل العضو إلى 3 تحذيرات"
                );

                autoTimeout = true;

                const targetData =
                    getUserData(
                        guild.id,
                        target.id
                    );

                targetData.timeouts =
                    Number(
                        targetData.timeouts || 0
                    ) + 1;

                const targetStats =
                    getStats(
                        guild.id,
                        target.id
                    );

                targetStats.timeouts =
                    Number(
                        targetStats.timeouts || 0
                    ) + 1;

                saveData();

            } catch (error) {

                console.error(
                    "Auto timeout:",
                    error
                );
            }
        }

        await sendLog(
            guild,
            "⚠️ تحذير جديد",
            [
                `👤 العضو: ${target}`,
                `🛡️ بواسطة: ${moderator}`,
                `📝 السبب: ${reason}`,
                `⏳ المدة: ${formatDuration(duration)}`,
                `📊 التحذيرات الحالية: ${activeAfter}`
            ].join("\n"),
            0xFEE75C
        );

        let message =
            `⚠️ تم تحذير ${target} بنجاح.\n` +
            `📝 السبب: **${reason}**\n` +
            `⏳ المدة: **${formatDuration(duration)}**\n` +
            `📊 التحذيرات الحالية: **${activeAfter}/3**\n` +
            `⭐ حصلت على **+${POINTS.warning} نقاط**.`;

        if (autoTimeout) {

            message +=
                `\n\n🚨 وصل العضو إلى 3 تحذيرات وتم إعطاؤه **Timeout لمدة 30 دقيقة**.`;
        }

        // ----------------------------------------------------
        // DM
        // ----------------------------------------------------

        try {

            await target.send(
                `⚠️ **تم إعطاؤك تحذيرًا في ${guild.name}**\n\n` +
                `📝 السبب: ${reason}\n` +
                `⏳ المدة: ${formatDuration(duration)}\n` +
                `📊 تحذيراتك الحالية: ${activeAfter}/3`
            );

        } catch {}

        return {
            success: true,
            message
        };

    } catch (error) {

        console.error(
            "executeWarn:",
            error
        );

        return {
            success: false,
            message:
                "❌ حدث خطأ أثناء تنفيذ التحذير."
        };
    }
}


// ============================================================
// MODERATION — TIMEOUT
// ============================================================

async function executeTimeout(
    guild,
    target,
    moderator,
    reason,
    durationInput
) {

    try {

        const duration =
            parseDuration(
                durationInput
            );

        if (!duration) {

            return {
                success: false,
                message:
                    "❌ مدة التايم غير صحيحة."
            };
        }

        const MAX_TIMEOUT =
            28 * 24 * 60 * 60 * 1000;

        if (
            duration > MAX_TIMEOUT
        ) {

            return {
                success: false,
                message:
                    "❌ أقصى مدة للـ Timeout هي 28 يوم."
            };
        }

        if (
            !target.moderatable
        ) {

            return {
                success: false,
                message:
                    "❌ لا أستطيع إعطاء Timeout لهذا العضو."
            };
        }

        await target.timeout(
            duration,
            `${reason} | بواسطة ${moderator.user.tag}`
        );

        const user =
            getUserData(
                guild.id,
                moderator.id
            );

        user.timeouts =
            Number(user.timeouts || 0) + 1;

        addPoints(
            guild.id,
            moderator.id,
            POINTS.timeout
        );

        const stats =
            getStats(
                guild.id,
                moderator.id
            );

        stats.timeouts =
            Number(stats.timeouts || 0) + 1;

        saveData();

        await sendLog(
            guild,
            "⏱️ Timeout",
            [
                `👤 العضو: ${target}`,
                `🛡️ بواسطة: ${moderator}`,
                `📝 السبب: ${reason}`,
                `⏳ المدة: ${formatDuration(duration)}`
            ].join("\n"),
            0xFEE75C
        );

        try {

            await target.send(
                `⏱️ **تم إعطاؤك Timeout في ${guild.name}**\n\n` +
                `📝 السبب: ${reason}\n` +
                `⏳ المدة: ${formatDuration(duration)}`
            );

        } catch {}

        return {
            success: true,
            message:
                `⏱️ تم إعطاء ${target} Timeout.\n` +
                `📝 السبب: **${reason}**\n` +
                `⏳ المدة: **${formatDuration(duration)}**\n` +
                `⭐ حصلت على **+${POINTS.timeout} نقاط**.`
        };

    } catch (error) {

        console.error(
            "executeTimeout:",
            error
        );

        return {
            success: false,
            message:
                "❌ حدث خطأ أثناء تنفيذ الـ Timeout."
        };
    }
}


// ============================================================
// MODERATION — JAIL
// ============================================================

async function executeJail(
    guild,
    target,
    moderator,
    reason,
    durationInput
) {

    try {

        const guildData =
            getGuildData(
                guild.id
            );

        if (
            !guildData.jailRoleId
        ) {

            return {
                success: false,
                message:
                    "❌ لم يتم تحديد رتبة السجن.\nاستخدم إعدادات البوت وحدد Jail Role أولًا."
            };
        }

        const duration =
            parseDuration(
                durationInput
            );

        if (!duration) {

            return {
                success: false,
                message:
                    "❌ مدة السجن غير صحيحة."
            };
        }

        const jailRole =
            guild.roles.cache.get(
                guildData.jailRoleId
            );

        if (!jailRole) {

            return {
                success: false,
                message:
                    "❌ رتبة السجن غير موجودة."
            };
        }

        if (
            !guild.members.me
                .permissions.has(
                    PermissionsBitField.Flags.ManageRoles
                )
        ) {

            return {
                success: false,
                message:
                    "❌ البوت لا يملك صلاحية Manage Roles."
            };
        }

        if (
            jailRole.position >=
            guild.members.me.roles.highest.position
        ) {

            return {
                success: false,
                message:
                    "❌ رتبة السجن أعلى من رتبة البوت."
            };
        }

        if (
            target.roles.cache.has(
                jailRole.id
            )
        ) {

            return {
                success: false,
                message:
                    "❌ العضو مسجون بالفعل."
            };
        }

        const now =
            Date.now();

        const guildJails =
            getGuildJails(
                guild.id
            );

        if (
            !guildJails[target.id]
        ) {

            guildJails[target.id] =
                [];
        }

        const originalRoles =
            target.roles.cache
                .filter(
                    role =>
                        role.id !==
                            guild.id &&
                        !role.managed &&
                        role.id !==
                            jailRole.id
                )
                .map(
                    role =>
                        role.id
                );

        const jail = {

            id:
                `jail_${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,

            userId:
                target.id,

            moderatorId:
                moderator.id,

            reason:
                reason || "بدون سبب",

            duration:
                duration,

            createdAt:
                now,

            expiresAt:
                now + duration,

            originalRoles:
                originalRoles

        };

        await target.roles.remove(
            originalRoles,
            `Jail: ${reason}`
        );

        await target.roles.add(
            jailRole,
            `Jail: ${reason}`
        );

        guildJails[target.id]
            .push(jail);

        const user =
            getUserData(
                guild.id,
                moderator.id
            );

        user.jails =
            Number(user.jails || 0) + 1;

        addPoints(
            guild.id,
            moderator.id,
            POINTS.jail
        );

        const stats =
            getStats(
                guild.id,
                moderator.id
            );

        stats.jails =
            Number(stats.jails || 0) + 1;

        saveData();

        await sendLog(
            guild,
            "🔒 سجن عضو",
            [
                `👤 العضو: ${target}`,
                `🛡️ بواسطة: ${moderator}`,
                `📝 السبب: ${reason}`,
                `⏳ المدة: ${formatDuration(duration)}`
            ].join("\n"),
            0x5865F2
        );

        try {

            await target.send(
                `🔒 **تم سجنك في ${guild.name}**\n\n` +
                `📝 السبب: ${reason}\n` +
                `⏳ المدة: ${formatDuration(duration)}`
            );

        } catch {}

        return {
            success: true,
            message:
                `🔒 تم سجن ${target} بنجاح.\n` +
                `📝 السبب: **${reason}**\n` +
                `⏳ المدة: **${formatDuration(duration)}**\n` +
                `⭐ حصلت على **+${POINTS.jail} نقاط**.`
        };

    } catch (error) {

        console.error(
            "executeJail:",
            error
        );

        return {
            success: false,
            message:
                "❌ حدث خطأ أثناء تنفيذ السجن."
        };
    }
}


// ============================================================
// RELEASE FROM JAIL
// ============================================================

async function releaseFromJail(
    guild,
    userId
) {

    try {

        const guildJails =
            getGuildJails(
                guild.id
            );

        const records =
            guildJails[userId];

        if (
            !records ||
            !records.length
        ) {
            return false;
        }

        const jail =
            records
                .find(
                    item =>
                        item.expiresAt >
                        0
                );

        if (!jail) {
            return false;
        }

        const member =
            await guild.members.fetch(
                userId
            ).catch(
                () => null
            );

        if (!member) {

            delete guildJails[userId];

            saveData();

            return false;
        }

        const guildData =
            getGuildData(
                guild.id
            );

        const jailRole =
            guild.roles.cache.get(
                guildData.jailRoleId
            );

        if (
            jailRole &&
            member.roles.cache.has(
                jailRole.id
            )
        ) {

            await member.roles.remove(
                jailRole,
                "انتهاء مدة السجن"
            ).catch(() => {});
        }

        for (
            const roleId
            of jail.originalRoles || []
        ) {

            const role =
                guild.roles.cache.get(
                    roleId
                );

            if (
                role &&
                !role.managed
            ) {

                await member.roles.add(
                    role,
                    "استعادة رتبة بعد انتهاء السجن"
                ).catch(() => {});
            }
        }

        delete guildJails[userId];

        saveData();

        await sendLog(
            guild,
            "🔓 انتهاء السجن",
            `👤 العضو: <@${userId}>\n⏰ انتهت مدة السجن.`,
            0x57F287
        );

        try {

            await member.send(
                `🔓 انتهت مدة سجنك في **${guild.name}**.`
            );

        } catch {}

        return true;

    } catch (error) {

        console.error(
            "releaseFromJail:",
            error
        );

        return false;
    }
}


// ============================================================
// GET ACTIVE JAIL
// ============================================================

function getActiveJail(
    guildId,
    userId
) {

    const guildJails =
        getGuildJails(
            guildId
        );

    const records =
        guildJails[userId];

    if (
        !records ||
        !records.length
    ) {
        return null;
    }

    const now =
        Date.now();

    const active =
        records.find(
            jail =>
                jail.expiresAt >
                now
        );

    return active || null;
}


// ============================================================
// TICKET HELPERS
// ============================================================

function getGuildTickets(
    guildId
) {

    if (
        !data.tickets[guildId]
    ) {

        data.tickets[guildId] =
            {};
    }

    return data.tickets[guildId];
}


function findTicketByChannel(
    guildId,
    channelId
) {

    const tickets =
        getGuildTickets(
            guildId
        );

    return Object.values(
        tickets
    ).find(
        ticket =>
            ticket.channelId ===
            channelId
    ) || null;
}


function findOpenTicketByUser(
    guildId,
    userId
) {

    const tickets =
        getGuildTickets(
            guildId
        );

    return Object.values(
        tickets
    ).find(
        ticket =>
            ticket.ownerId ===
                userId &&
            ticket.status ===
                "open"
    ) || null;
}


// ============================================================
// TICKET PERMISSION
// ============================================================

function canManageTicket(
    member,
    ticket
) {

    if (!member || !ticket) {
        return false;
    }

    if (
        member.id ===
        ticket.ownerId
    ) {
        return true;
    }

    if (
        ticket.claimedBy &&
        member.id ===
        ticket.claimedBy
    ) {
        return true;
    }

    const guildData =
        getGuildData(
            member.guild.id
        );

    const level =
        getStaffLevel(
            member,
            guildData
        );

    if (
        level >= 1
    ) {
        return true;
    }

    return false;
}


function canWriteInTicket(
    member,
    ticket
) {

    if (!member || !ticket) {
        return false;
    }

    // صاحب التذكرة
    if (
        member.id ===
        ticket.ownerId
    ) {
        return true;
    }

    // لو التذكرة غير مستلمة
    if (!ticket.claimedBy) {

        const guildData =
            getGuildData(
                member.guild.id
            );

        return (
            getStaffLevel(
                member,
                guildData
            ) >= 1
        );
    }

    // المستلم
    if (
        member.id ===
        ticket.claimedBy
    ) {
        return true;
    }

    const guildData =
        getGuildData(
            member.guild.id
        );

    const memberLevel =
        getStaffLevel(
            member,
            guildData
        );

    const claimer =
        member.guild.members.cache.get(
            ticket.claimedBy
        );

    if (!claimer) {
        return false;
    }

    const claimerLevel =
        getStaffLevel(
            claimer,
            guildData
        );

    return (
        memberLevel >
        claimerLevel
    );
}


// ============================================================
// CREATE TICKET
// ============================================================

async function createTicket(
    interaction,
    panelId
) {

    const guild =
        interaction.guild;

    const guildData =
        getGuildData(
            guild.id
        );

    const panel =
        guildData.ticketPanels[
            panelId
        ];

    if (!panel) {

        return {
            success: false,
            message:
                "❌ لوحة التذاكر غير موجودة."
        };
    }

    // --------------------------------------------------------
    // Prevent duplicate open tickets
    // --------------------------------------------------------

    const existing =
        findOpenTicketByUser(
            guild.id,
            interaction.user.id
        );

    if (existing) {

        const existingChannel =
            guild.channels.cache.get(
                existing.channelId
            );

        if (existingChannel) {

            return {
                success: false,
                message:
                    `❌ لديك تذكرة مفتوحة بالفعل: ${existingChannel}`
            };
        }

        existing.status =
            "closed";
    }

    const category =
        guild.channels.cache.get(
            panel.categoryId ||
            guildData.ticketCategoryId
        );

    if (
        !category ||
        category.type !==
            ChannelType.GuildCategory
    ) {

        return {
            success: false,
            message:
                "❌ Category التذاكر غير موجودة."
        };
    }

    const ticketId =
        `ticket_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 7)}`;

    const ticketName =
        `ticket-${interaction.user.username}`
            .toLowerCase()
            .replace(
                /[^a-z0-9-_]/g,
                ""
            )
            .slice(0, 80) ||
        `ticket-${interaction.user.id}`;

    const guildTickets =
        getGuildTickets(
            guild.id
        );

    const permissionOverwrites = [

        {
            id:
                guild.roles.everyone.id,

            deny: [
                PermissionsBitField.Flags.ViewChannel
            ]
        },

        {
            id:
                interaction.user.id,

            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.EmbedLinks
            ]
        },

        {
            id:
                guild.members.me.id,

            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.ManageChannels,
                PermissionsBitField.Flags.ManageMessages,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.EmbedLinks
            ]
        }

    ];

    // --------------------------------------------------------
    // Staff roles
    // --------------------------------------------------------

    const allStaffRoles =
        [
            ...(guildData.staffRoles.junior || []),
            ...(guildData.staffRoles.middle || []),
            ...(guildData.staffRoles.senior || []),
            ...(guildData.staffRoles.owner || [])
        ];

    for (
        const roleId
        of [...new Set(allStaffRoles)]
    ) {

        const role =
            guild.roles.cache.get(
                roleId
            );

        if (!role) {
            continue;
        }

        permissionOverwrites.push({

            id:
                role.id,

            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.SendMessages
            ]

        });
    }

    const channel =
        await guild.channels.create({

            name:
                ticketName,

            type:
                ChannelType.GuildText,

            parent:
                category.id,

            permissionOverwrites

        });

    guildTickets[ticketId] = {

        id:
            ticketId,

        guildId:
            guild.id,

        channelId:
            channel.id,

        ownerId:
            interaction.user.id,

        claimedBy:
            null,

        status:
            "open",

        panelId:
            panelId,

        createdAt:
            Date.now(),

        closedAt:
            null

    };

    saveData();

    // --------------------------------------------------------
    // Ticket Embed
    // --------------------------------------------------------

    const ticketEmbed =
        new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(
                "🎫 تذكرة جديدة"
            )
            .setDescription(
                `مرحبًا ${interaction.user} 👋\n\n` +
                "سيقوم أحد أعضاء الإدارة بمساعدتك قريبًا.\n" +
                "يرجى كتابة تفاصيل المشكلة أو الطلب هنا."
            )
            .addFields(

                {
                    name: "👤 صاحب التذكرة",
                    value:
                        `${interaction.user}`,
                    inline: true
                },

                {
                    name: "📊 الحالة",
                    value:
                        "🟢 مفتوحة",
                    inline: true
                },

                {
                    name: "🛡️ المستلم",
                    value:
                        "لم يتم الاستلام بعد",
                    inline: true
                }

            )
            .setFooter({
                text:
                    "نظام التذاكر الاحترافي"
            })
            .setTimestamp();

    const claimButton =
        new ButtonBuilder()
            .setCustomId(
                "ticket_claim"
            )
            .setLabel(
                "استلام التذكرة"
            )
            .setEmoji("🙋")
            .setStyle(
                ButtonStyle.Success
            );

    const unclaimButton =
        new ButtonBuilder()
            .setCustomId(
                "ticket_unclaim"
            )
            .setLabel(
                "إلغاء الاستلام"
            )
            .setEmoji("↩️")
            .setStyle(
                ButtonStyle.Secondary
            );

    const closeButton =
        new ButtonBuilder()
            .setCustomId(
                "ticket_close"
            )
            .setLabel(
                "إغلاق"
            )
            .setEmoji("🔒")
            .setStyle(
                ButtonStyle.Danger
            );

    const row =
        new ActionRowBuilder()
            .addComponents(
                claimButton,
                unclaimButton,
                closeButton
            );

    await channel.send({

        content:
            `${interaction.user}`,

        embeds: [
            ticketEmbed
        ],

        components: [
            row
        ]

    });

    await sendLog(
        guild,
        "🎫 إنشاء تذكرة",
        [
            `👤 صاحب التذكرة: ${interaction.user}`,
            `📁 التذكرة: ${channel}`,
            `🆔 ID: \`${ticketId}\``
        ].join("\n"),
        0x5865F2
    );

    return {

        success: true,

        message:
            `✅ تم إنشاء تذكرتك: ${channel}`,

        channel:
            channel,

        ticket:
            guildTickets[ticketId]

    };
}


// ============================================================
// CLAIM TICKET
// ============================================================

async function claimTicket(
    channel,
    member
) {

    const ticket =
        findTicketByChannel(
            channel.guild.id,
            channel.id
        );

    if (!ticket) {

        return {
            success: false,
            message:
                "❌ هذه القناة ليست تذكرة."
        };
    }

    if (
        ticket.status !==
        "open"
    ) {

        return {
            success: false,
            message:
                "❌ هذه التذكرة مغلقة."
        };
    }

    const guildData =
        getGuildData(
            channel.guild.id
        );

    const level =
        getStaffLevel(
            member,
            guildData
        );

    if (
        level < 1
    ) {

        return {
            success: false,
            message:
                "❌ ليس لديك صلاحية استلام التذاكر."
        };
    }

    if (
        ticket.claimedBy
    ) {

        return {
            success: false,
            message:
                `❌ التذكرة مستلمة بالفعل بواسطة <@${ticket.claimedBy}>.`
        };
    }

    ticket.claimedBy =
        member.id;

    const user =
        getUserData(
            channel.guild.id,
            member.id
        );

    user.ticketsClaimed =
        Number(
            user.ticketsClaimed || 0
        ) + 1;

    addPoints(
        channel.guild.id,
        member.id,
        POINTS.ticketClaim
    );

    const stats =
        getStats(
            channel.guild.id,
            member.id
        );

    stats.ticketsClaimed =
        Number(
            stats.ticketsClaimed || 0
        ) + 1;

    saveData();

    // --------------------------------------------------------
    // Give claimer direct send permission
    // --------------------------------------------------------

    await channel.permissionOverwrites.edit(
        member.id,
        {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
        }
    ).catch(() => {});

    const embed =
        new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle(
                "🙋 تم استلام التذكرة"
            )
            .setDescription(
                `قام ${member} باستلام التذكرة.`
            )
            .addFields({

                name:
                    "⭐ نقاط",

                value:
                    `+${POINTS.ticketClaim} نقاط`

            })
            .setTimestamp();

    await channel.send({
        embeds: [
            embed
        ]
    });

    await sendLog(
        channel.guild,
        "🙋 استلام تذكرة",
        [
            `🎫 التذكرة: ${channel}`,
            `👤 المستلم: ${member}`,
            `⭐ النقاط: +${POINTS.ticketClaim}`
        ].join("\n"),
        0x57F287
    );

    return {

        success: true,

        message:
            `✅ تم استلام التذكرة بواسطة ${member}.\n⭐ حصلت على **+${POINTS.ticketClaim} نقاط**.`

    };
}


// ============================================================
// UNCLAIM TICKET
// ============================================================

async function unclaimTicket(
    channel,
    member
) {

    const ticket =
        findTicketByChannel(
            channel.guild.id,
            channel.id
        );

    if (!ticket) {

        return {
            success: false,
            message:
                "❌ هذه القناة ليست تذكرة."
        };
    }

    if (
        !ticket.claimedBy
    ) {

        return {
            success: false,
            message:
                "❌ التذكرة غير مستلمة."
        };
    }

    const guildData =
        getGuildData(
            channel.guild.id
        );

    const actorLevel =
        getStaffLevel(
            member,
            guildData
        );

    const claimer =
        channel.guild.members.cache.get(
            ticket.claimedBy
        );

    const claimerLevel =
        claimer
            ? getStaffLevel(
                claimer,
                guildData
            )
            : 0;

    if (
        member.id !==
            ticket.claimedBy &&
        actorLevel <=
            claimerLevel
    ) {

        return {
            success: false,
            message:
                "❌ لا يمكنك إلغاء استلام هذه التذكرة."
        };
    }

    const oldClaimer =
        ticket.claimedBy;

    ticket.claimedBy =
        null;

    await channel.permissionOverwrites.delete(
        oldClaimer
    ).catch(() => {});

    saveData();

    await channel.send({
        embeds: [

            new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle(
                    "↩️ تم إلغاء استلام التذكرة"
                )
                .setDescription(
                    `تم إلغاء استلام التذكرة بواسطة ${member}.`
                )
                .setTimestamp()

        ]
    });

    return {

        success: true,

        message:
            "✅ تم إلغاء استلام التذكرة."

    };
}


// ============================================================
// CLOSE TICKET
// ============================================================

async function closeTicket(
    channel,
    member
) {

    const ticket =
        findTicketByChannel(
            channel.guild.id,
            channel.id
        );

    if (!ticket) {

        return {
            success: false,
            message:
                "❌ هذه القناة ليست تذكرة."
        };
    }

    if (
        !canManageTicket(
            member,
            ticket
        )
    ) {

        return {
            success: false,
            message:
                "❌ ليس لديك صلاحية إغلاق هذه التذكرة."
        };
    }

    if (
        ticket.status ===
        "closed"
    ) {

        return {
            success: false,
            message:
                "❌ التذكرة مغلقة بالفعل."
        };
    }

    ticket.status =
        "closed";

    ticket.closedAt =
        Date.now();

    saveData();

    await sendLog(
        channel.guild,
        "🔒 إغلاق تذكرة",
        [
            `🎫 التذكرة: ${channel}`,
            `👤 بواسطة: ${member}`,
            `📌 صاحب التذكرة: <@${ticket.ownerId}>`
        ].join("\n"),
        0xED4245
    );

    await channel.send({

        embeds: [

            new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle(
                    "🔒 تم إغلاق التذكرة"
                )
                .setDescription(
                    "سيتم حذف التذكرة بعد قليل."
                )
                .setTimestamp()

        ]

    }).catch(() => {});

    // --------------------------------------------------------
    // Rating before deletion
    // --------------------------------------------------------

    await sendTicketRating(
        channel.guild,
        ticket
    );

    setTimeout(
        async () => {

            await channel.delete(
                "إغلاق التذكرة"
            ).catch(() => {});

        },
        3000
    );

    return {

        success: true,

        message:
            "🔒 تم إغلاق التذكرة وسيتم حذفها بعد قليل."

    };
}


// ============================================================
// DELETE TICKET
// ============================================================

async function deleteTicket(
    channel,
    member
) {

    const ticket =
        findTicketByChannel(
            channel.guild.id,
            channel.id
        );

    if (!ticket) {

        return {
            success: false,
            message:
                "❌ هذه القناة ليست تذكرة."
        };
    }

    const guildData =
        getGuildData(
            channel.guild.id
        );

    const level =
        getStaffLevel(
            member,
            guildData
        );

    if (
        member.id !==
            ticket.ownerId &&
        member.id !==
            ticket.claimedBy &&
        level < 2
    ) {

        return {
            success: false,
            message:
                "❌ ليس لديك صلاحية حذف هذه التذكرة."
        };
    }

    ticket.status =
        "closed";

    ticket.closedAt =
        Date.now();

    saveData();

    await sendLog(
        channel.guild,
        "🗑️ حذف تذكرة",
        [
            `🎫 التذكرة: ${channel}`,
            `👤 بواسطة: ${member}`
        ].join("\n"),
        0xED4245
    );

    await channel.send(
        "🗑️ سيتم حذف التذكرة..."
    ).catch(() => {});

    setTimeout(
        async () => {

            await channel.delete(
                "حذف التذكرة"
            ).catch(() => {});

        },
        1500
    );

    return {

        success: true,

        message:
            "🗑️ سيتم حذف التذكرة."

    };
}


// ============================================================
// TICKET RATING
// ============================================================

async function sendTicketRating(
    guild,
    ticket
) {

    if (
        !ticket.ownerId
    ) {
        return;
    }

    if (
        !ticket.claimedBy
    ) {
        return;
    }

    const owner =
        await guild.members.fetch(
            ticket.ownerId
        ).catch(
            () => null
        );

    if (!owner) {
        return;
    }

    if (
        !data.pendingRatings[
            guild.id
        ]
    ) {

        data.pendingRatings[
            guild.id
        ] = {};
    }

    data.pendingRatings[
        guild.id
    ][ticket.id] = {

        ticketId:
            ticket.id,

        guildId:
            guild.id,

        ownerId:
            ticket.ownerId,

        claimerId:
            ticket.claimedBy,

        createdAt:
            Date.now()

    };

    saveData();

    const buttons = [];

    for (
        let stars = 1;
        stars <= 5;
        stars++
    ) {

        buttons.push(

            new ButtonBuilder()
                .setCustomId(
                    `ticket_rating_${ticket.id}_${stars}`
                )
                .setLabel(
                    `${stars}`
                )
                .setEmoji("⭐")
                .setStyle(
                    ButtonStyle.Secondary
                )

        );
    }

    const row =
        new ActionRowBuilder()
            .addComponents(
                buttons
            );

    try {

        await owner.send({

            embeds: [

                new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setTitle(
                        "⭐ تقييم التذكرة"
                    )
                    .setDescription(
                        `شكرًا لتواصلك معنا في **${guild.name}**.\n\n` +
                        "قيّم خدمة الموظف الذي تعامل مع تذكرتك من 1 إلى 5."
                    )
                    .setTimestamp()

            ],

            components: [
                row
            ]

        });

    } catch {}
}


// ============================================================
// ADD TICKET RATING
// ============================================================

async function addTicketRating(
    guildId,
    ticketId,
    stars,
    userId
) {

    const pending =
        data.pendingRatings[
            guildId
        ]?.[ticketId];

    if (!pending) {

        return {
            success: false,
            message:
                "❌ انتهت صلاحية تقييم هذه التذكرة."
        };
    }

    if (
        pending.ownerId !==
        userId
    ) {

        return {
            success: false,
            message:
                "❌ هذا التقييم ليس خاصًا بك."
        };
    }

    stars =
        Number(stars);

    if (
        stars < 1 ||
        stars > 5
    ) {

        return {
            success: false,
            message:
                "❌ التقييم غير صحيح."
        };
    }

    if (
        !data.ratings[guildId]
    ) {

        data.ratings[guildId] =
            [];
    }

    data.ratings[guildId]
        .push({

            ticketId:
                ticketId,

            ownerId:
                pending.ownerId,

            claimerId:
                pending.claimerId,

            stars:
                stars,

            createdAt:
                Date.now()

        });

    // --------------------------------------------------------
    // Good rating = +3 points
    // --------------------------------------------------------

    if (
        stars >= 4
    ) {

        const user =
            getUserData(
                guildId,
                pending.claimerId
            );

        user.goodRatings =
            Number(
                user.goodRatings || 0
            ) + 1;

        addPoints(
            guildId,
            pending.claimerId,
            POINTS.goodRating
        );
    }

    delete data.pendingRatings[
        guildId
    ][ticketId];

    saveData();

    return {

        success: true,

        message:
            `⭐ تم تسجيل تقييمك: **${stars}/5**.`

    };
}


// ============================================================
// END PART 3
// ============================================================
// ==================================================
// PART 4 — BUTTONS + PREFIX + EVENTS + XP + ANTISPAM
// ==================================================


// ==================================================
// TICKET BUTTONS
// ==================================================

client.on("interactionCreate", async (interaction) => {
    try {
        if (!interaction.isButton()) return;

        if (!interaction.guild) {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: "❌ هذا النظام يعمل داخل السيرفر فقط.",
                    ephemeral: true
                });
            }
            return;
        }

        // ==============================================
        // OPEN TICKET
        // ==============================================

        if (interaction.customId.startsWith("open_ticket_")) {
            const panelId = interaction.customId.replace(
                "open_ticket_",
                ""
            );

            await createTicket(interaction, panelId);
            return;
        }


        // ==============================================
        // CLAIM TICKET
        // ==============================================

        if (interaction.customId === "ticket_claim") {

            const ticket = findTicketByChannel(
                interaction.guild.id,
                interaction.channel.id
            );

            if (!ticket) {
                return interaction.reply({
                    content: "❌ هذه القناة ليست تذكرة.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({
                ephemeral: true
            });

            try {

                await claimTicket(
                    interaction.channel,
                    interaction.member
                );

                await interaction.editReply({
                    content: "✅ تم استلام التذكرة بنجاح."
                });

            } catch (error) {

                await interaction.editReply({
                    content: `❌ ${error.message}`
                });
            }

            return;
        }


        // ==============================================
        // UNCLAIM TICKET
        // ==============================================

        if (interaction.customId === "ticket_unclaim") {

            const ticket = findTicketByChannel(
                interaction.guild.id,
                interaction.channel.id
            );

            if (!ticket) {
                return interaction.reply({
                    content: "❌ هذه القناة ليست تذكرة.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({
                ephemeral: true
            });

            try {

                await unclaimTicket(
                    interaction.channel,
                    interaction.member
                );

                await interaction.editReply({
                    content: "✅ تم إلغاء استلام التذكرة."
                });

            } catch (error) {

                await interaction.editReply({
                    content: `❌ ${error.message}`
                });
            }

            return;
        }


        // ==============================================
        // CLOSE TICKET
        // ==============================================

        if (interaction.customId === "ticket_close") {

            const ticket = findTicketByChannel(
                interaction.guild.id,
                interaction.channel.id
            );

            if (!ticket) {
                return interaction.reply({
                    content: "❌ هذه القناة ليست تذكرة.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({
                ephemeral: true
            });

            try {

                await closeTicket(
                    interaction.channel,
                    interaction.member
                );

                await interaction.editReply({
                    content: "✅ تم إغلاق التذكرة."
                });

            } catch (error) {

                await interaction.editReply({
                    content: `❌ ${error.message}`
                });
            }

            return;
        }


        // ==============================================
        // TICKET RATING
        // ==============================================

        if (
            interaction.customId.startsWith(
                "ticket_rating_"
            )
        ) {

            const parts =
                interaction.customId.split("_");

            const ticketId = parts[2];
            const stars = Number(parts[3]);

            if (
                !ticketId ||
                !Number.isInteger(stars) ||
                stars < 1 ||
                stars > 5
            ) {
                return interaction.reply({
                    content: "❌ التقييم غير صالح.",
                    ephemeral: true
                });
            }

            await interaction.deferReply({
                ephemeral: true
            });

            try {

                await addTicketRating(
                    interaction.guild,
                    ticketId,
                    stars,
                    interaction.user.id
                );

                await interaction.editReply({
                    content:
                        `⭐ تم تسجيل تقييمك: ${stars}/5`
                });

            } catch (error) {

                await interaction.editReply({
                    content: `❌ ${error.message}`
                });
            }

            return;
        }

    } catch (error) {

        console.error(
            "Button Interaction Error:",
            error
        );

        if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
        ) {
            await interaction.reply({
                content:
                    "❌ حدث خطأ أثناء تنفيذ العملية.",
                ephemeral: true
            }).catch(() => {});
        }
    }
});


// ==================================================
// PREFIX COMMAND HELPERS
// ==================================================

function parsePrefixArguments(content) {

    const args = content.trim().split(/\s+/);

    const command = args.shift()?.toLowerCase();

    return {
        command,
        args
    };
}


function findDurationInArgs(args) {

    for (let i = 0; i < args.length; i++) {

        const parsed = parseDuration(args[i]);

        if (parsed) {

            return {
                duration: args[i],
                index: i
            };
        }
    }

    return null;
}


function getReasonWithoutDuration(args, durationIndex) {

    const filtered = args.filter(
        (_, index) => index !== durationIndex
    );

    return filtered.join(" ").trim();
}


async function getPrefixTarget(message, value) {

    if (!value) return null;

    if (message.mentions.members.size > 0) {

        const first =
            message.mentions.members.first();

        if (first) return first;
    }

    const cleanId =
        value.replace(/[<@!>]/g, "");

    if (/^\d{17,20}$/.test(cleanId)) {

        return await message.guild.members
            .fetch(cleanId)
            .catch(() => null);
    }

    return null;
}


function prefixError(message, text) {

    return message.reply({
        content: `❌ ${text}`
    });
}


async function sendPrefixResult(message, text) {

    return message.reply({
        content: text
    });
}


// ==================================================
// PREFIX COMMANDS
// ==================================================

client.on("messageCreate", async (message) => {

    try {

        if (!message.guild) return;

        if (message.author.bot) return;

        const content =
            message.content.trim();

        if (!content.startsWith(PREFIX)) {
            return;
        }

        const withoutPrefix =
            content.slice(PREFIX.length).trim();

        if (!withoutPrefix) return;

        const parsed =
            parsePrefixArguments(withoutPrefix);

        const command =
            parsed.command;

        const args =
            parsed.args;


        // ==============================================
        // HELP
        // ==============================================

        if (
            [
                "help",
                "مساعدة",
                "مساعده"
            ].includes(command)
        ) {

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle("📚 أوامر البوت")
                        .setDescription(
                            [
                                "**🛡️ الإدارة**",
                                "`$ban @member [reason]`",
                                "`$unban USER_ID [reason]`",
                                "`$warn @member duration reason`",
                                "`$ت @member duration reason`",
                                "`$warning @member duration reason`",
                                "`$تحذير @member duration reason`",
                                "`$timeout @member duration reason`",
                                "`$تايم @member duration reason`",
                                "`$jail @member duration reason`",
                                "`$سجن @member duration reason`",
                                "",
                                "**🎫 التذاكر**",
                                "`$close` / `$قفل`",
                                "`$delete` / `$حذف`",
                                "",
                                "**📊 النقاط والإحصائيات**",
                                "`$points [@member]`",
                                "`$xp [@member]`",
                                "`$stats [@member]`",
                                "`$time [@member]`",
                                "",
                                "**💰 الاقتصاد**",
                                "`$balance [@member]`",
                                "`$pay @member amount`",
                                "",
                                "يمكن استخدام جميع الأوامر الأساسية أيضًا من خلال `/`."
                            ].join("\n")
                        )
                        .setFooter({
                            text: "Professional Discord Bot"
                        })
                ]
            });
        }


        // ==============================================
        // CLOSE TICKET
        // ==============================================

        if (
            [
                "close",
                "قفل"
            ].includes(command)
        ) {

            if (
                !findTicketByChannel(
                    message.guild.id,
                    message.channel.id
                )
            ) {
                return prefixError(
                    message,
                    "هذه القناة ليست تذكرة."
                );
            }

            try {

                await closeTicket(
                    message.channel,
                    message.member
                );

                return;

            } catch (error) {

                return prefixError(
                    message,
                    error.message
                );
            }
        }


        // ==============================================
        // DELETE TICKET
        // ==============================================

        if (
            [
                "delete",
                "حذف"
            ].includes(command)
        ) {

            if (
                !findTicketByChannel(
                    message.guild.id,
                    message.channel.id
                )
            ) {
                return prefixError(
                    message,
                    "هذه القناة ليست تذكرة."
                );
            }

            try {

                await deleteTicket(
                    message.channel,
                    message.member
                );

                return;

            } catch (error) {

                return prefixError(
                    message,
                    error.message
                );
            }
        }


        // ==============================================
        // BAN
        // ==============================================

        if (
            [
                "ban",
                "حظر"
            ].includes(command)
        ) {

            if (
                !message.member.permissions.has(
                    PermissionsBitField.Flags.BanMembers
                ) &&
                getStaffLevel(
                    message.member,
                    getGuildData(message.guild.id)
                ) < 1
            ) {
                return prefixError(
                    message,
                    "ليس لديك صلاحية استخدام الأمر."
                );
            }

            const target =
                await getPrefixTarget(
                    message,
                    args[0]
                );

            if (!target) {
                return prefixError(
                    message,
                    "استخدم: `$ban @العضو السبب`"
                );
            }

            const reason =
                args
                    .slice(1)
                    .join(" ") ||
                "No reason provided";

            const guildData =
                getGuildData(
                    message.guild.id
                );

            if (
                !canModerateTarget(
                    message.member,
                    target,
                    guildData
                )
            ) {
                return prefixError(
                    message,
                    "لا يمكنك تنفيذ الأمر على هذا العضو بسبب مستوى الإدارة."
                );
            }

            try {

                await executeBan(
                    message.guild,
                    target,
                    message.member,
                    reason
                );

                return sendPrefixResult(
                    message,
                    `🔨 تم حظر ${target} بنجاح.`
                );

            } catch (error) {

                return prefixError(
                    message,
                    error.message
                );
            }
        }


        // ==============================================
        // WARN
        // ==============================================

        if (
            [
                "warn",
                "warning",
                "ت",
                "تحذير"
            ].includes(command)
        ) {

            const guildData =
                getGuildData(
                    message.guild.id
                );

            if (
                getStaffLevel(
                    message.member,
                    guildData
                ) < 1
            ) {
                return prefixError(
                    message,
                    "ليس لديك صلاحية إعطاء تحذير."
                );
            }

            const target =
                await getPrefixTarget(
                    message,
                    args[0]
                );

            if (!target) {
                return prefixError(
                    message,
                    "استخدم: `$warn @العضو 30m السبب`"
                );
            }

            if (
                !canModerateTarget(
                    message.member,
                    target,
                    guildData
                )
            ) {
                return prefixError(
                    message,
                    "لا يمكنك تحذير هذا العضو بسبب مستوى الإدارة."
                );
            }

            const remainingArgs =
                args.slice(1);

            const durationData =
                findDurationInArgs(
                    remainingArgs
                );

            if (!durationData) {
                return prefixError(
                    message,
                    "يجب تحديد مدة مثل `30m` أو `1h`."
                );
            }

            const duration =
                durationData.duration;

            const reason =
                getReasonWithoutDuration(
                    remainingArgs,
                    durationData.index
                ) ||
                "لم يتم تحديد سبب.";

            try {

                await executeWarn(
                    message.guild,
                    target,
                    message.member,
                    reason,
                    duration
                );

                return sendPrefixResult(
                    message,
                    `⚠️ تم تحذير ${target} لمدة ${duration}.`
                );

            } catch (error) {

                return prefixError(
                    message,
                    error.message
                );
            }
        }


        // ==============================================
        // TIMEOUT
        // ==============================================

        if (
            [
                "timeout",
                "تايم",
                "تايم اوت",
                "timeoutmember"
            ].includes(command)
        ) {

            const guildData =
                getGuildData(
                    message.guild.id
                );

            if (
                getStaffLevel(
                    message.member,
                    guildData
                ) < 1
            ) {
                return prefixError(
                    message,
                    "ليس لديك صلاحية إعطاء تايم أوت."
                );
            }

            const target =
                await getPrefixTarget(
                    message,
                    args[0]
                );

            if (!target) {
                return prefixError(
                    message,
                    "استخدم: `$timeout @العضو 10m السبب`"
                );
            }

            if (
                !canModerateTarget(
                    message.member,
                    target,
                    guildData
                )
            ) {
                return prefixError(
                    message,
                    "لا يمكنك تنفيذ التايم أوت على هذا العضو."
                );
            }

            const remainingArgs =
                args.slice(1);

            const durationData =
                findDurationInArgs(
                    remainingArgs
                );

            if (!durationData) {
                return prefixError(
                    message,
                    "يجب تحديد مدة."
                );
            }

            const duration =
                durationData.duration;

            const reason =
                getReasonWithoutDuration(
                    remainingArgs,
                    durationData.index
                ) ||
                "لم يتم تحديد سبب.";

            try {

                await executeTimeout(
                    message.guild,
                    target,
                    message.member,
                    reason,
                    duration
                );

                return sendPrefixResult(
                    message,
                    `⏱️ تم إعطاء ${target} تايم أوت لمدة ${duration}.`
                );

            } catch (error) {

                return prefixError(
                    message,
                    error.message
                );
            }
        }


        // ==============================================
        // JAIL
        // ==============================================

        if (
            [
                "jail",
                "سجن"
            ].includes(command)
        ) {

            const guildData =
                getGuildData(
                    message.guild.id
                );

            const level =
                getStaffLevel(
                    message.member,
                    guildData
                );

            if (level < 3) {
                return prefixError(
                    message,
                    "السجن متاح فقط للإدارة العليا والأونر."
                );
            }

            const target =
                await getPrefixTarget(
                    message,
                    args[0]
                );

            if (!target) {
                return prefixError(
                    message,
                    "استخدم: `$jail @العضو 1h السبب`"
                );
            }

            if (
                !canModerateTarget(
                    message.member,
                    target,
                    guildData
                )
            ) {
                return prefixError(
                    message,
                    "لا يمكنك سجن هذا العضو بسبب مستوى الإدارة."
                );
            }

            const remainingArgs =
                args.slice(1);

            const durationData =
                findDurationInArgs(
                    remainingArgs
                );

            if (!durationData) {
                return prefixError(
                    message,
                    "يجب تحديد مدة السجن."
                );
            }

            const duration =
                durationData.duration;

            const reason =
                getReasonWithoutDuration(
                    remainingArgs,
                    durationData.index
                ) ||
                "لم يتم تحديد سبب.";

            try {

                await executeJail(
                    message.guild,
                    target,
                    message.member,
                    reason,
                    duration
                );

                return sendPrefixResult(
                    message,
                    `🔒 تم سجن ${target} لمدة ${duration}.`
                );

            } catch (error) {

                return prefixError(
                    message,
                    error.message
                );
            }
        }


        // ==============================================
        // POINTS
        // ==============================================

        if (
            [
                "points",
                "نقاط",
                "نقاطي"
            ].includes(command)
        ) {

            let target = message.member;

            if (args[0]) {

                const resolved =
                    await getPrefixTarget(
                        message,
                        args[0]
                    );

                if (resolved) {
                    target = resolved;
                }
            }

            const user =
                getUserData(
                    message.guild.id,
                    target.id
                );

            const stats =
                getStats(
                    message.guild.id,
                    target.id
                );

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xF1C40F)
                        .setTitle(`⭐ نقاط ${target.displayName}`)
                        .addFields(
                            {
                                name: "🏆 نقاط الإجراءات",
                                value: `${user.actionPoints || 0}`,
                                inline: true
                            },
                            {
                                name: "⚠️ التحذيرات",
                                value: `${user.warnings || 0}`,
                                inline: true
                            },
                            {
                                name: "⏱️ التايم أوت",
                                value: `${user.timeouts || 0}`,
                                inline: true
                            },
                            {
                                name: "🔒 السجن",
                                value: `${user.jails || 0}`,
                                inline: true
                            },
                            {
                                name: "🎫 التذاكر المستلمة",
                                value: `${user.ticketsClaimed || 0}`,
                                inline: true
                            },
                            {
                                name: "⭐ التقييمات الجيدة",
                                value: `${user.goodRatings || 0}`,
                                inline: true
                            },
                            {
                                name: "📈 XP",
                                value: `${user.xp || 0}`,
                                inline: true
                            },
                            {
                                name: "💰 الرصيد",
                                value: `${user.coins || 0}`,
                                inline: true
                            },
                            {
                                name: "📊 إجمالي النقاط",
                                value: `${stats.points || user.actionPoints || 0}`,
                                inline: true
                            }
                        )
                ]
            });
        }


        // ==============================================
        // XP
        // ==============================================

        if (
            [
                "xp"
            ].includes(command)
        ) {

            let target = message.member;

            if (args[0]) {

                const resolved =
                    await getPrefixTarget(
                        message,
                        args[0]
                    );

                if (resolved) {
                    target = resolved;
                }
            }

            const user =
                getUserData(
                    message.guild.id,
                    target.id
                );

            return message.reply({
                content:
                    `📈 XP الخاص بـ ${target}: **${user.xp || 0}**`
            });
        }


        // ==============================================
        // BALANCE
        // ==============================================

        if (
            [
                "balance",
                "bal",
                "رصيد"
            ].includes(command)
        ) {

            let target = message.member;

            if (args[0]) {

                const resolved =
                    await getPrefixTarget(
                        message,
                        args[0]
                    );

                if (resolved) {
                    target = resolved;
                }
            }

            const user =
                getUserData(
                    message.guild.id,
                    target.id
                );

            const guildData =
                getGuildData(
                    message.guild.id
                );

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0x2ECC71)
                        .setTitle("💰 الرصيد")
                        .setDescription(
                            `${target}\n\nالرصيد: **${user.coins || 0} ${guildData.currencyName || "Coins"}**`
                        )
                ]
            });
        }


        // ==============================================
        // PAY
        // ==============================================

        if (
            [
                "pay",
                "تحويل"
            ].includes(command)
        ) {

            const target =
                await getPrefixTarget(
                    message,
                    args[0]
                );

            const amount =
                Number(args[1]);

            if (!target || !Number.isInteger(amount) || amount <= 0) {
                return prefixError(
                    message,
                    "استخدم: `$pay @العضو 100`"
                );
            }

            if (target.id === message.author.id) {
                return prefixError(
                    message,
                    "لا يمكنك تحويل الأموال لنفسك."
                );
            }

            try {

                const sender =
                    getUserData(
                        message.guild.id,
                        message.author.id
                    );

                const receiver =
                    getUserData(
                        message.guild.id,
                        target.id
                    );

                if ((sender.coins || 0) < amount) {
                    return prefixError(
                        message,
                        "رصيدك غير كافي."
                    );
                }

                sender.coins -= amount;
                receiver.coins += amount;

                saveData();

                return sendPrefixResult(
                    message,
                    `💸 تم تحويل **${amount}** إلى ${target}.`
                );

            } catch (error) {

                return prefixError(
                    message,
                    error.message
                );
            }
        }


        // ==============================================
        // TIME / JAIL STATUS
        // ==============================================

        if (
            [
                "time",
                "الوقت",
                "مدة"
            ].includes(command)
        ) {

            let target = message.member;

            if (args[0]) {

                const resolved =
                    await getPrefixTarget(
                        message,
                        args[0]
                    );

                if (resolved) {
                    target = resolved;
                }
            }

            const jail =
                getActiveJail(
                    message.guild.id,
                    target.id
                );

            if (!jail) {
                return sendPrefixResult(
                    message,
                    `ℹ️ ${target} ليس مسجونًا حاليًا.`
                );
            }

            const remaining =
                Math.max(
                    0,
                    jail.expiresAt - Date.now()
                );

            return sendPrefixResult(
                message,
                `🔒 ${target} مسجون.\n⏳ المتبقي: **${formatDuration(remaining)}**`
            );
        }


        // ==============================================
        // UNKNOWN PREFIX COMMAND
        // ==============================================

        return;

    } catch (error) {

        console.error(
            "Prefix Command Error:",
            error
        );

        if (
            message.channel &&
            message.channel.isTextBased()
        ) {
            message.reply({
                content:
                    "❌ حدث خطأ أثناء تنفيذ الأمر."
            }).catch(() => {});
        }
    }
});


// ==================================================
// TICKET MESSAGE PERMISSIONS
// ==================================================

client.on("messageCreate", async (message) => {

    try {

        if (!message.guild) return;

        if (message.author.bot) return;

        const ticket =
            findTicketByChannel(
                message.guild.id,
                message.channel.id
            );

        if (!ticket) return;

        const guildData =
            getGuildData(
                message.guild.id
            );

        const member =
            message.member;

        if (!member) return;

        // صاحب التذكرة دائمًا مسموح له
        if (
            ticket.userId === member.id
        ) {
            return;
        }

        const level =
            getStaffLevel(
                member,
                guildData
            );

        // عضو عادي ليس صاحب التذكرة
        if (level <= 0) {

            await message.delete().catch(() => {});

            return;
        }

        // التذكرة غير مستلمة:
        // الموظفون مسموح لهم بالكتابة
        if (!ticket.claimedBy) {
            return;
        }

        // المستلم
        if (
            ticket.claimedBy === member.id
        ) {
            return;
        }

        let claimerLevel = 0;

        try {

            const claimer =
                await message.guild.members.fetch(
                    ticket.claimedBy
                );

            claimerLevel =
                getStaffLevel(
                    claimer,
                    guildData
                );

        } catch {
            claimerLevel = 0;
        }

        // الإدارة الأعلى من المستلم مسموح لها
        if (
            level > claimerLevel
        ) {
            return;
        }

        // غير مسموح
        await message.delete().catch(() => {});

        const warning =
            await message.channel.send({
                content:
                    `⛔ ${member} هذه التذكرة مستلمة من <@${ticket.claimedBy}>، ولا يمكنك الكتابة فيها حاليًا.`
            }).catch(() => null);

        if (warning) {

            setTimeout(() => {
                warning.delete().catch(() => {});
            }, 3000);
        }

    } catch (error) {

        console.error(
            "Ticket Permission Error:",
            error
        );
    }
});


// ==================================================
// ANTI SPAM
// ==================================================

const spamTracker = new Map();


client.on("messageCreate", async (message) => {

    try {

        if (!message.guild) return;

        if (message.author.bot) return;

        const guildData =
            getGuildData(
                message.guild.id
            );

        if (
            !guildData.antiSpam ||
            !guildData.antiSpam.enabled
        ) {
            return;
        }

        const key =
            `${message.guild.id}:${message.author.id}`;

        let record =
            spamTracker.get(key);

        if (!record) {

            record = {
                messages: [],
                lastContent: "",
                warned: false
            };

            spamTracker.set(
                key,
                record
            );
        }

        const now =
            Date.now();

        const windowTime =
            guildData.antiSpam.timeWindow || 5000;

        record.messages =
            record.messages.filter(
                item =>
                    now - item.timestamp <= windowTime
            );

        const normalized =
            message.content
                .trim()
                .toLowerCase();

        record.messages.push({
            id: message.id,
            timestamp: now,
            content: normalized
        });

        const maxMessages =
            guildData.antiSpam.maxMessages || 5;

        // نفس الرسالة تتكرر
        const sameMessages =
            record.messages.filter(
                item =>
                    item.content === normalized &&
                    normalized.length > 0
            );

        if (
            sameMessages.length >= maxMessages
        ) {

            if (
                guildData.antiSpam.deleteMessages
            ) {

                for (
                    const item of record.messages
                ) {

                    const msg =
                        await message.channel.messages
                            .fetch(item.id)
                            .catch(() => null);

                    if (msg) {
                        await msg.delete().catch(() => {});
                    }
                }
            }

            const warning =
                await message.channel.send({
                    content:
                        `⛔ ${message.author} كفاية سبام! تم حذف رسائل السبام.`
                }).catch(() => null);

            if (warning) {

                setTimeout(() => {
                    warning.delete().catch(() => {});
                }, 3000);
            }

            await sendLog(
                message.guild,
                "🚨 Anti-Spam",
                `${message.author} قام بتكرار نفس الرسالة أكثر من ${maxMessages} مرات.`,
                0xE74C3C
            );

            record.messages = [];

            return;
        }

    } catch (error) {

        console.error(
            "Anti Spam Error:",
            error
        );
    }
});


// ==================================================
// XP + MESSAGE COUNTER
// ==================================================

client.on("messageCreate", async (message) => {

    try {

        if (!message.guild) return;

        if (message.author.bot) return;

        const user =
            getUserData(
                message.guild.id,
                message.author.id
            );

        user.messages =
            (user.messages || 0) + 1;

        const now =
            Date.now();

        // XP مرة كل 30 ثانية
        if (
            !user.lastXp ||
            now - user.lastXp >= 30000
        ) {

            user.xp =
                (user.xp || 0) + 10;

            user.lastXp =
                now;
        }

        const stats =
            getStats(
                message.guild.id,
                message.author.id
            );

        stats.messages =
            (stats.messages || 0) + 1;

        stats.xp =
            user.xp;

        saveData();

    } catch (error) {

        console.error(
            "XP Error:",
            error
        );
    }
});


// ==================================================
// WELCOME
// ==================================================

client.on("guildMemberAdd", async (member) => {

    try {

        const guildData =
            getGuildData(
                member.guild.id
            );

        if (
            !guildData.welcomeEnabled ||
            !guildData.welcomeChannelId
        ) {
            return;
        }

        const channel =
            member.guild.channels.cache.get(
                guildData.welcomeChannelId
            );

        if (!channel) return;

        const embed =
            new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle("👋 عضو جديد!")
                .setDescription(
                    `أهلًا وسهلًا ${member} في **${member.guild.name}** 🎉\n\nنتمنى لك وقتًا ممتعًا معنا!`
                )
                .setThumbnail(
                    member.user.displayAvatarURL({
                        size: 256
                    })
                )
                .setFooter({
                    text:
                        `Member #${member.guild.memberCount}`
                })
                .setTimestamp();

        await channel.send({
            embeds: [embed]
        });

    } catch (error) {

        console.error(
            "Welcome Error:",
            error
        );
    }
});


// ==================================================
// GOODBYE
// ==================================================

client.on("guildMemberRemove", async (member) => {

    try {

        const guildData =
            getGuildData(
                member.guild.id
            );

        if (
            !guildData.goodbyeEnabled ||
            !guildData.goodbyeChannelId
        ) {
            return;
        }

        const channel =
            member.guild.channels.cache.get(
                guildData.goodbyeChannelId
            );

        if (!channel) return;

        const embed =
            new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle("👋 عضو غادر السيرفر")
                .setDescription(
                    `غادر **${member.user.tag}** السيرفر.`
                )
                .setThumbnail(
                    member.user.displayAvatarURL({
                        size: 256
                    })
                )
                .setTimestamp();

        await channel.send({
            embeds: [embed]
        });

    } catch (error) {

        console.error(
            "Goodbye Error:",
            error
        );
    }
});


// ==================================================
// BOT JOINS NEW SERVER
// ==================================================

client.on("guildCreate", async (guild) => {

    try {

        getGuildData(guild.id);

        saveData();

        console.log(
            `Joined guild: ${guild.name} (${guild.id})`
        );

        await sendLog(
            guild,
            "🤖 Bot Added",
            `تمت إضافة البوت إلى السيرفر:\n**${guild.name}**`,
            0x5865F2
        );

    } catch (error) {

        console.error(
            "Guild Create Error:",
            error
        );
    }
});


// ==================================================
// CLEAN TICKET DATA WHEN CHANNEL IS DELETED
// ==================================================

client.on("channelDelete", async (channel) => {

    try {

        if (!channel.guild) return;

        const tickets =
            getGuildTickets(
                channel.guild.id
            );

        const index =
            tickets.findIndex(
                ticket =>
                    ticket.channelId === channel.id
            );

        if (index === -1) return;

        tickets[index].closed = true;
        tickets[index].closedAt = Date.now();

        saveData();

    } catch (error) {

        console.error(
            "Channel Delete Error:",
            error
        );
    }
});


// ==================================================
// EXPIRED WARNINGS + JAILS CLEANUP
// ==================================================

async function cleanupExpiredData() {

    try {

        const now =
            Date.now();

        let changed = false;


        // ==============================================
        // WARNINGS
        // ==============================================

        for (
            const guildId of Object.keys(
                data.warnings || {}
            )
        ) {

            const guildWarnings =
                data.warnings[guildId];

            for (
                const userId of Object.keys(
                    guildWarnings || {}
                )
            ) {

                const list =
                    guildWarnings[userId] || [];

                const active =
                    list.filter(
                        warning =>
                            warning.expiresAt > now
                    );

                if (
                    active.length !== list.length
                ) {

                    guildWarnings[userId] =
                        active;

                    changed = true;
                }

                if (
                    active.length === 0
                ) {

                    delete guildWarnings[userId];

                    changed = true;
                }
            }
        }


        // ==============================================
        // JAILS
        // ==============================================

        for (
            const guildId of Object.keys(
                data.jails || {}
            )
        ) {

            const guild =
                client.guilds.cache.get(
                    guildId
                );

            if (!guild) continue;

            const records =
                data.jails[guildId] || [];

            for (
                const jail of [...records]
            ) {

                if (
                    jail.expiresAt <= now
                ) {

                    await releaseFromJail(
                        guild,
                        jail.userId
                    ).catch(error => {

                        console.error(
                            "Jail Release Error:",
                            error
                        );
                    });

                    changed = true;
                }
            }
        }

        if (changed) {
            saveData();
        }

    } catch (error) {

        console.error(
            "Cleanup Error:",
            error
        );
    }
}


// ==================================================
// CLEANUP EVERY 10 SECONDS
// ==================================================

setInterval(
    cleanupExpiredData,
    10000
);


// ==================================================
// READY
// ==================================================

client.once("ready", async () => {

    try {

        const application =
            await client.application.fetch();

        APPLICATION_OWNER_ID =
            application.owner?.id || null;

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
            "=========================================="
        );

        console.log(
            `✅ Logged in as ${client.user.tag}`
        );

        console.log(
            `🏠 Servers: ${client.guilds.cache.size}`
        );

        console.log(
            `👑 Owner ID: ${APPLICATION_OWNER_ID || "Unknown"}`
        );

        console.log(
            "=========================================="
        );

    } catch (error) {

        console.error(
            "Ready Error:",
            error
        );
    }
});


// ==================================================
// LOGIN
// ==================================================

if (!TOKEN) {

    console.error(
        "❌ DISCORD_TOKEN غير موجود في Environment Variables."
    );

    process.exit(1);
}

client.login(TOKEN)
    .then(() => {

        console.log(
            "🔄 Connecting to Discord..."
        );

    })
    .catch(error => {

        console.error(
            "❌ Discord Login Error:",
            error
        );

        process.exit(1);
    });


// ==================================================
// END PART 4
// ==================================================
