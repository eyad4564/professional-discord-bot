// ==================================================
// PROFESSIONAL DISCORD BOT
// PART 1 - CORE / CONFIG / DATABASE / HELPERS
// ==================================================

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
    SlashCommandBuilder,
    AttachmentBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");


// ==================================================
// ENVIRONMENT
// ==================================================

const TOKEN =
    process.env.DISCORD_TOKEN;

const PREFIX =
    process.env.PREFIX || "$";

let APPLICATION_OWNER_ID =
    null;


// ==================================================
// STAFF ROLES
// ==================================================

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


// ==================================================
// POINTS SYSTEM
// ==================================================

const POINTS = {

    warning: 3,

    timeout: 3,

    jail: 5,

    ticketClaim: 3,

    goodRating: 3
};


// ==================================================
// DEFAULT DATABASE
// ==================================================

const DB_PATH =
    path.join(
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


// ==================================================
// LOAD DATABASE
// ==================================================

function loadData() {

    try {

        if (
            !fs.existsSync(DB_PATH)
        ) {

            fs.writeFileSync(
                DB_PATH,
                JSON.stringify(
                    DEFAULT_DATA,
                    null,
                    4
                )
            );

            return JSON.parse(
                JSON.stringify(
                    DEFAULT_DATA
                )
            );
        }

        const raw =
            fs.readFileSync(
                DB_PATH,
                "utf8"
            );

        if (!raw.trim()) {

            return JSON.parse(
                JSON.stringify(
                    DEFAULT_DATA
                )
            );
        }

        const parsed =
            JSON.parse(raw);

        return {

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
            "Database Load Error:",
            error
        );

        return JSON.parse(
            JSON.stringify(
                DEFAULT_DATA
            )
        );
    }
}


// ==================================================
// GLOBAL DATA
// ==================================================

const data =
    loadData();


// ==================================================
// SAVE DATABASE
// ==================================================

function saveData() {

    try {

        fs.writeFileSync(
            DB_PATH,
            JSON.stringify(
                data,
                null,
                4
            )
        );

    } catch (error) {

        console.error(
            "Database Save Error:",
            error
        );
    }
}


// ==================================================
// CLIENT
// ==================================================

const client =
    new Client({

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


// ==================================================
// GET GUILD DATA
// ==================================================

function getGuildData(
    guildId
) {

    if (
        !data.guilds[guildId]
    ) {

        data.guilds[guildId] = {};
    }

    const guildData =
        data.guilds[guildId];


    // ----------------------------------------------
    // BASIC
    // ----------------------------------------------

    if (
        guildData.setupCompleted === undefined
    ) {
        guildData.setupCompleted = false;
    }


    // ----------------------------------------------
    // TICKETS
    // ----------------------------------------------

    if (
        guildData.ticketCategoryId === undefined
    ) {
        guildData.ticketCategoryId = null;
    }


    // ----------------------------------------------
    // JAIL
    // ----------------------------------------------

    if (
        guildData.jailRoleId === undefined
    ) {
        guildData.jailRoleId = null;
    }


    // ----------------------------------------------
    // LOGS
    // ----------------------------------------------

    if (
        guildData.logsChannelId === undefined
    ) {
        guildData.logsChannelId = null;
    }


    // ----------------------------------------------
    // WELCOME
    // ----------------------------------------------

    if (
        guildData.welcomeChannelId === undefined
    ) {
        guildData.welcomeChannelId = null;
    }

    if (
        guildData.welcomeEnabled === undefined
    ) {
        guildData.welcomeEnabled = false;
    }


    // ----------------------------------------------
    // GOODBYE
    // ----------------------------------------------

    if (
        guildData.goodbyeChannelId === undefined
    ) {
        guildData.goodbyeChannelId = null;
    }

    if (
        guildData.goodbyeEnabled === undefined
    ) {
        guildData.goodbyeEnabled = false;
    }


    // ----------------------------------------------
    // CURRENCY
    // ----------------------------------------------

    if (
        guildData.currencyEnabled === undefined
    ) {
        guildData.currencyEnabled = true;
    }

    if (
        guildData.currencyName === undefined
    ) {
        guildData.currencyName = "Coins";
    }

    if (
        guildData.currencySymbol === undefined
    ) {
        guildData.currencySymbol = "💰";
    }


    // ----------------------------------------------
    // STAFF ROLES
    // ----------------------------------------------

    if (
        !guildData.staffRoles
    ) {

        guildData.staffRoles = {};
    }

    if (
        !Array.isArray(
            guildData.staffRoles.junior
        )
    ) {

        guildData.staffRoles.junior =
            [...STAFF_ROLES.junior];
    }

    if (
        !Array.isArray(
            guildData.staffRoles.middle
        )
    ) {

        guildData.staffRoles.middle =
            [...STAFF_ROLES.middle];
    }

    if (
        !Array.isArray(
            guildData.staffRoles.senior
        )
    ) {

        guildData.staffRoles.senior =
            [...STAFF_ROLES.senior];
    }

    if (
        !Array.isArray(
            guildData.staffRoles.owner
        )
    ) {

        guildData.staffRoles.owner =
            [...STAFF_ROLES.owner];
    }


    // ----------------------------------------------
    // TICKET PANELS
    // ----------------------------------------------

    if (
        !guildData.ticketPanels
    ) {

        guildData.ticketPanels = {};
    }


    // ----------------------------------------------
    // ANTI SPAM
    // ----------------------------------------------

    if (
        !guildData.antiSpam
    ) {

        guildData.antiSpam = {};
    }

    if (
        guildData.antiSpam.enabled === undefined
    ) {

        guildData.antiSpam.enabled =
            true;
    }

    if (
        guildData.antiSpam.maxMessages === undefined
    ) {

        guildData.antiSpam.maxMessages =
            5;
    }

    if (
        guildData.antiSpam.timeWindow === undefined
    ) {

        guildData.antiSpam.timeWindow =
            5000;
    }

    if (
        guildData.antiSpam.deleteMessages === undefined
    ) {

        guildData.antiSpam.deleteMessages =
            true;
    }

    return guildData;
}


// ==================================================
// GET USER DATA
// ==================================================

function getUserData(
    guildId,
    userId
) {

    if (
        !data.users[guildId]
    ) {

        data.users[guildId] = {};
    }

    if (
        !data.users[guildId][userId]
    ) {

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

            goodRatings: 0,

            lastXp: 0,

            lastDaily: 0
        };
    }

    const user =
        data.users[guildId][userId];


    if (
        user.xp === undefined
    ) user.xp = 0;

    if (
        user.actionPoints === undefined
    ) user.actionPoints = 0;

    if (
        user.warnings === undefined
    ) user.warnings = 0;

    if (
        user.timeouts === undefined
    ) user.timeouts = 0;

    if (
        user.jails === undefined
    ) user.jails = 0;

    if (
        user.ticketsClaimed === undefined
    ) user.ticketsClaimed = 0;

    if (
        user.ticketsClosed === undefined
    ) user.ticketsClosed = 0;

    if (
        user.bans === undefined
    ) user.bans = 0;

    if (
        user.messages === undefined
    ) user.messages = 0;

    if (
        user.coins === undefined
    ) user.coins = 0;

    if (
        user.goodRatings === undefined
    ) user.goodRatings = 0;

    if (
        user.lastXp === undefined
    ) user.lastXp = 0;

    if (
        user.lastDaily === undefined
    ) user.lastDaily = 0;

    return user;
}


// ==================================================
// GET STATS
// ==================================================

function getStats(
    guildId,
    userId
) {

    if (
        !data.stats[guildId]
    ) {

        data.stats[guildId] = {};
    }

    if (
        !data.stats[guildId][userId]
    ) {

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


    if (
        stats.warnings === undefined
    ) stats.warnings = 0;

    if (
        stats.timeouts === undefined
    ) stats.timeouts = 0;

    if (
        stats.jails === undefined
    ) stats.jails = 0;

    if (
        stats.bans === undefined
    ) stats.bans = 0;

    if (
        stats.ticketsClaimed === undefined
    ) stats.ticketsClaimed = 0;

    if (
        stats.ticketsClosed === undefined
    ) stats.ticketsClosed = 0;

    if (
        stats.points === undefined
    ) stats.points = 0;

    if (
        stats.xp === undefined
    ) stats.xp = 0;

    if (
        stats.messages === undefined
    ) stats.messages = 0;

    if (
        stats.ratings === undefined
    ) stats.ratings = 0;

    if (
        stats.goodRatings === undefined
    ) stats.goodRatings = 0;

    return stats;
}


// ==================================================
// STAFF LEVEL
// ==================================================

function getStaffLevel(
    member,
    guildData
) {

    if (!member) {
        return 0;
    }

    if (!guildData) {
        return 0;
    }

    const roles =
        guildData.staffRoles || {};


    // OWNER
    if (
        Array.isArray(roles.owner) &&
        roles.owner.some(
            roleId =>
                member.roles.cache.has(
                    roleId
                )
        )
    ) {

        return 4;
    }


    // SENIOR
    if (
        Array.isArray(roles.senior) &&
        roles.senior.some(
            roleId =>
                member.roles.cache.has(
                    roleId
                )
        )
    ) {

        return 3;
    }


    // MIDDLE
    if (
        Array.isArray(roles.middle) &&
        roles.middle.some(
            roleId =>
                member.roles.cache.has(
                    roleId
                )
        )
    ) {

        return 2;
    }


    // JUNIOR
    if (
        Array.isArray(roles.junior) &&
        roles.junior.some(
            roleId =>
                member.roles.cache.has(
                    roleId
                )
        )
    ) {

        return 1;
    }

    return 0;
}


// ==================================================
// STAFF CHECK
// ==================================================

function isStaff(
    member,
    guildData
) {

    return (
        getStaffLevel(
            member,
            guildData
        ) > 0
    );
}


// ==================================================
// MODERATION TARGET CHECK
// ==================================================

function canModerateTarget(
    moderator,
    target,
    guildData
) {

    if (!moderator || !target) {
        return false;
    }

    if (
        moderator.id === target.id
    ) {
        return false;
    }

    // البوت مالكه يقدر يدير الكل
    if (
        APPLICATION_OWNER_ID &&
        moderator.id ===
        APPLICATION_OWNER_ID
    ) {
        return true;
    }

    const moderatorLevel =
        getStaffLevel(
            moderator,
            guildData
        );

    const targetLevel =
        getStaffLevel(
            target,
            guildData
        );

    if (
        moderatorLevel <= 0
    ) {
        return false;
    }

    // لا يسمح بإدارة نفس المستوى
    // أو مستوى أعلى
    return (
        moderatorLevel >
        targetLevel
    );
}


// ==================================================
// ADD POINTS
// ==================================================

function addPoints(
    guildId,
    userId,
    amount
) {

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

    user.actionPoints =
        (user.actionPoints || 0) +
        amount;

    stats.points =
        (stats.points || 0) +
        amount;
}


// ==================================================
// ADD XP
// ==================================================

function addXP(
    guildId,
    userId,
    amount
) {

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

    user.xp =
        (user.xp || 0) +
        amount;

    stats.xp =
        user.xp;
}


// ==================================================
// COINS
// ==================================================

function getBalance(
    guildId,
    userId
) {

    const user =
        getUserData(
            guildId,
            userId
        );

    return (
        user.coins || 0
    );
}


function addCoins(
    guildId,
    userId,
    amount
) {

    const user =
        getUserData(
            guildId,
            userId
        );

    user.coins =
        (user.coins || 0) +
        amount;

    saveData();
}


function removeCoins(
    guildId,
    userId,
    amount
) {

    const user =
        getUserData(
            guildId,
            userId
        );

    if (
        (user.coins || 0) <
        amount
    ) {

        return false;
    }

    user.coins =
        (user.coins || 0) -
        amount;

    saveData();

    return true;
}


// ==================================================
// DURATION PARSER
// ==================================================

function parseDuration(
    input
) {

    if (!input) {
        return null;
    }

    const value =
        String(input)
            .trim()
            .toLowerCase();

    const match =
        value.match(
            /^(\d+)\s*(s|sec|secs|m|min|mins|h|hr|hrs|d|day|days|w|week|weeks)$/i
        );

    if (!match) {
        return null;
    }

    const number =
        Number(match[1]);

    const unit =
        match[2].toLowerCase();

    if (
        !Number.isFinite(number) ||
        number <= 0
    ) {
        return null;
    }

    let milliseconds =
        0;

    if (
        [
            "s",
            "sec",
            "secs"
        ].includes(unit)
    ) {

        milliseconds =
            number * 1000;
    }

    else if (
        [
            "m",
            "min",
            "mins"
        ].includes(unit)
    ) {

        milliseconds =
            number * 60 * 1000;
    }

    else if (
        [
            "h",
            "hr",
            "hrs"
        ].includes(unit)
    ) {

        milliseconds =
            number * 60 * 60 * 1000;
    }

    else if (
        [
            "d",
            "day",
            "days"
        ].includes(unit)
    ) {

        milliseconds =
            number * 24 * 60 * 60 * 1000;
    }

    else if (
        [
            "w",
            "week",
            "weeks"
        ].includes(unit)
    ) {

        milliseconds =
            number * 7 * 24 * 60 * 60 * 1000;
    }

    else {
        return null;
    }

    return {
        input: value,
        milliseconds
    };
}


// ==================================================
// FORMAT DURATION
// ==================================================

function formatDuration(
    milliseconds
) {

    let remaining =
        Math.max(
            0,
            milliseconds
        );

    const days =
        Math.floor(
            remaining /
            (24 * 60 * 60 * 1000)
        );

    remaining %=
        24 * 60 * 60 * 1000;

    const hours =
        Math.floor(
            remaining /
            (60 * 60 * 1000)
        );

    remaining %=
        60 * 60 * 1000;

    const minutes =
        Math.floor(
            remaining /
            (60 * 1000)
        );

    remaining %=
        60 * 1000;

    const seconds =
        Math.floor(
            remaining /
            1000
        );

    const parts = [];

    if (days > 0) {
        parts.push(
            `${days}ي`
        );
    }

    if (hours > 0) {
        parts.push(
            `${hours}س`
        );
    }

    if (minutes > 0) {
        parts.push(
            `${minutes}د`
        );
    }

    if (
        seconds > 0 ||
        parts.length === 0
    ) {

        parts.push(
            `${seconds}ث`
        );
    }

    return parts.join(" ");
}


// ==================================================
// SEND LOG
// ==================================================

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

        if (!channel) {
            return;
        }

        const embed =
            new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(
                    description || "بدون تفاصيل."
                )
                .setTimestamp();

        await channel.send({
            embeds: [embed]
        });

    } catch (error) {

        console.error(
            "Send Log Error:",
            error
        );
    }
}


// ==================================================
// MEMBER RESOLVER
// ==================================================

async function resolveMember(
    guild,
    input
) {

    if (!guild || !input) {
        return null;
    }

    const value =
        String(input).trim();

    const mentionMatch =
        value.match(
            /^<@!?(\d+)>$/
        );

    const userId =
        mentionMatch
            ? mentionMatch[1]
            : value.replace(
                /[<@!>]/g,
                ""
            );

    if (
        /^\d{17,20}$/.test(
            userId
        )
    ) {

        try {

            return await guild.members.fetch(
                userId
            );

        } catch {

            return null;
        }
    }

    const lower =
        value.toLowerCase();

    const cached =
        guild.members.cache.find(
            member =>
                member.user.username.toLowerCase() === lower ||
                member.displayName.toLowerCase() === lower ||
                member.user.tag.toLowerCase() === lower
        );

    return cached || null;
}


// ==================================================
// WARNING DATA
// ==================================================

function getGuildWarnings(
    guildId
) {

    if (
        !data.warnings[guildId]
    ) {

        data.warnings[guildId] = {};
    }

    return data.warnings[guildId];
}


function getUserWarnings(
    guildId,
    userId
) {

    const guildWarnings =
        getGuildWarnings(
            guildId
        );

    if (
        !guildWarnings[userId]
    ) {

        guildWarnings[userId] = [];
    }

    return guildWarnings[userId];
}


// ==================================================
// JAIL DATA
// ==================================================

function getGuildJails(
    guildId
) {

    if (
        !data.jails[guildId]
    ) {

        data.jails[guildId] = [];
    }

    return data.jails[guildId];
}


function getActiveJail(
    guildId,
    userId
) {

    const jails =
        getGuildJails(
            guildId
        );

    const now =
        Date.now();

    return (
        jails.find(
            jail =>
                jail.userId === userId &&
                jail.expiresAt > now
        ) || null
    );
}


// ==================================================
// TICKET DATA
// ==================================================

function getGuildTickets(
    guildId
) {

    if (
        !data.tickets[guildId]
    ) {

        data.tickets[guildId] = [];
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

    return (
        tickets.find(
            ticket =>
                ticket.channelId ===
                channelId &&
                !ticket.closed
        ) || null
    );
}


function findOpenTicketByUser(
    guildId,
    userId
) {

    const tickets =
        getGuildTickets(
            guildId
        );

    return (
        tickets.find(
            ticket =>
                ticket.userId ===
                userId &&
                !ticket.closed
        ) || null
    );
}


// ==================================================
// TICKET PANEL DATA
// ==================================================

function getGuildTicketPanels(
    guildId
) {

    if (
        !data.ticketPanels[guildId]
    ) {

        data.ticketPanels[guildId] = {};
    }

    return data.ticketPanels[guildId];
}


// ==================================================
// RATING DATA
// ==================================================

function getGuildRatings(
    guildId
) {

    if (
        !data.ratings[guildId]
    ) {

        data.ratings[guildId] = {};
    }

    return data.ratings[guildId];
}


function getGuildPendingRatings(
    guildId
) {

    if (
        !data.pendingRatings[guildId]
    ) {

        data.pendingRatings[guildId] = {};
    }

    return data.pendingRatings[guildId];
}


// ==================================================
// PREFIX ERROR
// ==================================================

async function prefixError(
    message,
    content
) {

    return message.reply({
        content:
            `❌ ${content}`
    }).catch(() => {});
}


// ==================================================
// PREFIX SUCCESS
// ==================================================

async function sendPrefixResult(
    message,
    content
) {

    return message.reply({
        content:
            content
    }).catch(() => {});
}


// ==================================================
// CHECK TEXT CHANNEL
// ==================================================

function isTextChannel(
    channel
) {

    return (
        channel &&
        (
            channel.type ===
                ChannelType.GuildText ||

            channel.type ===
                ChannelType.GuildAnnouncement ||

            channel.type ===
                ChannelType.PublicThread ||

            channel.type ===
                ChannelType.PrivateThread
        )
    );
}


// ==================================================
// END PART 1
// ==================================================
// ==================================================
// PART 2 - SLASH COMMANDS / INTERACTIONS / SETUP
// ==================================================


// ==================================================
// SLASH COMMANDS
// ==================================================

const slashCommands = [

    // ----------------------------------------------
    // HELP
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("help")
        .setDescription("عرض جميع أوامر البوت"),


    // ----------------------------------------------
    // POINTS
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("points")
        .setDescription("عرض نقاط العضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),


    // ----------------------------------------------
    // XP
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("xp")
        .setDescription("عرض XP العضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),


    // ----------------------------------------------
    // BALANCE
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("balance")
        .setDescription("عرض الرصيد")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),


    // ----------------------------------------------
    // PAY
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("pay")
        .setDescription("تحويل عملات لعضو")
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


    // ----------------------------------------------
    // ADD COINS
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("addcoins")
        .setDescription("إضافة عملات لعضو")
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


    // ----------------------------------------------
    // REMOVE COINS
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("removecoins")
        .setDescription("خصم عملات من عضو")
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


    // ----------------------------------------------
    // SET COINS
    // ----------------------------------------------

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


    // ----------------------------------------------
    // STATS
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("stats")
        .setDescription("عرض إحصائيات العضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),


    // ----------------------------------------------
    // BAN
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("ban")
        .setDescription("حظر عضو")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب الحظر")
                .setRequired(false)
        ),


    // ----------------------------------------------
    // UNBAN
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("unban")
        .setDescription("فك حظر عضو")
        .addStringOption(option =>
            option
                .setName("userid")
                .setDescription("ID العضو")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب فك الحظر")
                .setRequired(false)
        ),


    // ----------------------------------------------
    // WARN
    // ----------------------------------------------

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
                .setDescription("مدة التحذير مثل 30m أو 1h أو 1d")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب التحذير")
                .setRequired(true)
        ),


    // ----------------------------------------------
    // WARNING
    // ----------------------------------------------

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
                .setDescription("مدة التحذير مثل 30m أو 1h أو 1d")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب التحذير")
                .setRequired(true)
        ),


    // ----------------------------------------------
    // TIMEOUT
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("تايم أوت لعضو")
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
                .setDescription("سبب التايم أوت")
                .setRequired(true)
        ),


    // ----------------------------------------------
    // JAIL
    // ----------------------------------------------

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
                .setDescription("مدة السجن مثل 10m أو 1h أو 1d")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("reason")
                .setDescription("سبب السجن")
                .setRequired(true)
        ),


    // ----------------------------------------------
    // TIME
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("time")
        .setDescription("عرض مدة السجن المتبقية")
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("العضو")
                .setRequired(false)
        ),


    // ----------------------------------------------
    // CLOSE
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("close")
        .setDescription("إغلاق التذكرة الحالية"),


    // ----------------------------------------------
    // DELETE
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("delete")
        .setDescription("حذف التذكرة الحالية"),


    // ----------------------------------------------
    // SETUP
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("setup")
        .setDescription("إظهار إعدادات البوت الأساسية"),


    // ----------------------------------------------
    // SETUP TICKET PANEL
    // ----------------------------------------------

    new SlashCommandBuilder()
        .setName("setup-ticket-panel")
        .setDescription("إنشاء بانل تذاكر")
        .addStringOption(option =>
            option
                .setName("name")
                .setDescription("اسم البانل")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("description")
                .setDescription("وصف البانل")
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName("button")
                .setDescription("اسم الزر")
                .setRequired(false)
        )
        .addChannelOption(option =>
            option
                .setName("category")
                .setDescription("كاتيجوري التذاكر")
                .addChannelTypes(
                    ChannelType.GuildCategory
                )
                .setRequired(true)
        )
];


// ==================================================
// REGISTER SLASH COMMANDS
// ==================================================

async function registerSlashCommands() {

    try {

        if (
            !client.user
        ) {
            console.error(
                "❌ لا يمكن تسجيل Slash Commands قبل تسجيل الدخول."
            );

            return;
        }

        const rest =
            new REST({
                version: "10"
            }).setToken(
                TOKEN
            );

        await rest.put(
            Routes.applicationCommands(
                client.user.id
            ),
            {
                body:
                    slashCommands.map(
                        command =>
                            command.toJSON()
                    )
            }
        );

        console.log(
            `✅ Registered ${slashCommands.length} Slash Commands.`
        );

    } catch (error) {

        console.error(
            "Slash Commands Registration Error:",
            error
        );
    }
}


// ==================================================
// INTERACTION HELPERS
// ==================================================

function requireGuild(
    interaction
) {

    if (
        !interaction.guild
    ) {

        return false;
    }

    return true;
}


function requireStaff(
    interaction
) {

    if (
        !interaction.guild ||
        !interaction.member
    ) {
        return false;
    }

    const guildData =
        getGuildData(
            interaction.guild.id
        );

    return isStaff(
        interaction.member,
        guildData
    );
}


function getInteractionMember(
    interaction
) {

    if (
        !interaction.guild
    ) {
        return null;
    }

    return interaction.member;
}


async function resolveInteractionMember(
    interaction,
    optionName = "member"
) {

    if (
        !interaction.guild
    ) {
        return null;
    }

    const user =
        interaction.options.getUser(
            optionName
        );

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


// ==================================================
// INTERACTION TARGET CHECK
// ==================================================

function canModerateInteractionTarget(
    interaction,
    target,
    guildData
) {

    if (
        !interaction.member ||
        !target
    ) {
        return false;
    }

    return canModerateTarget(
        interaction.member,
        target,
        guildData
    );
}


// ==================================================
// SLASH INTERACTION HANDLER
// ==================================================

client.on(
    "interactionCreate",
    async (interaction) => {

        try {

            if (
                !interaction.isChatInputCommand()
            ) {
                return;
            }


            // ==============================================
            // HELP
            // ==============================================

            if (
                interaction.commandName ===
                "help"
            ) {

                const embed =
                    new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle(
                            "🤖 أوامر البوت"
                        )
                        .setDescription(
                            "قائمة الأوامر المتاحة في البوت."
                        )
                        .addFields(

                            {
                                name: "🛡️ الإدارة",
                                value:
                                    [
                                        "`/ban`",
                                        "`/unban`",
                                        "`/warn`",
                                        "`/warning`",
                                        "`/timeout`",
                                        "`/jail`",
                                        "`/delete`",
                                        "`/close`"
                                    ].join("\n"),
                                inline: true
                            },

                            {
                                name: "🎫 التذاكر",
                                value:
                                    [
                                        "`/setup-ticket-panel`",
                                        "`/close`",
                                        "`/delete`"
                                    ].join("\n"),
                                inline: true
                            },

                            {
                                name: "📊 الأعضاء",
                                value:
                                    [
                                        "`/points`",
                                        "`/xp`",
                                        "`/stats`",
                                        "`/time`",
                                        "`/balance`"
                                    ].join("\n"),
                                inline: true
                            },

                            {
                                name: "💰 الاقتصاد",
                                value:
                                    [
                                        "`/balance`",
                                        "`/pay`",
                                        "`/addcoins`",
                                        "`/removecoins`",
                                        "`/setcoins`"
                                    ].join("\n"),
                                inline: true
                            },

                            {
                                name: "⚙️ الإعدادات",
                                value:
                                    [
                                        "`/setup`",
                                        "`/setup-ticket-panel`"
                                    ].join("\n"),
                                inline: true
                            }
                        )
                        .setFooter({
                            text:
                                "Professional Discord Bot"
                        });

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }


            // ==============================================
            // REQUIRE GUILD
            // ==============================================

            if (
                !requireGuild(
                    interaction
                )
            ) {

                return interaction.reply({
                    content:
                        "❌ هذا الأمر يعمل داخل السيرفر فقط.",
                    ephemeral: true
                });
            }


            const guild =
                interaction.guild;

            const guildData =
                getGuildData(
                    guild.id
                );

            const command =
                interaction.commandName;


            // ==============================================
            // POINTS
            // ==============================================

            if (
                command ===
                "points"
            ) {

                let target =
                    interaction.member;

                const selectedUser =
                    interaction.options.getUser(
                        "member"
                    );

                if (selectedUser) {

                    target =
                        await guild.members.fetch(
                            selectedUser.id
                        ).catch(
                            () => null
                        );

                    if (!target) {

                        return interaction.reply({
                            content:
                                "❌ لم أتمكن من العثور على العضو.",
                            ephemeral: true
                        });
                    }
                }

                const user =
                    getUserData(
                        guild.id,
                        target.id
                    );

                const stats =
                    getStats(
                        guild.id,
                        target.id
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor(0xF1C40F)
                        .setTitle(
                            `⭐ نقاط ${target.displayName}`
                        )
                        .setThumbnail(
                            target.user.displayAvatarURL({
                                size: 256
                            })
                        )
                        .addFields(

                            {
                                name:
                                    "🏆 نقاط الإجراءات",
                                value:
                                    `${user.actionPoints || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "⚠️ التحذيرات",
                                value:
                                    `${user.warnings || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "⏱️ التايم أوت",
                                value:
                                    `${user.timeouts || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "🔒 السجن",
                                value:
                                    `${user.jails || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "🎫 التذاكر المستلمة",
                                value:
                                    `${user.ticketsClaimed || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "⭐ التقييمات الجيدة",
                                value:
                                    `${user.goodRatings || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "📈 XP",
                                value:
                                    `${user.xp || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "💰 الرصيد",
                                value:
                                    `${user.coins || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "📊 إجمالي النقاط",
                                value:
                                    `${stats.points || user.actionPoints || 0}`,
                                inline: true
                            }
                        )
                        .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }


            // ==============================================
            // XP
            // ==============================================

            if (
                command ===
                "xp"
            ) {

                let target =
                    interaction.member;

                const selectedUser =
                    interaction.options.getUser(
                        "member"
                    );

                if (selectedUser) {

                    target =
                        await guild.members.fetch(
                            selectedUser.id
                        ).catch(
                            () => null
                        );

                    if (!target) {

                        return interaction.reply({
                            content:
                                "❌ لم أتمكن من العثور على العضو.",
                            ephemeral: true
                        });
                    }
                }

                const user =
                    getUserData(
                        guild.id,
                        target.id
                    );

                return interaction.reply({
                    content:
                        `📈 XP الخاص بـ ${target}: **${user.xp || 0}**`,
                    ephemeral: true
                });
            }


            // ==============================================
            // BALANCE
            // ==============================================

            if (
                command ===
                "balance"
            ) {

                let target =
                    interaction.member;

                const selectedUser =
                    interaction.options.getUser(
                        "member"
                    );

                if (selectedUser) {

                    target =
                        await guild.members.fetch(
                            selectedUser.id
                        ).catch(
                            () => null
                        );

                    if (!target) {

                        return interaction.reply({
                            content:
                                "❌ لم أتمكن من العثور على العضو.",
                            ephemeral: true
                        });
                    }
                }

                const user =
                    getUserData(
                        guild.id,
                        target.id
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor(0x2ECC71)
                        .setTitle(
                            "💰 الرصيد"
                        )
                        .setDescription(
                            `${target}\n\nالرصيد: **${user.coins || 0} ${guildData.currencyName || "Coins"}**`
                        )
                        .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }


            // ==============================================
            // PAY
            // ==============================================

            if (
                command ===
                "pay"
            ) {

                const target =
                    await resolveInteractionMember(
                        interaction,
                        "member"
                    );

                const amount =
                    interaction.options.getInteger(
                        "amount"
                    );

                if (!target) {

                    return interaction.reply({
                        content:
                            "❌ العضو غير موجود.",
                        ephemeral: true
                    });
                }

                if (
                    target.id ===
                    interaction.user.id
                ) {

                    return interaction.reply({
                        content:
                            "❌ لا يمكنك تحويل الأموال لنفسك.",
                        ephemeral: true
                    });
                }

                if (
                    !Number.isInteger(amount) ||
                    amount <= 0
                ) {

                    return interaction.reply({
                        content:
                            "❌ المبلغ غير صحيح.",
                        ephemeral: true
                    });
                }

                const sender =
                    getUserData(
                        guild.id,
                        interaction.user.id
                    );

                const receiver =
                    getUserData(
                        guild.id,
                        target.id
                    );

                if (
                    (sender.coins || 0) <
                    amount
                ) {

                    return interaction.reply({
                        content:
                            "❌ رصيدك غير كافي.",
                        ephemeral: true
                    });
                }

                sender.coins =
                    (sender.coins || 0) -
                    amount;

                receiver.coins =
                    (receiver.coins || 0) +
                    amount;

                saveData();

                return interaction.reply({
                    content:
                        `💸 تم تحويل **${amount} ${guildData.currencyName || "Coins"}** إلى ${target}.`
                });
            }


            // ==============================================
            // ADD COINS
            // ==============================================

            if (
                command ===
                "addcoins"
            ) {

                if (
                    !requireStaff(
                        interaction
                    )
                ) {

                    return interaction.reply({
                        content:
                            "❌ هذا الأمر متاح للإدارة فقط.",
                        ephemeral: true
                    });
                }

                const target =
                    await resolveInteractionMember(
                        interaction,
                        "member"
                    );

                const amount =
                    interaction.options.getInteger(
                        "amount"
                    );

                if (!target) {

                    return interaction.reply({
                        content:
                            "❌ العضو غير موجود.",
                        ephemeral: true
                    });
                }

                const user =
                    getUserData(
                        guild.id,
                        target.id
                    );

                user.coins =
                    (user.coins || 0) +
                    amount;

                saveData();

                return interaction.reply({
                    content:
                        `✅ تمت إضافة **${amount}** ${guildData.currencyName || "Coins"} إلى ${target}.`
                });
            }


            // ==============================================
            // REMOVE COINS
            // ==============================================

            if (
                command ===
                "removecoins"
            ) {

                if (
                    !requireStaff(
                        interaction
                    )
                ) {

                    return interaction.reply({
                        content:
                            "❌ هذا الأمر متاح للإدارة فقط.",
                        ephemeral: true
                    });
                }

                const target =
                    await resolveInteractionMember(
                        interaction,
                        "member"
                    );

                const amount =
                    interaction.options.getInteger(
                        "amount"
                    );

                if (!target) {

                    return interaction.reply({
                        content:
                            "❌ العضو غير موجود.",
                            ephemeral: true
                        });
                }

                const user =
                    getUserData(
                        guild.id,
                        target.id
                    );

                if (
                    (user.coins || 0) <
                    amount
                ) {

                    return interaction.reply({
                        content:
                            "❌ رصيد العضو غير كافي.",
                        ephemeral: true
                    });
                }

                user.coins =
                    (user.coins || 0) -
                    amount;

                saveData();

                return interaction.reply({
                    content:
                        `✅ تم خصم **${amount}** ${guildData.currencyName || "Coins"} من ${target}.`
                });
            }


            // ==============================================
            // SET COINS
            // ==============================================

            if (
                command ===
                "setcoins"
            ) {

                if (
                    !requireStaff(
                        interaction
                    )
                ) {

                    return interaction.reply({
                        content:
                            "❌ هذا الأمر متاح للإدارة فقط.",
                        ephemeral: true
                    });
                }

                const target =
                    await resolveInteractionMember(
                        interaction,
                        "member"
                    );

                const amount =
                    interaction.options.getInteger(
                        "amount"
                    );

                if (!target) {

                    return interaction.reply({
                        content:
                            "❌ العضو غير موجود.",
                        ephemeral: true
                    });
                }

                const user =
                    getUserData(
                        guild.id,
                        target.id
                    );

                user.coins =
                    amount;

                saveData();

                return interaction.reply({
                    content:
                        `✅ تم تعيين رصيد ${target} إلى **${amount} ${guildData.currencyName || "Coins"}**.`
                });
            }


            // ==============================================
            // STATS
            // ==============================================

            if (
                command ===
                "stats"
            ) {

                let target =
                    interaction.member;

                const selectedUser =
                    interaction.options.getUser(
                        "member"
                    );

                if (selectedUser) {

                    target =
                        await guild.members.fetch(
                            selectedUser.id
                        ).catch(
                            () => null
                        );

                    if (!target) {

                        return interaction.reply({
                            content:
                                "❌ لم أتمكن من العثور على العضو.",
                            ephemeral: true
                        });
                    }
                }

                const user =
                    getUserData(
                        guild.id,
                        target.id
                    );

                const stats =
                    getStats(
                        guild.id,
                        target.id
                    );

                const embed =
                    new EmbedBuilder()
                        .setColor(0x3498DB)
                        .setTitle(
                            `📊 إحصائيات ${target.displayName}`
                        )
                        .setThumbnail(
                            target.user.displayAvatarURL({
                                size: 256
                            })
                        )
                        .addFields(

                            {
                                name:
                                    "⚠️ التحذيرات",
                                value:
                                    `${user.warnings || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "⏱️ التايم أوت",
                                value:
                                    `${user.timeouts || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "🔒 السجن",
                                value:
                                    `${user.jails || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "🔨 الحظر",
                                value:
                                    `${user.bans || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "🎫 التذاكر المستلمة",
                                value:
                                    `${user.ticketsClaimed || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "🎫 التذاكر المغلقة",
                                value:
                                    `${user.ticketsClosed || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "⭐ التقييمات الجيدة",
                                value:
                                    `${user.goodRatings || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "🏆 النقاط",
                                value:
                                    `${user.actionPoints || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "📈 XP",
                                value:
                                    `${user.xp || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "💬 الرسائل",
                                value:
                                    `${user.messages || 0}`,
                                inline: true
                            },

                            {
                                name:
                                    "💰 الرصيد",
                                value:
                                    `${user.coins || 0}`,
                                inline: true
                            }
                        )
                        .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }


            // ==============================================
            // BAN
            // ==============================================

            if (
                command ===
                "ban"
            ) {

                if (
                    !requireStaff(
                        interaction
                    )
                ) {

                    return interaction.reply({
                        content:
                            "❌ ليس لديك صلاحية استخدام هذا الأمر.",
                        ephemeral: true
                    });
                }

                const target =
                    await resolveInteractionMember(
                        interaction,
                        "member"
                    );

                if (!target) {

                    return interaction.reply({
                        content:
                            "❌ العضو غير موجود.",
                        ephemeral: true
                    });
                }

                if (
                    !canModerateInteractionTarget(
                        interaction,
                        target,
                        guildData
                    )
                ) {

                    return interaction.reply({
                        content:
                            "❌ لا يمكنك حظر هذا العضو بسبب مستوى الإدارة.",
                        ephemeral: true
                    });
                }

                const reason =
                    interaction.options.getString(
                        "reason"
                    ) ||
                    "لم يتم تحديد سبب.";

                try {

                    await executeBan(
                        guild,
                        target,
                        interaction.member,
                        reason
                    );

                    return interaction.reply({
                        content:
                            `🔨 تم حظر ${target}.`
                    });

                } catch (error) {

                    return interaction.reply({
                        content:
                            `❌ ${error.message}`,
                        ephemeral: true
                    });
                }
            }


            // ==============================================
            // UNBAN
            // ==============================================

            if (
                command ===
                "unban"
            ) {

                if (
                    !requireStaff(
                        interaction
                    )
                ) {

                    return interaction.reply({
                        content:
                            "❌ ليس لديك صلاحية استخدام هذا الأمر.",
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
                    ) ||
                    "لم يتم تحديد سبب.";

                if (
                    !/^\d{17,20}$/.test(
                        userId
                    )
                ) {

                    return interaction.reply({
                        content:
                            "❌ ID العضو غير صحيح.",
                        ephemeral: true
                    });
                }

                try {

                    await guild.bans.remove(
                        userId,
                        reason
                    );

                    await sendLog(
                        guild,
                        "🔓 Unban",
                        `تم فك حظر <@${userId}> بواسطة ${interaction.user}\n**السبب:** ${reason}`,
                        0x2ECC71
                    );

                    return interaction.reply({
                        content:
                            `✅ تم فك حظر <@${userId}>.`
                    });

                } catch (error) {

                    return interaction.reply({
                        content:
                            `❌ ${error.message}`,
                        ephemeral: true
                    });
                }
            }


            // ==============================================
            // WARN / WARNING
            // ==============================================

            if (
                [
                    "warn",
                    "warning"
                ].includes(command)
            ) {

                if (
                    !requireStaff(
                        interaction
                    )
                ) {

                    return interaction.reply({
                        content:
                            "❌ ليس لديك صلاحية استخدام هذا الأمر.",
                        ephemeral: true
                    });
                }

                const target =
                    await resolveInteractionMember(
                        interaction,
                        "member"
                    );

                const durationInput =
                    interaction.options.getString(
                        "duration"
                    );

                const reason =
                    interaction.options.getString(
                        "reason"
                    ) ||
                    "لم يتم تحديد سبب.";

                if (!target) {

                    return interaction.reply({
                        content:
                            "❌ العضو غير موجود.",
                        ephemeral: true
                    });
                }

                if (
                    !canModerateInteractionTarget(
                        interaction,
                        target,
                        guildData
                    )
                ) {

                    return interaction.reply({
                        content:
                            "❌ لا يمكنك تحذير هذا العضو بسبب مستوى الإدارة.",
                        ephemeral: true
                    });
                }

                try {

                    await executeWarn(
                        guild,
                        target,
                        interaction.member,
                        reason,
                        durationInput
                    );

                    return interaction.reply({
                        content:
                            `⚠️ تم تحذير ${target} لمدة **${durationInput}**.\n**السبب:** ${reason}`
                    });

                } catch (error) {

                    return interaction.reply({
                        content:
                            `❌ ${error.message}`,
                        ephemeral: true
                    });
                }
            }


            // ==============================================
            // TIMEOUT
            // ==============================================

            if (
                command ===
                "timeout"
            ) {

                if (
                    !requireStaff(
                        interaction
                    )
                ) {

                    return interaction.reply({
                        content:
                            "❌ ليس لديك صلاحية استخدام هذا الأمر.",
                        ephemeral: true
                    });
                }

                const target =
                    await resolveInteractionMember(
                        interaction,
                        "member"
                    );

                const durationInput =
                    interaction.options.getString(
                        "duration"
                    );

                const reason =
                    interaction.options.getString(
                        "reason"
                    ) ||
                    "لم يتم تحديد سبب.";

                if (!target) {

                    return interaction.reply({
                        content:
                            "❌ العضو غير موجود.",
                        ephemeral: true
                    });
                }

                if (
                    !canModerateInteractionTarget(
                        interaction,
                        target,
                        guildData
                    )
                ) {

                    return interaction.reply({
                        content:
                            "❌ لا يمكنك إعطاء تايم أوت لهذا العضو.",
                        ephemeral: true
                    });
                }

                try {

                    await executeTimeout(
                        guild,
                        target,
                        interaction.member,
                        reason,
                        durationInput
                    );

                    return interaction.reply({
                        content:
                            `⏱️ تم إعطاء ${target} تايم أوت لمدة **${durationInput}**.\n**السبب:** ${reason}`
                    });

                } catch (error) {

                    return interaction.reply({
                        content:
                            `❌ ${error.message}`,
                        ephemeral: true
                    });
                }
            }


            // ==============================================
            // JAIL
            // ==============================================

            if (
                command ===
                "jail"
            ) {

                const level =
                    getStaffLevel(
                        interaction.member,
                        guildData
                    );

                if (
                    level < 3
                ) {

                    return interaction.reply({
                        content:
                            "❌ السجن متاح فقط للإدارة العليا والأونر.",
                        ephemeral: true
                    });
                }

                const target =
                    await resolveInteractionMember(
                        interaction,
                        "member"
                    );

                const durationInput =
                    interaction.options.getString(
                        "duration"
                    );

                const reason =
                    interaction.options.getString(
                        "reason"
                    ) ||
                    "لم يتم تحديد سبب.";

                if (!target) {

                    return interaction.reply({
                        content:
                            "❌ العضو غير موجود.",
                        ephemeral: true
                    });
                }

                if (
                    !canModerateInteractionTarget(
                        interaction,
                        target,
                        guildData
                    )
                ) {

                    return interaction.reply({
                        content:
                            "❌ لا يمكنك سجن هذا العضو بسبب مستوى الإدارة.",
                        ephemeral: true
                    });
                }

                try {

                    await executeJail(
                        guild,
                        target,
                        interaction.member,
                        reason,
                        durationInput
                    );

                    return interaction.reply({
                        content:
                            `🔒 تم سجن ${target} لمدة **${durationInput}**.\n**السبب:** ${reason}`
                    });

                } catch (error) {

                    return interaction.reply({
                        content:
                            `❌ ${error.message}`,
                        ephemeral: true
                    });
                }
            }


            // ==============================================
            // TIME / JAIL STATUS
            // ==============================================

            if (
                command ===
                "time"
            ) {

                let target =
                    interaction.member;

                const selectedUser =
                    interaction.options.getUser(
                        "member"
                    );

                if (selectedUser) {

                    target =
                        await guild.members.fetch(
                            selectedUser.id
                        ).catch(
                            () => null
                        );

                    if (!target) {

                        return interaction.reply({
                            content:
                                "❌ لم أتمكن من العثور على العضو.",
                            ephemeral: true
                        });
                    }
                }

                const jail =
                    getActiveJail(
                        guild.id,
                        target.id
                    );

                if (!jail) {

                    return interaction.reply({
                        content:
                            `ℹ️ ${target} ليس مسجونًا حاليًا.`,
                        ephemeral: true
                    });
                }

                const remaining =
                    Math.max(
                        0,
                        jail.expiresAt -
                        Date.now()
                    );

                return interaction.reply({
                    content:
                        `🔒 ${target} مسجون.\n⏳ المتبقي: **${formatDuration(remaining)}**`,
                    ephemeral: true
                });
            }


            // ==============================================
            // CLOSE TICKET
            // ==============================================

            if (
                command ===
                "close"
            ) {

                if (
                    !interaction.channel
                ) {

                    return interaction.reply({
                        content:
                            "❌ هذه القناة غير صالحة.",
                        ephemeral: true
                    });
                }

                try {

                    await closeTicket(
                        interaction.channel,
                        interaction.member
                    );

                } catch (error) {

                    return interaction.reply({
                        content:
                            `❌ ${error.message}`,
                        ephemeral: true
                    });
                }

                return;
            }


            // ==============================================
            // DELETE TICKET
            // ==============================================

            if (
                command ===
                "delete"
            ) {

                if (
                    !interaction.channel
                ) {

                    return interaction.reply({
                        content:
                            "❌ هذه القناة غير صالحة.",
                        ephemeral: true
                    });
                }

                try {

                    await deleteTicket(
                        interaction.channel,
                        interaction.member
                    );

                } catch (error) {

                    return interaction.reply({
                        content:
                            `❌ ${error.message}`,
                        ephemeral: true
                    });
                }

                return;
            }


            // ==============================================
            // SETUP TICKET PANEL
            // ==============================================

            if (
                command ===
                "setup-ticket-panel"
            ) {

                const level =
                    getStaffLevel(
                        interaction.member,
                        guildData
                    );

                if (
                    level < 3
                ) {

                    return interaction.reply({
                        content:
                            "❌ إنشاء بانلات التذاكر متاح للإدارة العليا والأونر فقط.",
                        ephemeral: true
                    });
                }

                const name =
                    interaction.options.getString(
                        "name"
                    );

                const description =
                    interaction.options.getString(
                        "description"
                    ) ||
                    "اضغط على الزر لفتح تذكرة.";

                const buttonName =
                    interaction.options.getString(
                        "button"
                    ) ||
                    "فتح تذكرة";

                const category =
                    interaction.options.getChannel(
                        "category"
                    );

                if (!category) {

                    return interaction.reply({
                        content:
                            "❌ يجب تحديد كاتيجوري التذاكر.",
                        ephemeral: true
                    });
                }

                guildData.ticketCategoryId =
                    category.id;

                guildData.setupCompleted =
                    true;

                const panels =
                    getGuildTicketPanels(
                        guild.id
                    );

                const panelId =
                    `${Date.now()}_${Math.random()
                        .toString(36)
                        .slice(2, 7)}`;

                panels[panelId] = {

                    id: panelId,

                    name,

                    description,

                    buttonName,

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

                const embed =
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
                                "اضغط على الزر أسفل الرسالة لفتح تذكرة."
                        })
                        .setTimestamp();

                const row =
                    new ActionRowBuilder()
                        .addComponents(

                            new ButtonBuilder()
                                .setCustomId(
                                    `open_ticket_${panelId}`
                                )
                                .setLabel(
                                    buttonName
                                )
                                .setEmoji("🎫")
                                .setStyle(
                                    ButtonStyle.Primary
                                )
                        );

                await interaction.reply({
                    content:
                        "✅ تم إنشاء بانل التذاكر.",
                    ephemeral: true
                });

                await interaction.channel.send({
                    embeds: [embed],
                    components: [row]
                });

                return;
            }


            // ==============================================
            // SETUP
            // ==============================================

            if (
                command ===
                "setup"
            ) {

                const level =
                    getStaffLevel(
                        interaction.member,
                        guildData
                    );

                if (
                    level < 3
                ) {

                    return interaction.reply({
                        content:
                            "❌ إعدادات البوت متاحة للإدارة العليا والأونر فقط.",
                        ephemeral: true
                    });
                }

                const embed =
                    new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle(
                            "⚙️ إعدادات البوت"
                        )
                        .addFields(

                            {
                                name:
                                    "🎫 Ticket Category",
                                value:
                                    guildData.ticketCategoryId
                                        ? `<#${guildData.ticketCategoryId}>`
                                        : "❌ غير محددة",
                                inline: true
                            },

                            {
                                name:
                                    "🔒 Jail Role",
                                value:
                                    guildData.jailRoleId
                                        ? `<@&${guildData.jailRoleId}>`
                                        : "❌ غير محددة",
                                inline: true
                            },

                            {
                                name:
                                    "📋 Logs",
                                value:
                                    guildData.logsChannelId
                                        ? `<#${guildData.logsChannelId}>`
                                        : "❌ غير محددة",
                                inline: true
                            },

                            {
                                name:
                                    "👋 Welcome",
                                value:
                                    guildData.welcomeEnabled
                                        ? "✅ مفعل"
                                        : "❌ غير مفعل",
                                inline: true
                            },

                            {
                                name:
                                    "👋 Goodbye",
                                value:
                                    guildData.goodbyeEnabled
                                        ? "✅ مفعل"
                                        : "❌ غير مفعل",
                                inline: true
                            },

                            {
                                name:
                                    "🚨 Anti-Spam",
                                value:
                                    guildData.antiSpam?.enabled
                                        ? "✅ مفعل"
                                        : "❌ غير مفعل",
                                inline: true
                            },

                            {
                                name:
                                    "💰 Currency",
                                value:
                                    guildData.currencyEnabled
                                        ? `✅ ${guildData.currencyName || "Coins"}`
                                        : "❌ غير مفعلة",
                                inline: true
                            }
                        )
                        .setFooter({
                            text:
                                "استخدام إعدادات إضافية سيتم من خلال أوامر الإعداد."
                        })
                        .setTimestamp();

                return interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

        } catch (error) {

            console.error(
                "Slash Interaction Error:",
                error
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                await interaction.followUp({
                    content:
                        "❌ حدث خطأ أثناء تنفيذ الأمر.",
                    ephemeral: true
                }).catch(() => {});

            } else {

                await interaction.reply({
                    content:
                        "❌ حدث خطأ أثناء تنفيذ الأمر.",
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
);


// ==================================================
// END PART 2
// ==================================================
// ==================================================
// PART 3 - MODERATION / JAIL / TICKETS / RATINGS
// ==================================================


// ==================================================
// BAN
// ==================================================

async function executeBan(
    guild,
    target,
    moderator,
    reason = "لم يتم تحديد سبب."
) {

    if (!guild) {
        throw new Error(
            "السيرفر غير موجود."
        );
    }

    if (!target) {
        throw new Error(
            "العضو غير موجود."
        );
    }

    if (!target.bannable) {
        throw new Error(
            "البوت لا يستطيع حظر هذا العضو. تأكد من صلاحيات البوت وترتيب الرتب."
        );
    }

    try {

        await target.ban({
            reason:
                reason
        });

        const user =
            getUserData(
                guild.id,
                moderator.id
            );

        const stats =
            getStats(
                guild.id,
                moderator.id
            );

        user.bans =
            (user.bans || 0) + 1;

        stats.bans =
            (stats.bans || 0) + 1;

        saveData();

        await sendLog(
            guild,
            "🔨 Ban",
            `**العضو:** ${target.user.tag}\n**بواسطة:** ${moderator}\n**السبب:** ${reason}`,
            0xE74C3C
        );

        try {

            await target.send({
                embeds: [

                    new EmbedBuilder()
                        .setColor(0xE74C3C)
                        .setTitle(
                            "🔨 تم حظرك"
                        )
                        .setDescription(
                            `تم حظرك من **${guild.name}**.`
                        )
                        .addFields({

                            name:
                                "السبب",

                            value:
                                reason
                        })
                        .setTimestamp()
                ]
            });

        } catch {}

    } catch (error) {

        throw new Error(
            `فشل حظر العضو: ${error.message}`
        );
    }
}


// ==================================================
// WARN
// ==================================================

async function executeWarn(
    guild,
    target,
    moderator,
    reason = "لم يتم تحديد سبب.",
    durationInput
) {

    if (!guild) {
        throw new Error(
            "السيرفر غير موجود."
        );
    }

    if (!target) {
        throw new Error(
            "العضو غير موجود."
        );
    }

    const duration =
        parseDuration(
            durationInput
        );

    if (!duration) {
        throw new Error(
            "مدة التحذير غير صحيحة. مثال: 30m أو 1h أو 1d."
        );
    }

    const warnings =
        getUserWarnings(
            guild.id,
            target.id
        );

    const now =
        Date.now();

    // تنظيف التحذيرات القديمة
    for (
        let i = warnings.length - 1;
        i >= 0;
        i--
    ) {

        if (
            warnings[i].expiresAt <= now
        ) {

            warnings.splice(
                i,
                1
            );
        }
    }

    const warning = {

        id:
            `${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`,

        userId:
            target.id,

        moderatorId:
            moderator.id,

        reason:
            reason,

        createdAt:
            now,

        expiresAt:
            now +
            duration.milliseconds
    };

    warnings.push(
        warning
    );


    // ----------------------------------------------
    // POINTS
    // ----------------------------------------------

    const user =
        getUserData(
            guild.id,
            moderator.id
        );

    const stats =
        getStats(
            guild.id,
            moderator.id
        );

    user.warnings =
        (user.warnings || 0) + 1;

    stats.warnings =
        (stats.warnings || 0) + 1;

    addPoints(
        guild.id,
        moderator.id,
        POINTS.warning
    );


    saveData();


    // ----------------------------------------------
    // THREE ACTIVE WARNINGS
    // ----------------------------------------------

    if (
        warnings.length >= 3
    ) {

        try {

            if (
                target.moderatable
            ) {

                const timeoutDuration =
                    30 * 60 * 1000;

                await target.timeout(
                    timeoutDuration,
                    "الوصول إلى 3 تحذيرات فعالة."
                );

                await sendLog(
                    guild,
                    "🚨 3 Warnings",
                    `العضو ${target} وصل إلى 3 تحذيرات فعالة وتم إعطاؤه تايم أوت 30 دقيقة.`,
                    0xE67E22
                );
            }

        } catch (error) {

            console.error(
                "Three Warnings Timeout Error:",
                error
            );
        }
    }


    // ----------------------------------------------
    // LOG
    // ----------------------------------------------

    await sendLog(
        guild,
        "⚠️ Warning",
        `**العضو:** ${target.user.tag}\n**بواسطة:** ${moderator}\n**المدة:** ${durationInput}\n**السبب:** ${reason}`,
        0xF1C40F
    );


    // ----------------------------------------------
    // DM
    // ----------------------------------------------

    try {

        await target.send({
            embeds: [

                new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setTitle(
                        "⚠️ تم تحذيرك"
                    )
                    .setDescription(
                        `تم تحذيرك في **${guild.name}**.`
                    )
                    .addFields(

                        {
                            name:
                                "المدة",

                            value:
                                durationInput,

                            inline:
                                true
                        },

                        {
                            name:
                                "السبب",

                            value:
                                reason,

                            inline:
                                true
                        }
                    )
                    .setTimestamp()
            ]
        });

    } catch {}

    return warning;
}


// ==================================================
// TIMEOUT
// ==================================================

async function executeTimeout(
    guild,
    target,
    moderator,
    reason = "لم يتم تحديد سبب.",
    durationInput
) {

    if (!guild) {
        throw new Error(
            "السيرفر غير موجود."
        );
    }

    if (!target) {
        throw new Error(
            "العضو غير موجود."
        );
    }

    const duration =
        parseDuration(
            durationInput
        );

    if (!duration) {
        throw new Error(
            "مدة التايم أوت غير صحيحة."
        );
    }

    const maxTimeout =
        28 * 24 * 60 * 60 * 1000;

    if (
        duration.milliseconds >
        maxTimeout
    ) {

        throw new Error(
            "أقصى مدة للتايم أوت هي 28 يوم."
        );
    }

    if (
        !target.moderatable
    ) {

        throw new Error(
            "البوت لا يستطيع إعطاء تايم أوت لهذا العضو."
        );
    }

    try {

        await target.timeout(
            duration.milliseconds,
            reason
        );

        const user =
            getUserData(
                guild.id,
                moderator.id
            );

        const stats =
            getStats(
                guild.id,
                moderator.id
            );

        user.timeouts =
            (user.timeouts || 0) + 1;

        stats.timeouts =
            (stats.timeouts || 0) + 1;

        addPoints(
            guild.id,
            moderator.id,
            POINTS.timeout
        );

        saveData();


        await sendLog(
            guild,
            "⏱️ Timeout",
            `**العضو:** ${target.user.tag}\n**بواسطة:** ${moderator}\n**المدة:** ${durationInput}\n**السبب:** ${reason}`,
            0xE67E22
        );


        try {

            await target.send({
                embeds: [

                    new EmbedBuilder()
                        .setColor(0xE67E22)
                        .setTitle(
                            "⏱️ تم إعطاؤك تايم أوت"
                        )
                        .setDescription(
                            `تم إعطاؤك تايم أوت في **${guild.name}**.`
                        )
                        .addFields(

                            {
                                name:
                                    "المدة",

                                value:
                                    durationInput,

                                inline:
                                    true
                            },

                            {
                                name:
                                    "السبب",

                                value:
                                    reason,

                                inline:
                                    true
                            }
                        )
                        .setTimestamp()
                ]
            });

        } catch {}

    } catch (error) {

        throw new Error(
            `فشل إعطاء التايم أوت: ${error.message}`
        );
    }
}


// ==================================================
// JAIL
// ==================================================

async function executeJail(
    guild,
    target,
    moderator,
    reason = "لم يتم تحديد سبب.",
    durationInput
) {

    if (!guild) {
        throw new Error(
            "السيرفر غير موجود."
        );
    }

    if (!target) {
        throw new Error(
            "العضو غير موجود."
        );
    }

    const duration =
        parseDuration(
            durationInput
        );

    if (!duration) {
        throw new Error(
            "مدة السجن غير صحيحة."
        );
    }

    const guildData =
        getGuildData(
            guild.id
        );

    if (
        !guildData.jailRoleId
    ) {

        throw new Error(
            "لم يتم تحديد رتبة السجن. استخدم إعداد رتبة السجن أولًا."
        );
    }

    const jailRole =
        guild.roles.cache.get(
            guildData.jailRoleId
        );

    if (!jailRole) {

        throw new Error(
            "رتبة السجن غير موجودة."
        );
    }

    if (
        !guild.members.me
    ) {

        throw new Error(
            "تعذر العثور على البوت داخل السيرفر."
        );
    }

    if (
        !guild.members.me.permissions.has(
            PermissionsBitField.Flags.ManageRoles
        )
    ) {

        throw new Error(
            "البوت يحتاج صلاحية Manage Roles."
        );
    }

    if (
        jailRole.position >=
        guild.members.me.roles.highest.position
    ) {

        throw new Error(
            "رتبة السجن أعلى من رتبة البوت."
        );
    }

    if (
        target.id ===
        moderator.id
    ) {

        throw new Error(
            "لا يمكنك سجن نفسك."
        );
    }

    if (
        target.id ===
        guild.ownerId
    ) {

        throw new Error(
            "لا يمكن سجن مالك السيرفر."
        );
    }

    const existing =
        getActiveJail(
            guild.id,
            target.id
        );

    if (existing) {

        throw new Error(
            "هذا العضو مسجون بالفعل."
        );
    }


    // ----------------------------------------------
    // SAVE ORIGINAL ROLES
    // ----------------------------------------------

    const originalRoles =
        target.roles.cache
            .filter(
                role =>
                    role.id !== guild.id
            )
            .map(
                role => role.id
            );

    const manageableRoles =
        target.roles.cache
            .filter(
                role =>
                    role.id !== guild.id &&
                    role.editable
            )
            .map(
                role => role.id
            );


    // ----------------------------------------------
    // REMOVE ROLES
    // ----------------------------------------------

    try {

        await target.roles.remove(
            manageableRoles,
            "سجن العضو"
        );

    } catch (error) {

        console.error(
            "Jail Remove Roles Error:",
            error
        );
    }


    // ----------------------------------------------
    // ADD JAIL ROLE
    // ----------------------------------------------

    try {

        await target.roles.add(
            jailRole,
            "سجن العضو"
        );

    } catch (error) {

        throw new Error(
            `تعذر إضافة رتبة السجن: ${error.message}`
        );
    }


    // ----------------------------------------------
    // SAVE JAIL
    // ----------------------------------------------

    const jails =
        getGuildJails(
            guild.id
        );

    const jail = {

        id:
            `${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`,

        userId:
            target.id,

        moderatorId:
            moderator.id,

        reason:
            reason,

        duration:
            durationInput,

        createdAt:
            Date.now(),

        expiresAt:
            Date.now() +
            duration.milliseconds,

        originalRoles:
            originalRoles,

        jailRoleId:
            jailRole.id
    };

    jails.push(
        jail
    );


    // ----------------------------------------------
    // POINTS
    // ----------------------------------------------

    const user =
        getUserData(
            guild.id,
            moderator.id
        );

    const stats =
        getStats(
            guild.id,
            moderator.id
        );

    user.jails =
        (user.jails || 0) + 1;

    stats.jails =
        (stats.jails || 0) + 1;

    addPoints(
        guild.id,
        moderator.id,
        POINTS.jail
    );

    saveData();


    // ----------------------------------------------
    // LOG
    // ----------------------------------------------

    await sendLog(
        guild,
        "🔒 Jail",
        `**العضو:** ${target.user.tag}\n**بواسطة:** ${moderator}\n**المدة:** ${durationInput}\n**السبب:** ${reason}`,
        0x8E44AD
    );


    // ----------------------------------------------
    // DM
    // ----------------------------------------------

    try {

        await target.send({
            embeds: [

                new EmbedBuilder()
                    .setColor(0x8E44AD)
                    .setTitle(
                        "🔒 تم سجنك"
                    )
                    .setDescription(
                        `تم سجنك في **${guild.name}**.`
                    )
                    .addFields(

                        {
                            name:
                                "المدة",

                            value:
                                durationInput,

                            inline:
                                true
                        },

                        {
                            name:
                                "السبب",

                            value:
                                reason,

                            inline:
                                true
                        }
                    )
                    .setTimestamp()
            ]
        });

    } catch {}

    return jail;
}


// ==================================================
// RELEASE FROM JAIL
// ==================================================

async function releaseFromJail(
    guild,
    userId
) {

    const jails =
        getGuildJails(
            guild.id
        );

    const index =
        jails.findIndex(
            jail =>
                jail.userId ===
                userId
        );

    if (
        index === -1
    ) {
        return false;
    }

    const jail =
        jails[index];

    let member = null;

    try {

        member =
            await guild.members.fetch(
                userId
            );

    } catch {

        jails.splice(
            index,
            1
        );

        saveData();

        return false;
    }


    // ----------------------------------------------
    // REMOVE JAIL ROLE
    // ----------------------------------------------

    if (
        jail.jailRoleId
    ) {

        const jailRole =
            guild.roles.cache.get(
                jail.jailRoleId
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
    }


    // ----------------------------------------------
    // RESTORE ROLES
    // ----------------------------------------------

    if (
        Array.isArray(
            jail.originalRoles
        )
    ) {

        for (
            const roleId of
            jail.originalRoles
        ) {

            const role =
                guild.roles.cache.get(
                    roleId
                );

            if (!role) {
                continue;
            }

            if (
                role.position >=
                guild.members.me.roles.highest.position
            ) {
                continue;
            }

            if (
                !member.roles.cache.has(
                    role.id
                )
            ) {

                await member.roles.add(
                    role,
                    "انتهاء مدة السجن"
                ).catch(() => {});
            }
        }
    }


    // ----------------------------------------------
    // REMOVE RECORD
    // ----------------------------------------------

    jails.splice(
        index,
        1
    );

    saveData();


    // ----------------------------------------------
    // LOG
    // ----------------------------------------------

    await sendLog(
        guild,
        "🔓 Jail Released",
        `تم الإفراج عن <@${userId}> بعد انتهاء مدة السجن.`,
        0x2ECC71
    );


    // ----------------------------------------------
    // DM
    // ----------------------------------------------

    try {

        await member.send({
            content:
                `🔓 انتهت مدة سجنك في **${guild.name}** وتمت إعادة رتبك.`
        });

    } catch {}

    return true;
}


// ==================================================
// TICKET HELPERS
// ==================================================

function canManageTicket(
    ticket,
    member,
    guildData
) {

    if (
        !ticket ||
        !member
    ) {
        return false;
    }

    if (
        ticket.userId ===
        member.id
    ) {
        return true;
    }

    if (
        ticket.claimedBy ===
        member.id
    ) {
        return true;
    }

    return (
        getStaffLevel(
            member,
            guildData
        ) > 0
    );
}


function canWriteInTicket(
    ticket,
    member,
    guildData,
    claimerLevel = null
) {

    if (
        !ticket ||
        !member
    ) {
        return false;
    }

    // صاحب التذكرة
    if (
        ticket.userId ===
        member.id
    ) {
        return true;
    }

    const level =
        getStaffLevel(
            member,
            guildData
        );

    if (
        level <= 0
    ) {
        return false;
    }

    // غير مستلمة
    if (
        !ticket.claimedBy
    ) {
        return true;
    }

    // المستلم
    if (
        ticket.claimedBy ===
        member.id
    ) {
        return true;
    }

    if (
        claimerLevel === null
    ) {

        return false;
    }

    // الأعلى فقط
    return (
        level >
        claimerLevel
    );
}


// ==================================================
// CREATE TICKET
// ==================================================

async function createTicket(
    interaction,
    panelId
) {

    const guild =
        interaction.guild;

    if (!guild) {

        throw new Error(
            "هذا النظام يعمل داخل السيرفر فقط."
        );
    }

    const guildData =
        getGuildData(
            guild.id
        );

    const panels =
        getGuildTicketPanels(
            guild.id
        );

    const panel =
        panels[panelId];

    if (!panel) {

        throw new Error(
            "بانل التذاكر غير موجودة."
        );
    }


    // ----------------------------------------------
    // EXISTING TICKET
    // ----------------------------------------------

    const existing =
        findOpenTicketByUser(
            guild.id,
            interaction.user.id
        );

    if (existing) {

        throw new Error(
            `لديك تذكرة مفتوحة بالفعل: <#${existing.channelId}>`
        );
    }


    // ----------------------------------------------
    // CATEGORY
    // ----------------------------------------------

    const categoryId =
        panel.categoryId ||
        guildData.ticketCategoryId;

    if (!categoryId) {

        throw new Error(
            "لم يتم تحديد كاتيجوري للتذاكر."
        );
    }

    const category =
        guild.channels.cache.get(
            categoryId
        );

    if (
        !category ||
        category.type !==
        ChannelType.GuildCategory
    ) {

        throw new Error(
            "كاتيجوري التذاكر غير موجودة."
        );
    }


    // ----------------------------------------------
    // CREATE CHANNEL
    // ----------------------------------------------

    const channelName =
        `ticket-${interaction.user.username}`
            .toLowerCase()
            .replace(
                /[^a-z0-9\u0600-\u06FF_-]/g,
                "-"
            )
            .slice(
                0,
                80
            );

    const channel =
        await guild.channels.create({

            name:
                channelName,

            type:
                ChannelType.GuildText,

            parent:
                category.id,

            permissionOverwrites: [

                {
                    id:
                        guild.roles.everyone.id,

                    deny:
                        [
                            PermissionsBitField.Flags.ViewChannel
                        ]
                },

                {
                    id:
                        interaction.user.id,

                    allow:
                        [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.AttachFiles
                        ]
                },

                {
                    id:
                        guild.members.me.id,

                    allow:
                        [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory,
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.ManageMessages
                        ]
                }
            ]
        });


    // ----------------------------------------------
    // STAFF ACCESS
    // ----------------------------------------------

    const staffRoleIds =
        [

            ...(guildData.staffRoles?.junior || []),

            ...(guildData.staffRoles?.middle || []),

            ...(guildData.staffRoles?.senior || []),

            ...(guildData.staffRoles?.owner || [])
        ];

    const uniqueRoleIds =
        [...new Set(
            staffRoleIds
        )];

    for (
        const roleId of
        uniqueRoleIds
    ) {

        const role =
            guild.roles.cache.get(
                roleId
            );

        if (!role) {
            continue;
        }

        await channel.permissionOverwrites.edit(
            role.id,
            {

                ViewChannel:
                    true,

                ReadMessageHistory:
                    true,

                SendMessages:
                    true
            }
        ).catch(() => {});
    }


    // ----------------------------------------------
    // SAVE TICKET
    // ----------------------------------------------

    const tickets =
        getGuildTickets(
            guild.id
        );

    const ticket = {

        id:
            `${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`,

        channelId:
            channel.id,

        userId:
            interaction.user.id,

        claimedBy:
            null,

        panelId:
            panelId,

        createdAt:
            Date.now(),

        closed:
            false,

        closedAt:
            null
    };

    tickets.push(
        ticket
    );

    saveData();


    // ----------------------------------------------
    // TICKET MESSAGE
    // ----------------------------------------------

    const embed =
        new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(
                `🎫 ${panel.name}`
            )
            .setDescription(
                `أهلًا ${interaction.user} 👋\n\nتم إنشاء تذكرتك بنجاح.\nسيقوم أحد أعضاء الإدارة بالرد عليك قريبًا.`
            )
            .addFields(

                {
                    name:
                        "👤 صاحب التذكرة",

                    value:
                        `${interaction.user}`,

                    inline:
                        true
                },

                {
                    name:
                        "📋 الحالة",

                    value:
                        "🟢 مفتوحة",

                    inline:
                        true
                },

                {
                    name:
                        "🎯 المستلم",

                    value:
                        "لم يتم الاستلام بعد",

                    inline:
                        true
                }
            )
            .setFooter({
                text:
                    `Ticket ID: ${ticket.id}`
            })
            .setTimestamp();

    const row =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_claim"
                    )
                    .setLabel(
                        "استلام"
                    )
                    .setEmoji(
                        "🙋"
                    )
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_unclaim"
                    )
                    .setLabel(
                        "ترك"
                    )
                    .setEmoji(
                        "↩️"
                    )
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId(
                        "ticket_close"
                    )
                    .setLabel(
                        "إغلاق"
                    )
                    .setEmoji(
                        "🔒"
                    )
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    await channel.send({
        embeds: [embed],
        components: [row]
    });


    // ----------------------------------------------
    // LOG
    // ----------------------------------------------

    await sendLog(
        guild,
        "🎫 Ticket Created",
        `تم إنشاء تذكرة جديدة بواسطة ${interaction.user} في ${channel}.`,
        0x5865F2
    );

    return channel;
}


// ==================================================
// CLAIM TICKET
// ==================================================

async function claimTicket(
    channel,
    member
) {

    const guild =
        channel.guild;

    const guildData =
        getGuildData(
            guild.id
        );

    const ticket =
        findTicketByChannel(
            guild.id,
            channel.id
        );

    if (!ticket) {

        throw new Error(
            "هذه القناة ليست تذكرة مفتوحة."
        );
    }

    const level =
        getStaffLevel(
            member,
            guildData
        );

    if (
        level <= 0
    ) {

        throw new Error(
            "ليس لديك صلاحية استلام التذاكر."
        );
    }

    if (
        ticket.claimedBy
    ) {

        throw new Error(
            `التذكرة مستلمة بالفعل من <@${ticket.claimedBy}>.`
        );
    }

    ticket.claimedBy =
        member.id;

    ticket.claimedAt =
        Date.now();


    // ----------------------------------------------
    // POINTS
    // ----------------------------------------------

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

    user.ticketsClaimed =
        (user.ticketsClaimed || 0) + 1;

    stats.ticketsClaimed =
        (stats.ticketsClaimed || 0) + 1;

    addPoints(
        guild.id,
        member.id,
        POINTS.ticketClaim
    );


    // ----------------------------------------------
    // PERMISSION
    // ----------------------------------------------

    await channel.permissionOverwrites.edit(
        member.id,
        {

            ViewChannel:
                true,

            ReadMessageHistory:
                true,

            SendMessages:
                true
        }
    ).catch(() => {});


    saveData();


    await channel.send({
        embeds: [

            new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle(
                    "🙋 تم استلام التذكرة"
                )
                .setDescription(
                    `تم استلام التذكرة بواسطة ${member}.`
                )
                .setTimestamp()
        ]
    });


    await sendLog(
        guild,
        "🙋 Ticket Claimed",
        `${member} استلم التذكرة <#${channel.id}>.`,
        0x2ECC71
    );

    return true;
}


// ==================================================
// UNCLAIM TICKET
// ==================================================

async function unclaimTicket(
    channel,
    member
) {

    const guild =
        channel.guild;

    const guildData =
        getGuildData(
            guild.id
        );

    const ticket =
        findTicketByChannel(
            guild.id,
            channel.id
        );

    if (!ticket) {

        throw new Error(
            "هذه القناة ليست تذكرة مفتوحة."
        );
    }

    if (
        !ticket.claimedBy
    ) {

        throw new Error(
            "التذكرة غير مستلمة حاليًا."
        );
    }

    const memberLevel =
        getStaffLevel(
            member,
            guildData
        );

    let claimerLevel =
        0;

    const claimer =
        guild.members.cache.get(
            ticket.claimedBy
        ) ||
        await guild.members.fetch(
            ticket.claimedBy
        ).catch(
            () => null
        );

    if (claimer) {

        claimerLevel =
            getStaffLevel(
                claimer,
                guildData
            );
    }

    if (
        member.id !==
        ticket.claimedBy &&
        memberLevel <=
        claimerLevel
    ) {

        throw new Error(
            "لا يمكنك ترك تذكرة مستلمة من موظف مساوي أو أعلى منك."
        );
    }


    const previousClaimer =
        ticket.claimedBy;

    ticket.claimedBy =
        null;

    ticket.unclaimedAt =
        Date.now();


    // ----------------------------------------------
    // REMOVE EXPLICIT OVERWRITE
    // ----------------------------------------------

    await channel.permissionOverwrites.delete(
        previousClaimer
    ).catch(() => {});


    saveData();


    await channel.send({
        embeds: [

            new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle(
                    "↩️ تم ترك التذكرة"
                )
                .setDescription(
                    `تم ترك التذكرة ويمكن لموظف آخر استلامها الآن.\nبواسطة: ${member}`
                )
                .setTimestamp()
        ]
    });


    await sendLog(
        guild,
        "↩️ Ticket Unclaimed",
        `${member} قام بترك التذكرة <#${channel.id}>.`,
        0xF1C40F
    );

    return true;
}


// ==================================================
// CLOSE TICKET
// ==================================================

async function closeTicket(
    channel,
    member
) {

    const guild =
        channel.guild;

    const guildData =
        getGuildData(
            guild.id
        );

    const ticket =
        findTicketByChannel(
            guild.id,
            channel.id
        );

    if (!ticket) {

        throw new Error(
            "هذه القناة ليست تذكرة مفتوحة."
        );
    }

    if (
        !canManageTicket(
            ticket,
            member,
            guildData
        )
    ) {

        throw new Error(
            "ليس لديك صلاحية إغلاق هذه التذكرة."
        );
    }

    ticket.closed =
        true;

    ticket.closedAt =
        Date.now();

    const closer =
        getUserData(
            guild.id,
            member.id
        );

    const stats =
        getStats(
            guild.id,
            member.id
        );

    closer.ticketsClosed =
        (closer.ticketsClosed || 0) + 1;

    stats.ticketsClosed =
        (stats.ticketsClosed || 0) + 1;

    saveData();


    // ----------------------------------------------
    // LOG
    // ----------------------------------------------

    await sendLog(
        guild,
        "🔒 Ticket Closed",
        `تم إغلاق التذكرة <#${channel.id}> بواسطة ${member}.`,
        0xE67E22
    );


    // ----------------------------------------------
    // RATING
    // ----------------------------------------------

    await sendTicketRating(
        guild,
        ticket
    );


    // ----------------------------------------------
    // MESSAGE
    // ----------------------------------------------

    await channel.send({
        embeds: [

            new EmbedBuilder()
                .setColor(0xE67E22)
                .setTitle(
                    "🔒 تم إغلاق التذكرة"
                )
                .setDescription(
                    "سيتم حذف التذكرة خلال 3 ثوانٍ."
                )
                .setTimestamp()
        ]
    }).catch(() => {});


    setTimeout(
        () => {

            channel.delete(
                "إغلاق التذكرة"
            ).catch(() => {});

        },
        3000
    );

    return true;
}


// ==================================================
// DELETE TICKET
// ==================================================

async function deleteTicket(
    channel,
    member
) {

    const guild =
        channel.guild;

    const guildData =
        getGuildData(
            guild.id
        );

    const ticket =
        findTicketByChannel(
            guild.id,
            channel.id
        );

    if (!ticket) {

        throw new Error(
            "هذه القناة ليست تذكرة مفتوحة."
        );
    }

    const level =
        getStaffLevel(
            member,
            guildData
        );

    const allowed =
        ticket.userId === member.id ||
        ticket.claimedBy === member.id ||
        level >= 2;

    if (!allowed) {

        throw new Error(
            "ليس لديك صلاحية حذف هذه التذكرة."
        );
    }


    ticket.closed =
        true;

    ticket.closedAt =
        Date.now();

    ticket.deletedBy =
        member.id;

    ticket.deletedAt =
        Date.now();


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

    user.ticketsClosed =
        (user.ticketsClosed || 0) + 1;

    stats.ticketsClosed =
        (stats.ticketsClosed || 0) + 1;


    saveData();


    await sendLog(
        guild,
        "🗑️ Ticket Deleted",
        `تم حذف التذكرة <#${channel.id}> بواسطة ${member}.`,
        0xE74C3C
    );


    await channel.send({
        embeds: [

            new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle(
                    "🗑️ سيتم حذف التذكرة"
                )
                .setDescription(
                    "سيتم حذف القناة خلال لحظات."
                )
                .setTimestamp()
        ]
    }).catch(() => {});


    setTimeout(
        () => {

            channel.delete(
                "حذف التذكرة"
            ).catch(() => {});

        },
        1500
    );

    return true;
}


// ==================================================
// SEND TICKET RATING
// ==================================================

async function sendTicketRating(
    guild,
    ticket
) {

    try {

        if (
            !ticket
        ) {
            return;
        }

        if (
            !ticket.userId
        ) {
            return;
        }

        if (
            !ticket.claimedBy
        ) {
            return;
        }

        const user =
            await client.users.fetch(
                ticket.userId
            ).catch(
                () => null
            );

        if (!user) {
            return;
        }

        const pending =
            getGuildPendingRatings(
                guild.id
            );

        pending[ticket.id] = {

            ticketId:
                ticket.id,

            userId:
                ticket.userId,

            claimerId:
                ticket.claimedBy,

            createdAt:
                Date.now()
        };

        saveData();


        const row =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(
                            `ticket_rating_${ticket.id}_1`
                        )
                        .setLabel(
                            "1"
                        )
                        .setEmoji(
                            "⭐"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `ticket_rating_${ticket.id}_2`
                        )
                        .setLabel(
                            "2"
                        )
                        .setEmoji(
                            "⭐"
                        )
                        .setStyle(
                            ButtonStyle.Danger
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `ticket_rating_${ticket.id}_3`
                        )
                        .setLabel(
                            "3"
                        )
                        .setEmoji(
                            "⭐"
                        )
                        .setStyle(
                            ButtonStyle.Secondary
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `ticket_rating_${ticket.id}_4`
                        )
                        .setLabel(
                            "4"
                        )
                        .setEmoji(
                            "⭐"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        ),

                    new ButtonBuilder()
                        .setCustomId(
                            `ticket_rating_${ticket.id}_5`
                        )
                        .setLabel(
                            "5"
                        )
                        .setEmoji(
                            "⭐"
                        )
                        .setStyle(
                            ButtonStyle.Success
                        )
                );


        await user.send({

            embeds: [

                new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setTitle(
                        "⭐ تقييم التذكرة"
                    )
                    .setDescription(
                        `تم إغلاق تذكرتك في **${guild.name}**.\n\nنرجو تقييم الموظف الذي استلم تذكرتك من 1 إلى 5 نجوم.`
                    )
                    .setTimestamp()
            ],

            components: [
                row
            ]

        }).catch(() => {});

    } catch (error) {

        console.error(
            "Send Ticket Rating Error:",
            error
        );
    }
}


// ==================================================
// ADD TICKET RATING
// ==================================================

async function addTicketRating(
    guild,
    ticketId,
    stars,
    userId
) {

    const pending =
        getGuildPendingRatings(
            guild.id
        );

    const request =
        pending[ticketId];

    if (!request) {

        throw new Error(
            "التقييم غير موجود أو انتهت صلاحيته."
        );
    }

    if (
        request.userId !==
        userId
    ) {

        throw new Error(
            "لا يمكنك استخدام هذا التقييم."
        );
    }

    const rating =
        Number(stars);

    if (
        !Number.isInteger(rating) ||
        rating < 1 ||
        rating > 5
    ) {

        throw new Error(
            "التقييم غير صحيح."
        );
    }


    const ratings =
        getGuildRatings(
            guild.id
        );

    ratings[ticketId] = {

        ticketId:
            ticketId,

        userId:
            userId,

        claimerId:
            request.claimerId,

        stars:
            rating,

        createdAt:
            Date.now()
    };


    // ----------------------------------------------
    // STAFF STATS
    // ----------------------------------------------

    const claimer =
        getUserData(
            guild.id,
            request.claimerId
        );

    const stats =
        getStats(
            guild.id,
            request.claimerId
        );

    stats.ratings =
        (stats.ratings || 0) + 1;


    if (
        rating >= 4
    ) {

        claimer.goodRatings =
            (claimer.goodRatings || 0) + 1;

        stats.goodRatings =
            (stats.goodRatings || 0) + 1;

        addPoints(
            guild.id,
            request.claimerId,
            POINTS.goodRating
        );
    }


    delete pending[ticketId];

    saveData();


    await sendLog(
        guild,
        "⭐ Ticket Rating",
        `تم تقييم التذكرة **${ticketId}** بـ **${rating}/5** نجوم.\n**الموظف:** <@${request.claimerId}>\n**العضو:** <@${userId}>`,
        rating >= 4
            ? 0x2ECC71
            : 0xF1C40F
    );

    return rating;
}


// ==================================================
// END PART 3
// ==================================================
// ==================================================
// PART 4 - BUTTONS / PREFIX / ANTI-SPAM / XP / WELCOME / LOGIN
// ==================================================


// ==================================================
// BUTTON INTERACTIONS
// ==================================================

client.on(
    "interactionCreate",
    async (interaction) => {

        try {

            if (
                !interaction.isButton()
            ) {
                return;
            }


            // ==============================================
            // OPEN TICKET
            // ==============================================

            if (
                interaction.customId.startsWith(
                    "open_ticket_"
                )
            ) {

                const panelId =
                    interaction.customId.replace(
                        "open_ticket_",
                        ""
                    );

                try {

                    const channel =
                        await createTicket(
                            interaction,
                            panelId
                        );

                    return interaction.reply({
                        content:
                            `✅ تم إنشاء تذكرتك: ${channel}`,
                        ephemeral: true
                    });

                } catch (error) {

                    return interaction.reply({
                        content:
                            `❌ ${error.message}`,
                        ephemeral: true
                    });
                }
            }


            // ==============================================
            // CLAIM TICKET
            // ==============================================

            if (
                interaction.customId ===
                "ticket_claim"
            ) {

                if (
                    !interaction.guild ||
                    !interaction.channel
                ) {
                    return interaction.reply({
                        content:
                            "❌ هذا الزر يعمل داخل السيرفر فقط.",
                        ephemeral: true
                    });
                }

                try {

                    await claimTicket(
                        interaction.channel,
                        interaction.member
                    );

                    return interaction.reply({
                        content:
                            "✅ تم استلام التذكرة بنجاح.",
                        ephemeral: true
                    });

                } catch (error) {

                    return interaction.reply({
                        content:
                            `❌ ${error.message}`,
                        ephemeral: true
                    });
                }
            }


            // ==============================================
            // UNCLAIM TICKET
            // ==============================================

            if (
                interaction.customId ===
                "ticket_unclaim"
            ) {

                if (
                    !interaction.guild ||
                    !interaction.channel
                ) {
                    return interaction.reply({
                        content:
                            "❌ هذا الزر يعمل داخل السيرفر فقط.",
                        ephemeral: true
                    });
                }

                try {

                    await unclaimTicket(
                        interaction.channel,
                        interaction.member
                    );

                    return interaction.reply({
                        content:
                            "✅ تم ترك التذكرة.",
                        ephemeral: true
                    });

                } catch (error) {

                    return interaction.reply({
                        content:
                            `❌ ${error.message}`,
                        ephemeral: true
                    });
                }
            }


            // ==============================================
            // CLOSE TICKET
            // ==============================================

            if (
                interaction.customId ===
                "ticket_close"
            ) {

                if (
                    !interaction.guild ||
                    !interaction.channel
                ) {
                    return interaction.reply({
                        content:
                            "❌ هذا الزر يعمل داخل السيرفر فقط.",
                        ephemeral: true
                    });
                }

                try {

                    await closeTicket(
                        interaction.channel,
                        interaction.member
                    );

                    if (
                        !interaction.replied &&
                        !interaction.deferred
                    ) {

                        return interaction.reply({
                            content:
                                "🔒 تم إغلاق التذكرة.",
                            ephemeral: true
                        });
                    }

                } catch (error) {

                    return interaction.reply({
                        content:
                            `❌ ${error.message}`,
                        ephemeral: true
                    });
                }
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
                    interaction.customId.split(
                        "_"
                    );

                if (
                    parts.length < 4
                ) {
                    return interaction.reply({
                        content:
                            "❌ زر التقييم غير صحيح.",
                        ephemeral: true
                    });
                }

                const stars =
                    Number(
                        parts[parts.length - 1]
                    );

                const ticketId =
                    parts
                        .slice(
                            2,
                            parts.length - 1
                        )
                        .join("_");

                if (
                    !Number.isInteger(stars) ||
                    stars < 1 ||
                    stars > 5
                ) {

                    return interaction.reply({
                        content:
                            "❌ التقييم غير صحيح.",
                        ephemeral: true
                    });
                }

                try {

                    const rating =
                        await addTicketRating(
                            interaction.guild,
                            ticketId,
                            stars,
                            interaction.user.id
                        );

                    return interaction.reply({
                        content:
                            `⭐ تم تسجيل تقييمك: **${rating}/5**. شكرًا لك!`,
                        ephemeral: true
                    });

                } catch (error) {

                    return interaction.reply({
                        content:
                            `❌ ${error.message}`,
                        ephemeral: true
                    });
                }
            }

        } catch (error) {

            console.error(
                "Button Interaction Error:",
                error
            );

            if (
                interaction.replied ||
                interaction.deferred
            ) {

                await interaction.followUp({
                    content:
                        "❌ حدث خطأ أثناء تنفيذ الزر.",
                    ephemeral: true
                }).catch(() => {});

            } else {

                await interaction.reply({
                    content:
                        "❌ حدث خطأ أثناء تنفيذ الزر.",
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }
);


// ==================================================
// PREFIX PARSER
// ==================================================

function parsePrefixArguments(
    content
) {

    if (!content) {
        return {
            command: "",
            args: []
        };
    }

    const parts =
        content
            .trim()
            .split(/\s+/);

    const command =
        (parts.shift() || "")
            .toLowerCase();

    return {
        command,
        args: parts
    };
}


// ==================================================
// FIND DURATION IN PREFIX ARGS
// ==================================================

function findDurationInArgs(
    args
) {

    if (
        !Array.isArray(args)
    ) {
        return null;
    }

    for (
        let i = 0;
        i < args.length;
        i++
    ) {

        const parsed =
            parseDuration(
                args[i]
            );

        if (parsed) {

            return {
                duration:
                    args[i],

                index:
                    i,

                milliseconds:
                    parsed.milliseconds
            };
        }
    }

    return null;
}


// ==================================================
// GET REASON WITHOUT DURATION
// ==================================================

function getReasonWithoutDuration(
    args,
    durationIndex
) {

    if (
        !Array.isArray(args)
    ) {
        return "";
    }

    return args
        .filter(
            (_, index) =>
                index !== durationIndex
        )
        .join(" ")
        .trim();
}


// ==================================================
// PREFIX TARGET
// ==================================================

async function getPrefixTarget(
    message,
    input
) {

    if (!input) {

        return null;
    }

    return resolveMember(
        message.guild,
        input
    );
}


// ==================================================
// PREFIX COMMAND HANDLER
// ==================================================

client.on(
    "messageCreate",
    async (message) => {

        try {

            if (!message.guild) {
                return;
            }

            if (message.author.bot) {
                return;
            }

            const content =
                message.content.trim();

            if (!content) {
                return;
            }

            // لازم يبدأ بـ $
            if (
                !content.startsWith(
                    PREFIX
                )
            ) {
                return;
            }

            const withoutPrefix =
                content.slice(
                    PREFIX.length
                ).trim();

            if (!withoutPrefix) {
                return;
            }

            const {
                command,
                args
            } =
                parsePrefixArguments(
                    withoutPrefix
                );

            if (!command) {
                return;
            }


            // ==============================================
            // HELP
            // ==============================================

            if (
                [
                    "help",
                    "مساعدة",
                    "اوامر",
                    "أوامر"
                ].includes(command)
            ) {

                const embed =
                    new EmbedBuilder()
                        .setColor(0x5865F2)
                        .setTitle(
                            "🤖 أوامر البوت"
                        )
                        .setDescription(
                            "جميع الأوامر تعمل باستخدام `$`."
                        )
                        .addFields(

                            {
                                name:
                                    "🛡️ الإدارة",
                                value:
                                    [
                                        "`$ban @عضو السبب`",
                                        "`$unban ID`",
                                        "`$warn @عضو 1h السبب`",
                                        "`$warning @عضو 1h السبب`",
                                        "`$ت @عضو 1h السبب`",
                                        "`$تحذير @عضو 1h السبب`",
                                        "`$timeout @عضو 1h السبب`",
                                        "`$تايم @عضو 1h السبب`",
                                        "`$jail @عضو 1h السبب`",
                                        "`$سجن @عضو 1h السبب`"
                                    ].join("\n"),
                                inline:
                                    false
                            },

                            {
                                name:
                                    "🎫 التذاكر",
                                value:
                                    [
                                        "`$close`",
                                        "`$قفل`",
                                        "`$delete`",
                                        "`$حذف`"
                                    ].join("\n"),
                                inline:
                                    true
                            },

                            {
                                name:
                                    "📊 المعلومات",
                                value:
                                    [
                                        "`$points`",
                                        "`$نقاط`",
                                        "`$xp`",
                                        "`$balance`",
                                        "`$رصيد`",
                                        "`$time`",
                                        "`$مدة`"
                                    ].join("\n"),
                                inline:
                                    true
                            },

                            {
                                name:
                                    "💰 الاقتصاد",
                                value:
                                    [
                                        "`$pay @عضو 100`",
                                        "`$تحويل @عضو 100`",
                                        "`/balance`",
                                        "`/pay`"
                                    ].join("\n"),
                                inline:
                                    true
                            }
                        )
                        .setFooter({
                            text:
                                "Professional Discord Bot"
                        })
                        .setTimestamp();

                return message.reply({
                    embeds: [embed]
                });
            }


            // ==============================================
            // CLOSE
            // ==============================================

            if (
                [
                    "close",
                    "قفل"
                ].includes(command)
            ) {

                try {

                    await closeTicket(
                        message.channel,
                        message.member
                    );

                } catch (error) {

                    return prefixError(
                        message,
                        error.message
                    );
                }

                return;
            }


            // ==============================================
            // DELETE
            // ==============================================

            if (
                [
                    "delete",
                    "حذف"
                ].includes(command)
            ) {

                try {

                    await deleteTicket(
                        message.channel,
                        message.member
                    );

                } catch (error) {

                    return prefixError(
                        message,
                        error.message
                    );
                }

                return;
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

                const guildData =
                    getGuildData(
                        message.guild.id
                    );

                if (
                    getStaffLevel(
                        message.member,
                        guildData
                    ) <= 0
                ) {

                    return prefixError(
                        message,
                        "ليس لديك صلاحية استخدام هذا الأمر."
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

                if (
                    !canModerateTarget(
                        message.member,
                        target,
                        guildData
                    )
                ) {

                    return prefixError(
                        message,
                        "لا يمكنك حظر هذا العضو بسبب مستوى الإدارة."
                    );
                }

                const reason =
                    args
                        .slice(1)
                        .join(" ")
                        .trim() ||
                    "لم يتم تحديد سبب.";

                try {

                    await executeBan(
                        message.guild,
                        target,
                        message.member,
                        reason
                    );

                    return sendPrefixResult(
                        message,
                        `🔨 تم حظر ${target}.`
                    );

                } catch (error) {

                    return prefixError(
                        message,
                        error.message
                    );
                }
            }


            // ==============================================
            // UNBAN
            // ==============================================

            if (
                [
                    "unban",
                    "فكحظر",
                    "فك-حظر"
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
                    ) <= 0
                ) {

                    return prefixError(
                        message,
                        "ليس لديك صلاحية استخدام هذا الأمر."
                    );
                }

                const userId =
                    args[0];

                if (
                    !userId ||
                    !/^\d{17,20}$/.test(
                        userId
                    )
                ) {

                    return prefixError(
                        message,
                        "استخدم: `$unban ID`"
                    );
                }

                const reason =
                    args
                        .slice(1)
                        .join(" ")
                        .trim() ||
                    "لم يتم تحديد سبب.";

                try {

                    await message.guild.bans.remove(
                        userId,
                        reason
                    );

                    await sendLog(
                        message.guild,
                        "🔓 Unban",
                        `تم فك حظر <@${userId}> بواسطة ${message.member}\n**السبب:** ${reason}`,
                        0x2ECC71
                    );

                    return sendPrefixResult(
                        message,
                        `✅ تم فك حظر <@${userId}>.`
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
                    ) <= 0
                ) {

                    return prefixError(
                        message,
                        "ليس لديك صلاحية استخدام التحذير."
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
                        "استخدم: `$warn @العضو 1h السبب`"
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
                        "يجب تحديد مدة التحذير. مثال: `1h`"
                    );
                }

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
                        durationData.duration
                    );

                    return sendPrefixResult(
                        message,
                        `⚠️ تم تحذير ${target} لمدة **${durationData.duration}**.\n**السبب:** ${reason}`
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
                    "تايموت",
                    "تايم-اوت"
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
                    ) <= 0
                ) {

                    return prefixError(
                        message,
                        "ليس لديك صلاحية استخدام التايم أوت."
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
                        "استخدم: `$تايم @العضو 1h السبب`"
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
                        "لا يمكنك إعطاء هذا العضو تايم أوت."
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
                        "يجب تحديد مدة التايم أوت."
                    );
                }

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
                        durationData.duration
                    );

                    return sendPrefixResult(
                        message,
                        `⏱️ تم إعطاء ${target} تايم أوت لمدة **${durationData.duration}**.\n**السبب:** ${reason}`
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

                if (
                    level < 3
                ) {

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
                        durationData.duration
                    );

                    return sendPrefixResult(
                        message,
                        `🔒 تم سجن ${target} لمدة **${durationData.duration}**.\n**السبب:** ${reason}`
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

                let target =
                    message.member;

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
                            .setTitle(
                                `⭐ نقاط ${target.displayName}`
                            )
                            .setThumbnail(
                                target.user.displayAvatarURL({
                                    size: 256
                                })
                            )
                            .addFields(

                                {
                                    name:
                                        "🏆 نقاط الإجراءات",
                                    value:
                                        `${user.actionPoints || 0}`,
                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "⚠️ التحذيرات",
                                    value:
                                        `${user.warnings || 0}`,
                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "⏱️ التايم أوت",
                                    value:
                                        `${user.timeouts || 0}`,
                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "🔒 السجن",
                                    value:
                                        `${user.jails || 0}`,
                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "🎫 التذاكر المستلمة",
                                    value:
                                        `${user.ticketsClaimed || 0}`,
                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "⭐ التقييمات الجيدة",
                                    value:
                                        `${user.goodRatings || 0}`,
                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "📈 XP",
                                    value:
                                        `${user.xp || 0}`,
                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "💰 الرصيد",
                                    value:
                                        `${user.coins || 0}`,
                                    inline:
                                        true
                                },

                                {
                                    name:
                                        "📊 إجمالي النقاط",
                                    value:
                                        `${stats.points || user.actionPoints || 0}`,
                                    inline:
                                        true
                                }
                            )
                            .setTimestamp()
                    ]
                });
            }


            // ==============================================
            // XP
            // ==============================================

            if (
                command ===
                "xp"
            ) {

                let target =
                    message.member;

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

                let target =
                    message.member;

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
                            .setTitle(
                                "💰 الرصيد"
                            )
                            .setDescription(
                                `${target}\n\nالرصيد: **${user.coins || 0} ${guildData.currencyName || "Coins"}**`
                            )
                            .setTimestamp()
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
                    Number(
                        args[1]
                    );

                if (
                    !target ||
                    !Number.isInteger(
                        amount
                    ) ||
                    amount <= 0
                ) {

                    return prefixError(
                        message,
                        "استخدم: `$pay @العضو 100`"
                    );
                }

                if (
                    target.id ===
                    message.author.id
                ) {

                    return prefixError(
                        message,
                        "لا يمكنك تحويل الأموال لنفسك."
                    );
                }

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

                if (
                    (sender.coins || 0) <
                    amount
                ) {

                    return prefixError(
                        message,
                        "رصيدك غير كافي."
                    );
                }

                sender.coins =
                    (sender.coins || 0) -
                    amount;

                receiver.coins =
                    (receiver.coins || 0) +
                    amount;

                saveData();

                const guildData =
                    getGuildData(
                        message.guild.id
                    );

                return sendPrefixResult(
                    message,
                    `💸 تم تحويل **${amount} ${guildData.currencyName || "Coins"}** إلى ${target}.`
                );
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

                let target =
                    message.member;

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
                        jail.expiresAt -
                        Date.now()
                    );

                return sendPrefixResult(
                    message,
                    `🔒 ${target} مسجون.\n⏳ المتبقي: **${formatDuration(remaining)}**`
                );
            }

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

                await message.reply({
                    content:
                        "❌ حدث خطأ أثناء تنفيذ الأمر."
                }).catch(() => {});
            }
        }
    }
);


// ==================================================
// TICKET MESSAGE PERMISSIONS
// ==================================================

client.on(
    "messageCreate",
    async (message) => {

        try {

            if (!message.guild) {
                return;
            }

            if (message.author.bot) {
                return;
            }

            const ticket =
                findTicketByChannel(
                    message.guild.id,
                    message.channel.id
                );

            if (!ticket) {
                return;
            }

            const guildData =
                getGuildData(
                    message.guild.id
                );

            const member =
                message.member;

            if (!member) {
                return;
            }

            // صاحب التذكرة
            if (
                ticket.userId ===
                member.id
            ) {
                return;
            }

            const level =
                getStaffLevel(
                    member,
                    guildData
                );

            // عضو عادي
            if (
                level <= 0
            ) {

                await message.delete()
                    .catch(() => {});

                return;
            }

            // التذكرة غير مستلمة
            if (
                !ticket.claimedBy
            ) {
                return;
            }

            // المستلم
            if (
                ticket.claimedBy ===
                member.id
            ) {
                return;
            }

            let claimerLevel =
                0;

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

                claimerLevel =
                    0;
            }

            // الإدارة الأعلى من المستلم مسموح لها
            if (
                level >
                claimerLevel
            ) {
                return;
            }

            await message.delete()
                .catch(() => {});

            const warning =
                await message.channel.send({
                    content:
                        `⛔ ${member} هذه التذكرة مستلمة من <@${ticket.claimedBy}>، ولا يمكنك الكتابة فيها حاليًا.`
                })
                .catch(() => null);

            if (warning) {

                setTimeout(
                    () => {

                        warning.delete()
                            .catch(() => {});

                    },
                    3000
                );
            }

        } catch (error) {

            console.error(
                "Ticket Permission Error:",
                error
            );
        }
    }
);


// ==================================================
// ANTI-SPAM
// ==================================================

const antiSpamTracker =
    new Map();

client.on(
    "messageCreate",
    async (message) => {

        try {

            if (!message.guild) {
                return;
            }

            if (message.author.bot) {
                return;
            }

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
                antiSpamTracker.get(
                    key
                );

            if (!record) {

                record = {

                    messages: [],

                    lastContent: "",

                    warned: false
                };

                antiSpamTracker.set(
                    key,
                    record
                );
            }

            const now =
                Date.now();

            const windowTime =
                guildData.antiSpam.timeWindow ||
                5000;

            record.messages =
                record.messages.filter(
                    item =>
                        now -
                        item.timestamp <=
                        windowTime
                );

            const normalized =
                message.content
                    .trim()
                    .toLowerCase();

            if (
                !normalized
            ) {
                return;
            }

            record.messages.push({

                id:
                    message.id,

                timestamp:
                    now,

                content:
                    normalized
            });

            const maxMessages =
                guildData.antiSpam.maxMessages ||
                5;

            const sameMessages =
                record.messages.filter(
                    item =>
                        item.content ===
                        normalized
                );

            if (
                sameMessages.length >=
                maxMessages
            ) {

                if (
                    guildData.antiSpam.deleteMessages
                ) {

                    const uniqueMessageIds =
                        [
                            ...new Set(
                                record.messages.map(
                                    item =>
                                        item.id
                                )
                            )
                        ];

                    for (
                        const messageId
                        of uniqueMessageIds
                    ) {

                        const msg =
                            await message.channel.messages
                                .fetch(
                                    messageId
                                )
                                .catch(
                                    () => null
                                );

                        if (msg) {

                            await msg.delete()
                                .catch(() => {});
                        }
                    }
                }

                const warning =
                    await message.channel.send({

                        content:
                            `⛔ ${message.author} كفاية سبام! تم حذف رسائل السبام.`
                    }).catch(
                        () => null
                    );

                if (warning) {

                    setTimeout(
                        () => {

                            warning.delete()
                                .catch(() => {});

                        },
                        3000
                    );
                }

                await sendLog(
                    message.guild,
                    "🚨 Anti-Spam",
                    `${message.author} قام بتكرار نفس الرسالة أكثر من ${maxMessages} مرات.`,
                    0xE74C3C
                );

                record.messages =
                    [];
            }

        } catch (error) {

            console.error(
                "Anti Spam Error:",
                error
            );
        }
    }
);


// ==================================================
// XP + MESSAGE COUNTER
// ==================================================

client.on(
    "messageCreate",
    async (message) => {

        try {

            if (!message.guild) {
                return;
            }

            if (message.author.bot) {
                return;
            }

            const user =
                getUserData(
                    message.guild.id,
                    message.author.id
                );

            user.messages =
                (user.messages || 0) +
                1;

            const now =
                Date.now();

            // XP مرة كل 30 ثانية
            if (
                !user.lastXp ||
                now -
                user.lastXp >=
                30000
            ) {

                user.xp =
                    (user.xp || 0) +
                    10;

                user.lastXp =
                    now;
            }

            const stats =
                getStats(
                    message.guild.id,
                    message.author.id
                );

            stats.messages =
                (stats.messages || 0) +
                1;

            stats.xp =
                user.xp || 0;

            saveData();

        } catch (error) {

            console.error(
                "XP Error:",
                error
            );
        }
    }
);


// ==================================================
// WELCOME
// ==================================================

client.on(
    "guildMemberAdd",
    async (member) => {

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

            if (!channel) {
                return;
            }

            const embed =
                new EmbedBuilder()
                    .setColor(0x57F287)
                    .setTitle(
                        "👋 عضو جديد!"
                    )
                    .setDescription(
                        `أهلًا وسهلًا ${member} في **${member.guild.name}** 🎉\n\nنتمنى لك وقتًا ممتعًا معنا!`
                    )
                    .setThumbnail(
                        member.user.displayAvatarURL({
                            size:
                                256
                        })
                    )
                    .setFooter({
                        text:
                            `Member #${member.guild.memberCount}`
                    })
                    .setTimestamp();

            await channel.send({
                embeds:
                    [embed]
            });

        } catch (error) {

            console.error(
                "Welcome Error:",
                error
            );
        }
    }
);


// ==================================================
// GOODBYE
// ==================================================

client.on(
    "guildMemberRemove",
    async (member) => {

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

            if (!channel) {
                return;
            }

            const embed =
                new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle(
                        "👋 عضو غادر السيرفر"
                    )
                    .setDescription(
                        `غادر **${member.user.tag}** السيرفر.`
                    )
                    .setThumbnail(
                        member.user.displayAvatarURL({
                            size:
                                256
                        })
                    )
                    .setTimestamp();

            await channel.send({
                embeds:
                    [embed]
            });

        } catch (error) {

            console.error(
                "Goodbye Error:",
                error
            );
        }
    }
);


// ==================================================
// BOT JOINS NEW SERVER
// ==================================================

client.on(
    "guildCreate",
    async (guild) => {

        try {

            getGuildData(
                guild.id
            );

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
    }
);


// ==================================================
// CLEAN TICKET DATA WHEN CHANNEL IS DELETED
// ==================================================

client.on(
    "channelDelete",
    async (channel) => {

        try {

            if (!channel.guild) {
                return;
            }

            const tickets =
                getGuildTickets(
                    channel.guild.id
                );

            const index =
                tickets.findIndex(
                    ticket =>
                        ticket.channelId ===
                        channel.id
                );

            if (
                index === -1
            ) {
                return;
            }

            tickets[index].closed =
                true;

            tickets[index].closedAt =
                Date.now();

            saveData();

        } catch (error) {

            console.error(
                "Channel Delete Error:",
                error
            );
        }
    }
);


// ==================================================
// EXPIRED WARNINGS + JAILS CLEANUP
// ==================================================

async function cleanupExpiredData() {

    try {

        const now =
            Date.now();

        let changed =
            false;


        // ==============================================
        // WARNINGS
        // ==============================================

        for (
            const guildId
            of Object.keys(
                data.warnings || {}
            )
        ) {

            const guildWarnings =
                data.warnings[guildId];

            for (
                const userId
                of Object.keys(
                    guildWarnings || {}
                )
            ) {

                const list =
                    guildWarnings[userId] ||
                    [];

                const active =
                    list.filter(
                        warning =>
                            warning.expiresAt >
                            now
                    );

                if (
                    active.length !==
                    list.length
                ) {

                    guildWarnings[userId] =
                        active;

                    changed =
                        true;
                }

                if (
                    active.length === 0
                ) {

                    delete guildWarnings[userId];

                    changed =
                        true;
                }
            }
        }


        // ==============================================
        // JAILS
        // ==============================================

        for (
            const guildId
            of Object.keys(
                data.jails || {}
            )
        ) {

            const guild =
                client.guilds.cache.get(
                    guildId
                );

            if (!guild) {
                continue;
            }

            const records =
                data.jails[guildId] ||
                [];

            for (
                const jail
                of [...records]
            ) {

                if (
                    jail.expiresAt <=
                    now
                ) {

                    try {

                        await releaseFromJail(
                            guild,
                            jail.userId
                        );

                    } catch (error) {

                        console.error(
                            "Jail Release Error:",
                            error
                        );
                    }

                    changed =
                        true;
                }
            }
        }


        // ==============================================
        // OLD PENDING RATINGS CLEANUP
        // ==============================================

        for (
            const guildId
            of Object.keys(
                data.pendingRatings || {}
            )
        ) {

            const pending =
                data.pendingRatings[guildId];

            for (
                const ticketId
                of Object.keys(
                    pending || {}
                )
            ) {

                const request =
                    pending[ticketId];

                if (
                    !request.createdAt ||
                    now -
                    request.createdAt >
                    7 * 24 * 60 * 60 * 1000
                ) {

                    delete pending[ticketId];

                    changed =
                        true;
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

client.once(
    "ready",
    async () => {

        try {

            const application =
                await client.application.fetch();

            APPLICATION_OWNER_ID =
                application.owner?.id ||
                null;

            client.user.setPresence({

                activities: [

                    {
                        name:
                            `${client.guilds.cache.size} Servers`,

                        type:
                            ActivityType.Watching
                    }
                ],

                status:
                    "online"
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
    }
);


// ==================================================
// LOGIN
// ==================================================

if (
    !TOKEN
) {

    console.error(
        "❌ DISCORD_TOKEN غير موجود في Environment Variables."
    );

    process.exit(1);
}

client.login(
    TOKEN
)
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
// END OF FILE
// ==================================================
