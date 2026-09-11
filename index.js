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

// ======================================================
// CLIENT
// ======================================================

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

// ======================================================
// FILES
// ======================================================

const DATA_FILE = path.join(__dirname, "data.json");

let data = {
    guilds: {},
    users: {},
    warnings: [],
    jails: [],
    tickets: {},
    stats: {},
    pay: {
        balances: {},
        enabled: false
    }
};

// ======================================================
// LOAD DATA
// ======================================================

function loadData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            saveData();
            return;
        }

        const raw = fs.readFileSync(DATA_FILE, "utf8");

        if (!raw.trim()) {
            saveData();
            return;
        }

        const parsed = JSON.parse(raw);

        data = {
            guilds: parsed.guilds || {},
            users: parsed.users || {},
            warnings: Array.isArray(parsed.warnings)
                ? parsed.warnings
                : [],
            jails: Array.isArray(parsed.jails)
                ? parsed.jails
                : [],
            tickets: parsed.tickets || {},
            stats: parsed.stats || {},
            pay: parsed.pay || {
                balances: {},
                enabled: false
            }
        };

        if (!data.pay.balances) {
            data.pay.balances = {};
        }

    } catch (error) {
        console.error("❌ Failed to load data:", error);

        data = {
            guilds: {},
            users: {},
            warnings: [],
            jails: [],
            tickets: {},
            stats: {},
            pay: {
                balances: {},
                enabled: false
            }
        };

        saveData();
    }
}

// ======================================================
// SAVE DATA
// ======================================================

function saveData() {
    try {
        fs.writeFileSync(
            DATA_FILE,
            JSON.stringify(data, null, 2),
            "utf8"
        );
    } catch (error) {
        console.error("❌ Failed to save data:", error);
    }
}

loadData();

// ======================================================
// BOT TOKEN
// ======================================================

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
    console.error("❌ DISCORD_TOKEN is missing!");
    process.exit(1);
}

// ======================================================
// BOT OWNER
// ======================================================

let APPLICATION_OWNER_ID = null;

async function refreshApplicationOwner() {
    try {
        const application = await client.application.fetch();

        if (application.owner) {
            APPLICATION_OWNER_ID = application.owner.id;
        }

        console.log(
            `👑 Bot Owner: ${APPLICATION_OWNER_ID || "Unknown"}`
        );

    } catch (error) {
        console.error(
            "❌ Could not fetch application owner:",
            error.message
        );
    }
}

// ======================================================
// OWNER CHECK
// ======================================================

async function isBotOwner(userId) {

    if (
        APPLICATION_OWNER_ID &&
        userId === APPLICATION_OWNER_ID
    ) {
        return true;
    }

    try {
        const application =
            await client.application.fetch();

        if (
            application.owner &&
            application.owner.id === userId
        ) {
            return true;
        }

    } catch (error) {
        console.error(
            "Owner check error:",
            error.message
        );
    }

    return false;
}

// ======================================================
// ADMIN CHECK
// ======================================================

function isAdmin(member) {

    if (!member) {
        return false;
    }

    return member.permissions.has(
        PermissionsBitField.Flags.Administrator
    );
}

// ======================================================
// MODERATOR CHECK
// ======================================================

function isModerator(member) {

    if (!member) {
        return false;
    }

    return (
        member.permissions.has(
            PermissionsBitField.Flags.Administrator
        ) ||
        member.permissions.has(
            PermissionsBitField.Flags.ManageGuild
        ) ||
        member.permissions.has(
            PermissionsBitField.Flags.ManageMessages
        )
    );
}

// ======================================================
// DURATION PARSER
// ======================================================

function parseDuration(input) {

    if (!input) {
        return null;
    }

    const value =
        String(input)
            .trim()
            .toLowerCase();

    const match =
        value.match(/^(\d+)(s|m|h|d|w)$/);

    if (!match) {
        return null;
    }

    const amount =
        Number(match[1]);

    const unit =
        match[2];

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return null;
    }

    const units = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000
    };

    const ms =
        amount * units[unit];

    if (
        !Number.isFinite(ms) ||
        ms <= 0
    ) {
        return null;
    }

    return ms;
}

// ======================================================
// FORMAT DURATION
// ======================================================

function formatDuration(ms) {

    let seconds =
        Math.floor(ms / 1000);

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

    if (days) {
        parts.push(`${days} يوم`);
    }

    if (hours) {
        parts.push(`${hours} ساعة`);
    }

    if (minutes) {
        parts.push(`${minutes} دقيقة`);
    }

    if (
        seconds &&
        parts.length === 0
    ) {
        parts.push(`${seconds} ثانية`);
    }

    return parts.join(" و ") || "0 ثانية";
}

// ======================================================
// GET USER STATS
// ======================================================

function getStats(guildId, userId) {

    const key =
        `${guildId}_${userId}`;

    if (!data.stats[key]) {

        data.stats[key] = {
            guildId,
            userId,

            warnings: 0,
            timeouts: 0,
            ticketsClaimed: 0,

            xp: 0,
            actionPoints: 0
        };
    }

    return data.stats[key];
}

// ======================================================
// ADD XP
// ======================================================

function addXP(guildId, userId, amount) {

    const stats =
        getStats(guildId, userId);

    stats.xp += amount;

    saveData();
}

// ======================================================
// ADD ACTION POINTS
// ======================================================

function addActionPoints(
    guildId,
    userId,
    amount
) {

    const stats =
        getStats(guildId, userId);

    stats.actionPoints += amount;

    saveData();
}

// ======================================================
// TOTAL POINTS
// ======================================================

function getTotalPoints(
    guildId,
    userId
) {

    const stats =
        getStats(guildId, userId);

    const xpPoints =
        Math.floor(
            stats.xp / 1500
        ) * 3;

    return (
        xpPoints +
        stats.actionPoints
    );
}

// ======================================================
// ADD MESSAGE XP
// ======================================================

function handleMessageXP(message) {

    if (!message.guild) {
        return;
    }

    if (message.author.bot) {
        return;
    }

    addXP(
        message.guild.id,
        message.author.id,
        10
    );
}

// ======================================================
// GUILD CONFIG
// ======================================================

function getGuildConfig(guildId) {

    if (!data.guilds[guildId]) {

        data.guilds[guildId] = {

            ticketCategoryId: null,

            jailRoleId: null,

            ticketPanelChannelId: null,

            ticketPanelMessageId: null
        };
    }

    return data.guilds[guildId];
}

// ======================================================
// TICKET CHECK
// ======================================================

function getTicket(channelId) {

    return data.tickets[channelId] || null;
}

// ======================================================
// HIGHEST ROLE POSITION
// ======================================================

function getHighestRolePosition(member) {

    if (!member) {
        return 0;
    }

    return member.roles.highest
        ? member.roles.highest.position
        : 0;
}

// ======================================================
// CAN WRITE IN CLAIMED TICKET
// ======================================================

async function canWriteInClaimedTicket(
    member,
    ticket
) {

    if (!member || !ticket) {
        return false;
    }

    // Ticket owner
    if (
        member.id === ticket.ownerId
    ) {
        return true;
    }

    // Claimer
    if (
        member.id === ticket.claimedBy
    ) {
        return true;
    }

    // Bot owner
    if (
        await isBotOwner(member.id)
    ) {
        return true;
    }

    // Not admin
    if (!isModerator(member)) {
        return false;
    }

    try {

        const claimer =
            await member.guild.members.fetch(
                ticket.claimedBy
            );

        if (!claimer) {
            return false;
        }

        const memberPosition =
            getHighestRolePosition(member);

        const claimerPosition =
            getHighestRolePosition(claimer);

        return memberPosition > claimerPosition;

    } catch (error) {

        console.error(
            "Higher admin check error:",
            error.message
        );

        return false;
    }
}

// ======================================================
// CREATE TICKET PANEL
// ======================================================

function createTicketPanel() {

    const embed =
        new EmbedBuilder()
            .setTitle("🎫 نظام التذاكر")
            .setDescription(
                "اضغط على الزر بالأسفل لفتح تذكرة خاصة مع الإدارة."
            )
            .setFooter({
                text: "Support System"
            });

    const row =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("ticket_create")
                    .setLabel("فتح تذكرة")
                    .setEmoji("🎫")
                    .setStyle(
                        ButtonStyle.Primary
                    )
            );

    return {
        embeds: [embed],
        components: [row]
    };
}

// ======================================================
// CREATE TICKET
// ======================================================

async function createTicket(interaction) {

    const guild =
        interaction.guild;

    const existing =
        Object.values(data.tickets)
            .find(ticket =>
                ticket.guildId === guild.id &&
                ticket.ownerId === interaction.user.id &&
                ticket.active === true
            );

    if (existing) {

        return interaction.reply({
            content:
                `❌ عندك تذكرة مفتوحة بالفعل: <#${existing.channelId}>`,
            ephemeral: true
        });
    }

    const config =
        getGuildConfig(guild.id);

    let category = null;

    if (config.ticketCategoryId) {

        category =
            guild.channels.cache.get(
                config.ticketCategoryId
            );

        if (
            !category ||
            category.type !== ChannelType.GuildCategory
        ) {
            category = null;
        }
    }

    const channelName =
        `ticket-${interaction.user.username}`
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, "")
            .slice(0, 20);

    const permissionOverwrites = [

        {
            id: guild.roles.everyone.id,

            deny: [
                PermissionsBitField.Flags.ViewChannel
            ]
        },

        {
            id: interaction.user.id,

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
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.ManageChannels,
                PermissionsBitField.Flags.ManageMessages
            ]
        }
    ];

    const channel =
        await guild.channels.create({

            name: channelName,

            type: ChannelType.GuildText,

            parent: category
                ? category.id
                : null,

            permissionOverwrites
        });

    data.tickets[channel.id] = {

        channelId: channel.id,

        guildId: guild.id,

        ownerId: interaction.user.id,

        claimedBy: null,

        claimedAt: null,

        active: true,

        createdAt: Date.now()
    };

    saveData();

    const embed =
        new EmbedBuilder()
            .setTitle("🎫 تذكرة جديدة")
            .setDescription(
                `أهلًا <@${interaction.user.id}>\n\n` +
                "اكتب مشكلتك هنا وسيقوم أحد أفراد الإدارة بمساعدتك.\n\n" +
                "عند استلام التذكرة سيتم منع الإداريين الآخرين من الكتابة فيها."
            );

    const row =
        new ActionRowBuilder()
            .addComponents(

                new ButtonBuilder()
                    .setCustomId("ticket_claim")
                    .setLabel("استلام التذكرة")
                    .setEmoji("📥")
                    .setStyle(
                        ButtonStyle.Success
                    ),

                new ButtonBuilder()
                    .setCustomId("ticket_unclaim")
                    .setLabel("إلغاء الاستلام")
                    .setEmoji("↩️")
                    .setStyle(
                        ButtonStyle.Secondary
                    ),

                new ButtonBuilder()
                    .setCustomId("ticket_close")
                    .setLabel("إغلاق التذكرة")
                    .setEmoji("🔒")
                    .setStyle(
                        ButtonStyle.Danger
                    )
            );

    await channel.send({
        content:
            `<@${interaction.user.id}>`,
        embeds: [embed],
        components: [row]
    });

    await interaction.reply({
        content:
            `✅ تم فتح تذكرتك: ${channel}`,
        ephemeral: true
    });
}

// ======================================================
// CLAIM TICKET
// ======================================================

async function claimTicket(interaction) {

    const ticket =
        getTicket(interaction.channel.id);

    if (!ticket || !ticket.active) {

        return interaction.reply({
            content:
                "❌ هذه ليست تذكرة فعالة.",
            ephemeral: true
        });
    }

    if (!isModerator(interaction.member)) {

        return interaction.reply({
            content:
                "❌ هذا الزر للإدارة فقط.",
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

    ticket.claimedBy =
        interaction.user.id;

    ticket.claimedAt =
        Date.now();

    const stats =
        getStats(
            interaction.guild.id,
            interaction.user.id
        );

    stats.ticketsClaimed += 1;

    addActionPoints(
        interaction.guild.id,
        interaction.user.id,
        3
    );

    saveData();

    const embed =
        new EmbedBuilder()
            .setTitle("📥 تم استلام التذكرة")
            .setDescription(
                `تم استلام التذكرة بواسطة <@${interaction.user.id}>.\n\n` +
                "🔒 الإداريون الآخرون لن يستطيعوا الكتابة الآن.\n" +
                "👑 الإداري الأعلى يستطيع الكتابة.\n" +
                "👑 Owner يستطيع الكتابة."
            );

    await interaction.channel.send({
        embeds: [embed]
    });

    return interaction.reply({
        content:
            "✅ تم استلام التذكرة بنجاح.",
        ephemeral: true
    });
}

// ======================================================
// UNCLAIM TICKET
// ======================================================

async function unclaimTicket(interaction) {

    const ticket =
        getTicket(interaction.channel.id);

    if (!ticket || !ticket.active) {

        return interaction.reply({
            content:
                "❌ هذه ليست تذكرة فعالة.",
            ephemeral: true
        });
    }

    if (!ticket.claimedBy) {

        return interaction.reply({
            content:
                "ℹ️ التذكرة غير مستلمة حاليًا.",
            ephemeral: true
        });
    }

    const canUnclaim =
        ticket.claimedBy === interaction.user.id ||
        isAdmin(interaction.member) ||
        await isBotOwner(interaction.user.id);

    if (!canUnclaim) {

        return interaction.reply({
            content:
                "❌ فقط مستلم التذكرة أو الإدارة العليا تستطيع إلغاء الاستلام.",
            ephemeral: true
        });
    }

    ticket.claimedBy = null;
    ticket.claimedAt = null;

    saveData();

    await interaction.channel.send({
        embeds: [
            new EmbedBuilder()
                .setTitle("↩️ تم إلغاء استلام التذكرة")
                .setDescription(
                    "يمكن الآن لأي إداري مؤهل استلام التذكرة من جديد."
                )
        ]
    });

    return interaction.reply({
        content:
            "✅ تم إلغاء استلام التذكرة.",
        ephemeral: true
    });
}

// ======================================================
// CLOSE TICKET
// ======================================================

async function closeTicket(interaction) {

    const ticket =
        getTicket(interaction.channel.id);

    if (!ticket || !ticket.active) {

        return interaction.reply({
            content:
                "❌ هذه ليست تذكرة فعالة.",
            ephemeral: true
        });
    }

    const allowed =
        interaction.user.id === ticket.ownerId ||
        isModerator(interaction.member) ||
        await isBotOwner(interaction.user.id);

    if (!allowed) {

        return interaction.reply({
            content:
                "❌ ليس لديك صلاحية إغلاق التذكرة.",
            ephemeral: true
        });
    }

    ticket.active = false;

    saveData();

    await interaction.reply({
        content:
            "🔒 سيتم إغلاق التذكرة خلال 3 ثوانٍ."
    });

    setTimeout(async () => {

        try {

            await interaction.channel.delete(
                "Ticket closed"
            );

            delete data.tickets[
                interaction.channel.id
            ];

            saveData();

        } catch (error) {

            console.error(
                "Ticket delete error:",
                error.message
            );
        }

    }, 3000);
}

// ======================================================
// WARNING REASONS
// ======================================================

const WARNING_REASONS = [

    {
        label: "مخالفة القوانين",
        value: "rules",
        description: "مخالفة أحد قوانين السيرفر"
    },

    {
        label: "إساءة / سب",
        value: "insult",
        description: "إساءة أو سب"
    },

    {
        label: "إزعاج",
        value: "spam",
        description: "إزعاج أو سبام"
    },

    {
        label: "مخالفة الإدارة",
        value: "staff",
        description: "مخالفة تعليمات الإدارة"
    },

    {
        label: "سبب آخر",
        value: "other",
        description: "كتابة سبب مخصص"
    }
];

// ======================================================
// WARNING DURATIONS
// ======================================================

const WARNING_DURATIONS = [

    {
        label: "ساعة",
        value: "1h"
    },

    {
        label: "6 ساعات",
        value: "6h"
    },

    {
        label: "12 ساعة",
        value: "12h"
    },

    {
        label: "يوم",
        value: "1d"
    },

    {
        label: "3 أيام",
        value: "3d"
    },

    {
        label: "أسبوع",
        value: "1w"
    }
];

// ======================================================
// JAIL REASONS
// ======================================================

const JAIL_REASONS = [

    {
        label: "مخالفة القوانين",
        value: "rules"
    },

    {
        label: "سبام",
        value: "spam"
    },

    {
        label: "إساءة",
        value: "insult"
    },

    {
        label: "مخالفة إدارية",
        value: "staff"
    },

    {
        label: "سبب آخر",
        value: "other"
    }
];

// ======================================================
// JAIL DURATIONS
// ======================================================

const JAIL_DURATIONS = [

    {
        label: "5 دقائق",
        value: "5m"
    },

    {
        label: "15 دقيقة",
        value: "15m"
    },

    {
        label: "30 دقيقة",
        value: "30m"
    },

    {
        label: "ساعة",
        value: "1h"
    },

    {
        label: "6 ساعات",
        value: "6h"
    },

    {
        label: "يوم",
        value: "1d"
    }
];

// ======================================================
// WARN COMMAND START
// ======================================================

async function startWarning(interaction) {

    const member =
        interaction.options.getMember("user");

    if (!member) {

        return interaction.reply({
            content:
                "❌ لم أستطع العثور على العضو.",
            ephemeral: true
        });
    }

    if (
        member.id === interaction.user.id
    ) {

        return interaction.reply({
            content:
                "❌ لا يمكنك تحذير نفسك.",
            ephemeral: true
        });
    }

    if (
        member.user.bot
    ) {

        return interaction.reply({
            content:
                "❌ لا يمكنك تحذير Bot.",
            ephemeral: true
        });
    }

    if (
        member.roles.highest.position >=
        interaction.member.roles.highest.position &&
        !(await isBotOwner(interaction.user.id))
    ) {

        return interaction.reply({
            content:
                "❌ لا يمكنك معاقبة عضو أعلى منك في الرتب.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                `warn_reason_${member.id}`
            )
            .setPlaceholder(
                "اختر سبب التحذير"
            )
            .addOptions(
                WARNING_REASONS.map(reason =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(reason.label)
                        .setValue(reason.value)
                        .setDescription(reason.description)
                )
            );

    const row =
        new ActionRowBuilder()
            .addComponents(menu);

    return interaction.reply({
        content:
            `⚠️ اختر سبب تحذير <@${member.id}>:`,
        components: [row],
        ephemeral: true
    });
}

// ======================================================
// SHOW WARNING DURATION
// ======================================================

async function showWarningDuration(
    interaction,
    targetId,
    reason
) {

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                `warn_duration_${targetId}_${reason}`
            )
            .setPlaceholder(
                "اختر مدة التحذير"
            )
            .addOptions(
                WARNING_DURATIONS.map(duration =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(duration.label)
                        .setValue(duration.value)
                )
            );

    const row =
        new ActionRowBuilder()
            .addComponents(menu);

    return interaction.update({
        content:
            "⏱️ اختر مدة التحذير:",
        components: [row]
    });
}

// ======================================================
// CUSTOM WARNING REASON MODAL
// ======================================================

async function showCustomWarningReason(
    interaction,
    targetId
) {

    const modal =
        new ModalBuilder()
            .setCustomId(
                `warn_custom_${targetId}`
            )
            .setTitle("سبب التحذير");

    const input =
        new TextInputBuilder()
            .setCustomId("reason")
            .setLabel("اكتب سبب التحذير")
            .setPlaceholder(
                "اكتب السبب هنا..."
            )
            .setStyle(
                TextInputStyle.Paragraph
            )
            .setRequired(true)
            .setMaxLength(300);

    const row =
        new ActionRowBuilder()
            .addComponents(input);

    modal.addComponents(row);

    return interaction.showModal(modal);
}

// ======================================================
// APPLY WARNING
// ======================================================

async function applyWarning(
    interaction,
    targetId,
    reason,
    duration
) {

    const member =
        await interaction.guild.members
            .fetch(targetId)
            .catch(() => null);

    if (!member) {

        return interaction.update({
            content:
                "❌ العضو لم يعد موجودًا.",
            components: []
        });
    }

    const durationMs =
        parseDuration(duration);

    if (!durationMs) {

        return interaction.update({
            content:
                "❌ مدة غير صحيحة.",
            components: []
        });
    }

    const warning = {

        id:
            `${Date.now()}_${Math.random()
                .toString(36)
                .slice(2)}`,

        guildId:
            interaction.guild.id,

        userId:
            member.id,

        moderatorId:
            interaction.user.id,

        reason,

        durationMs,

        createdAt:
            Date.now(),

        expiresAt:
            Date.now() + durationMs
    };

    data.warnings.push(warning);

    const stats =
        getStats(
            interaction.guild.id,
            interaction.user.id
        );

    stats.warnings += 1;

    stats.actionPoints += 3;

    saveData();

    try {

        await member.send(
            `⚠️ تم تحذيرك في **${interaction.guild.name}**.\n` +
            `السبب: ${reason}\n` +
            `المدة: ${formatDuration(durationMs)}`
        );

    } catch (_) {}

    return interaction.update({

        content:
            `✅ تم تحذير <@${member.id}> بنجاح.\n\n` +
            `**السبب:** ${reason}\n` +
            `**المدة:** ${formatDuration(durationMs)}`,

        components: []
    });
}

// ======================================================
// TIMEOUT COMMAND
// ======================================================

async function executeTimeout(interaction) {

    const member =
        interaction.options.getMember("user");

    const durationInput =
        interaction.options.getString("duration");

    const reason =
        interaction.options.getString("reason") ||
        "بدون سبب";

    if (!member) {

        return interaction.reply({
            content:
                "❌ العضو غير موجود.",
            ephemeral: true
        });
    }

    if (
        member.id === interaction.user.id
    ) {

        return interaction.reply({
            content:
                "❌ لا يمكنك إعطاء نفسك Timeout.",
            ephemeral: true
        });
    }

    const durationMs =
        parseDuration(durationInput);

    if (!durationMs) {

        return interaction.reply({
            content:
                "❌ المدة غير صحيحة.",
            ephemeral: true
        });
    }

    // Discord Timeout maximum = 28 days
    if (
        durationMs >
        28 * 24 * 60 * 60 * 1000
    ) {

        return interaction.reply({
            content:
                "❌ أقصى مدة للـ Timeout هي 28 يوم.",
            ephemeral: true
        });
    }

    if (
        member.roles.highest.position >=
        interaction.member.roles.highest.position &&
        !(await isBotOwner(interaction.user.id))
    ) {

        return interaction.reply({
            content:
                "❌ لا يمكنك إعطاء Timeout لعضو أعلى منك.",
            ephemeral: true
        });
    }

    try {

        await member.timeout(
            durationMs,
            reason
        );

    } catch (error) {

        return interaction.reply({
            content:
                "❌ لم أستطع إعطاء Timeout للعضو. تأكد من صلاحيات البوت وترتيب الرتب.",
            ephemeral: true
        });
    }

    const stats =
        getStats(
            interaction.guild.id,
            interaction.user.id
        );

    stats.timeouts += 1;

    stats.actionPoints += 3;

    saveData();

    try {

        await member.send(
            `⏳ تم إعطاؤك Timeout في **${interaction.guild.name}**.\n` +
            `المدة: ${formatDuration(durationMs)}\n` +
            `السبب: ${reason}`
        );

    } catch (_) {}

    return interaction.reply({
        content:
            `✅ تم إعطاء <@${member.id}> تايم.\n\n` +
            `⏱️ **المدة:** ${formatDuration(durationMs)}\n` +
            `📝 **السبب:** ${reason}`
    });
}

// ======================================================
// SETUP JAIL
// ======================================================

async function setupJail(interaction) {

    if (
        !(await isBotOwner(interaction.user.id))
    ) {

        return interaction.reply({
            content:
                "❌ هذا الأمر للـ Owner فقط.",
            ephemeral: true
        });
    }

    const guild =
        interaction.guild;

    const config =
        getGuildConfig(guild.id);

    let role = null;

    if (config.jailRoleId) {

        role =
            guild.roles.cache.get(
                config.jailRoleId
            );
    }

    if (!role) {

        role =
            await guild.roles.create({
                name: "سجين",
                color: 0x555555,
                reason: "Jail system"
            });

        config.jailRoleId =
            role.id;

        saveData();
    }

    return interaction.reply({
        content:
            `✅ تم تجهيز رتبة السجن: ${role}\n\n` +
            "⚠️ مهم: رتبة البوت يجب أن تكون أعلى من رتبة السجين."
    });
}

// ======================================================
// START JAIL
// ======================================================

async function startJail(interaction) {

    const member =
        interaction.options.getMember("user");

    if (!member) {

        return interaction.reply({
            content:
                "❌ العضو غير موجود.",
            ephemeral: true
        });
    }

    if (
        member.id === interaction.user.id
    ) {

        return interaction.reply({
            content:
                "❌ لا يمكنك سجن نفسك.",
            ephemeral: true
        });
    }

    const config =
        getGuildConfig(
            interaction.guild.id
        );

    let role = null;

    if (config.jailRoleId) {

        role =
            interaction.guild.roles.cache.get(
                config.jailRoleId
            );
    }

    if (!role) {

        return interaction.reply({
            content:
                "❌ لم يتم إعداد السجن بعد.\nاستخدم `/setup-jail` أولًا.",
            ephemeral: true
        });
    }

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                `jail_reason_${member.id}`
            )
            .setPlaceholder(
                "اختر سبب السجن"
            )
            .addOptions(
                JAIL_REASONS.map(reason =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(reason.label)
                        .setValue(reason.value)
                )
            );

    return interaction.reply({

        content:
            `🔒 اختر سبب سجن <@${member.id}>:`,

        components: [
            new ActionRowBuilder()
                .addComponents(menu)
        ],

        ephemeral: true
    });
}

// ======================================================
// SHOW JAIL DURATION
// ======================================================

async function showJailDuration(
    interaction,
    targetId,
    reason
) {

    const menu =
        new StringSelectMenuBuilder()
            .setCustomId(
                `jail_duration_${targetId}_${reason}`
            )
            .setPlaceholder(
                "اختر مدة السجن"
            )
            .addOptions(
                JAIL_DURATIONS.map(duration =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(duration.label)
                        .setValue(duration.value)
                )
            );

    return interaction.update({

        content:
            "⏱️ اختر مدة السجن:",

        components: [
            new ActionRowBuilder()
                .addComponents(menu)
        ]
    });
}

// ======================================================
// APPLY JAIL
// ======================================================

async function applyJail(
    interaction,
    targetId,
    reason,
    duration
) {

    const member =
        await interaction.guild.members
            .fetch(targetId)
            .catch(() => null);

    if (!member) {

        return interaction.update({
            content:
                "❌ العضو غير موجود.",
            components: []
        });
    }

    const config =
        getGuildConfig(
            interaction.guild.id
        );

    const role =
        interaction.guild.roles.cache.get(
            config.jailRoleId
        );

    if (!role) {

        return interaction.update({
            content:
                "❌ رتبة السجن غير موجودة.",
            components: []
        });
    }

    const durationMs =
        parseDuration(duration);

    if (!durationMs) {

        return interaction.update({
            content:
                "❌ المدة غير صحيحة.",
            components: []
        });
    }

    try {

        await member.roles.add(
            role,
            `Jail: ${reason}`
        );

    } catch (error) {

        return interaction.update({
            content:
                "❌ لم أستطع إعطاء رتبة السجن. تأكد من ترتيب الرتب.",
            components: []
        });
    }

    data.jails.push({

        id:
            `${Date.now()}_${Math.random()
                .toString(36)
                .slice(2)}`,

        guildId:
            interaction.guild.id,

        userId:
            member.id,

        moderatorId:
            interaction.user.id,

        reason,

        roleId:
            role.id,

        createdAt:
            Date.now(),

        expiresAt:
            Date.now() + durationMs
    });

    saveData();

    try {

        await member.send(
            `🔒 تم سجنك في **${interaction.guild.name}**.\n` +
            `السبب: ${reason}\n` +
            `المدة: ${formatDuration(durationMs)}`
        );

    } catch (_) {}

    return interaction.update({

        content:
            `✅ تم سجن <@${member.id}>.\n\n` +
            `🔒 **السبب:** ${reason}\n` +
            `⏱️ **المدة:** ${formatDuration(durationMs)}`,

        components: []
    });
}

// ======================================================
// CLEAN EXPIRED WARNINGS
// ======================================================

function cleanupWarnings() {

    const now =
        Date.now();

    const before =
        data.warnings.length;

    data.warnings =
        data.warnings.filter(
            warning =>
                warning.expiresAt > now
        );

    if (
        data.warnings.length !== before
    ) {
        saveData();
    }
}

// ======================================================
// CLEAN EXPIRED JAILS
// ======================================================

async function cleanupJails() {

    if (
        !Array.isArray(data.jails)
    ) {
        return;
    }

    const now =
        Date.now();

    const expired =
        data.jails.filter(
            jail =>
                jail.expiresAt <= now
        );

    if (!expired.length) {
        return;
    }

    for (const jail of expired) {

        try {

            const guild =
                client.guilds.cache.get(
                    jail.guildId
                );

            if (!guild) {
                continue;
            }

            const member =
                await guild.members
                    .fetch(jail.userId)
                    .catch(() => null);

            if (!member) {
                continue;
            }

            if (
                member.roles.cache.has(
                    jail.roleId
                )
            ) {

                await member.roles.remove(
                    jail.roleId,
                    "Jail expired"
                );
            }

        } catch (error) {

            console.error(
                "Jail cleanup error:",
                error.message
            );
        }
    }

    data.jails =
        data.jails.filter(
            jail =>
                jail.expiresAt > now
        );

    saveData();
}

// ======================================================
// CLEANUP TICKETS
// ======================================================

async function cleanupTickets() {

    let changed = false;

    for (
        const [channelId, ticket]
        of Object.entries(data.tickets)
    ) {

        const guild =
            client.guilds.cache.get(
                ticket.guildId
            );

        if (!guild) {
            delete data.tickets[channelId];
            changed = true;
            continue;
        }

        const channel =
            guild.channels.cache.get(
                channelId
            );

        if (!channel) {
            delete data.tickets[channelId];
            changed = true;
        }
    }

    if (changed) {
        saveData();
    }
}

// ======================================================
// COMMANDS
// ======================================================

function buildCommands() {

    return [

        new SlashCommandBuilder()
            .setName("ping")
            .setDescription("فحص حالة البوت"),

        new SlashCommandBuilder()
            .setName("warn")
            .setDescription("إعطاء تحذير لعضو")
            .addUserOption(option =>
                option
                    .setName("user")
                    .setDescription("العضو")
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName("timeout")
            .setDescription("إعطاء Timeout لعضو")
            .addUserOption(option =>
                option
                    .setName("user")
                    .setDescription("العضو")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("duration")
                    .setDescription("المدة مثال: 10m أو 1h أو 1d")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("reason")
                    .setDescription("سبب التايم")
                    .setRequired(false)
            ),

        new SlashCommandBuilder()
            .setName("setup-jail")
            .setDescription("تجهيز نظام السجن - Owner فقط"),

        new SlashCommandBuilder()
            .setName("jail")
            .setDescription("سجن عضو")
            .addUserOption(option =>
                option
                    .setName("user")
                    .setDescription("العضو")
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName("ticket-panel")
            .setDescription("إرسال لوحة التذاكر"),

        new SlashCommandBuilder()
            .setName("setup-ticket-category")
            .setDescription("تحديد كاتيجوري التذاكر")
            .addChannelOption(option =>
                option
                    .setName("category")
                    .setDescription("كاتيجوري التذاكر")
                    .addChannelTypes(
                        ChannelType.GuildCategory
                    )
                    .setRequired(true)
            )
    ].map(command =>
        command.toJSON()
    );
}

// ======================================================
// REGISTER COMMANDS
// ======================================================

async function registerCommands() {

    try {

        const rest =
            new REST({
                version: "10"
            }).setToken(TOKEN);

        const commands =
            buildCommands();

        await rest.put(
            Routes.applicationCommands(
                client.user.id
            ),
            {
                body: commands
            }
        );

        console.log(
            "✅ Slash commands registered."
        );

    } catch (error) {

        console.error(
            "❌ Command registration error:",
            error
        );
    }
}

// ======================================================
// READY
// ======================================================

client.once(
    "ready",
    async () => {

        console.log(
            "===================================="
        );

        console.log(
            `✅ Logged in as ${client.user.tag}`
        );

        console.log(
            `🌐 Servers: ${client.guilds.cache.size}`
        );

        console.log(
            "===================================="
        );

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

        await refreshApplicationOwner();

        await registerCommands();

        console.log(
            "🚀 Bot is ready."
        );

        setInterval(
            () => {
                cleanupWarnings();
            },
            30 * 1000
        );

        setInterval(
            async () => {
                await cleanupJails();
            },
            30 * 1000
        );

        setInterval(
            async () => {
                await cleanupTickets();
            },
            60 * 1000
        );
    }
);

// ======================================================
// MESSAGE CREATE
// ======================================================

client.on(
    "messageCreate",
    async message => {

        if (
            message.author.bot
        ) {
            return;
        }

        // ==============================================
        // XP
        // ==============================================

        handleMessageXP(message);

        // ==============================================
        // $نقاط
        // ==============================================

        if (
            message.content.trim() === "$نقاط"
        ) {

            if (!message.guild) {
                return;
            }

            const stats =
                getStats(
                    message.guild.id,
                    message.author.id
                );

            const totalPoints =
                getTotalPoints(
                    message.guild.id,
                    message.author.id
                );

            const embed =
                new EmbedBuilder()
                    .setTitle("📊 إحصائيات النقاط")
                    .setDescription(
                        `إحصائيات <@${message.author.id}>`
                    )
                    .addFields(

                        {
                            name:
                                "⚠️ التحذيرات",

                            value:
                                `${stats.warnings}`,

                            inline: true
                        },

                        {
                            name:
                                "⏳ الـ Timeouts",

                            value:
                                `${stats.timeouts}`,

                            inline: true
                        },

                        {
                            name:
                                "🎫 التذاكر المستلمة",

                            value:
                                `${stats.ticketsClaimed}`,

                            inline: true
                        },

                        {
                            name:
                                "⭐ XP",

                            value:
                                `${stats.xp}`,

                            inline: true
                        },

                        {
                            name:
                                "💰 النقاط",

                            value:
                                `${totalPoints}`,

                            inline: true
                        }
                    );

            return message.reply({
                embeds: [embed]
            });
        }

        // ==============================================
        // !ping
        // ==============================================

        if (
            message.content === "!ping"
        ) {

            return message.reply(
                "🏓 Pong!"
            );
        }

        // ==============================================
        // TICKET CLAIM LOCK
        // ==============================================

        const ticket =
            getTicket(
                message.channel.id
            );

        if (
            ticket &&
            ticket.active &&
            ticket.claimedBy
        ) {

            const allowed =
                await canWriteInClaimedTicket(
                    message.member,
                    ticket
                );

            if (!allowed) {

                try {

                    await message.delete();

                    const warning =
                        await message.channel.send(
                            `🔒 <@${message.author.id}> التذكرة مستلمة بواسطة <@${ticket.claimedBy}>.\n` +
                            `لا يمكنك الكتابة فيها حاليًا.`
                        );

                    setTimeout(
                        () => {
                            warning.delete()
                                .catch(() => {});
                        },
                        3000
                    );

                } catch (_) {}

                return;
            }
        }
    }
);

// ======================================================
// INTERACTION CREATE
// ======================================================

client.on(
    "interactionCreate",
    async interaction => {

        try {

            // ==================================================
            // SLASH COMMANDS
            // ==================================================

            if (
                interaction.isChatInputCommand()
            ) {

                // ==============================================
                // PING
                // ==============================================

                if (
                    interaction.commandName ===
                    "ping"
                ) {

                    return interaction.reply(
                        "🏓 Pong!"
                    );
                }

                // ==============================================
                // WARN
                // ==============================================

                if (
                    interaction.commandName ===
                    "warn"
                ) {

                    if (
                        !isModerator(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "❌ ليس لديك صلاحية استخدام التحذير.",
                            ephemeral: true
                        });
                    }

                    return startWarning(
                        interaction
                    );
                }

                // ==============================================
                // TIMEOUT
                // ==============================================

                if (
                    interaction.commandName ===
                    "timeout"
                ) {

                    if (
                        !isModerator(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "❌ ليس لديك صلاحية استخدام Timeout.",
                            ephemeral: true
                        });
                    }

                    return executeTimeout(
                        interaction
                    );
                }

                // ==============================================
                // SETUP JAIL
                // ==============================================

                if (
                    interaction.commandName ===
                    "setup-jail"
                ) {

                    return setupJail(
                        interaction
                    );
                }

                // ==============================================
                // JAIL
                // ==============================================

                if (
                    interaction.commandName ===
                    "jail"
                ) {

                    if (
                        !isModerator(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "❌ ليس لديك صلاحية استخدام السجن.",
                            ephemeral: true
                        });
                    }

                    return startJail(
                        interaction
                    );
                }

                // ==============================================
                // TICKET PANEL
                // ==============================================

                if (
                    interaction.commandName ===
                    "ticket-panel"
                ) {

                    if (
                        !isModerator(
                            interaction.member
                        )
                    ) {

                        return interaction.reply({
                            content:
                                "❌ هذا الأمر للإدارة فقط.",
                            ephemeral: true
                        });
                    }

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    config.ticketPanelChannelId =
                        interaction.channel.id;

                    const panel =
                        await interaction.channel.send(
                            createTicketPanel()
                        );

                    config.ticketPanelMessageId =
                        panel.id;

                    saveData();

                    return interaction.reply({
                        content:
                            "✅ تم إنشاء لوحة التذاكر.",
                        ephemeral: true
                    });
                }

                // ==============================================
                // SETUP TICKET CATEGORY
                // ==============================================

                if (
                    interaction.commandName ===
                    "setup-ticket-category"
                ) {

                    if (
                        !(await isBotOwner(
                            interaction.user.id
                        ))
                    ) {

                        return interaction.reply({
                            content:
                                "❌ هذا الأمر للـ Owner فقط.",
                            ephemeral: true
                        });
                    }

                    const category =
                        interaction.options.getChannel(
                            "category"
                        );

                    const config =
                        getGuildConfig(
                            interaction.guild.id
                        );

                    config.ticketCategoryId =
                        category.id;

                    saveData();

                    return interaction.reply({
                        content:
                            `✅ تم تحديد كاتيجوري التذاكر: ${category}`,
                        ephemeral: true
                    });
                }
            }

            // ==================================================
            // BUTTONS
            // ==================================================

            if (
                interaction.isButton()
            ) {

                // ==============================================
                // CREATE TICKET
                // ==============================================

                if (
                    interaction.customId ===
                    "ticket_create"
                ) {

                    return createTicket(
                        interaction
                    );
                }

                // ==============================================
                // CLAIM
                // ==============================================

                if (
                    interaction.customId ===
                    "ticket_claim"
                ) {

                    return claimTicket(
                        interaction
                    );
                }

                // ==============================================
                // UNCLAIM
                // ==============================================

                if (
                    interaction.customId ===
                    "ticket_unclaim"
                ) {

                    return unclaimTicket(
                        interaction
                    );
                }

                // ==============================================
                // CLOSE
                // ==============================================

                if (
                    interaction.customId ===
                    "ticket_close"
                ) {

                    return closeTicket(
                        interaction
                    );
                }
            }

            // ==================================================
            // SELECT MENUS
            // ==================================================

            if (
                interaction.isStringSelectMenu()
            ) {

                // ==============================================
                // WARNING REASON
                // ==============================================

                if (
                    interaction.customId
                        .startsWith("warn_reason_")
                ) {

                    const targetId =
                        interaction.customId
                            .replace(
                                "warn_reason_",
                                ""
                            );

                    const reason =
                        interaction.values[0];

                    if (
                        reason === "other"
                    ) {

                        return showCustomWarningReason(
                            interaction,
                            targetId
                        );
                    }

                    return showWarningDuration(
                        interaction,
                        targetId,
                        reason
                    );
                }

                // ==============================================
                // WARNING DURATION
                // ==============================================

                if (
                    interaction.customId
                        .startsWith("warn_duration_")
                ) {

                    const parts =
                        interaction.customId
                            .split("_");

                    const targetId =
                        parts[2];

                    const reason =
                        parts.slice(3).join("_");

                    const duration =
                        interaction.values[0];

                    return applyWarning(
                        interaction,
                        targetId,
                        reason,
                        duration
                    );
                }

                // ==============================================
                // JAIL REASON
                // ==============================================

                if (
                    interaction.customId
                        .startsWith("jail_reason_")
                ) {

                    const targetId =
                        interaction.customId
                            .replace(
                                "jail_reason_",
                                ""
                            );

                    const reason =
                        interaction.values[0];

                    if (
                        reason === "other"
                    ) {

                        const modal =
                            new ModalBuilder()
                                .setCustomId(
                                    `jail_custom_${targetId}`
                                )
                                .setTitle(
                                    "سبب السجن"
                                );

                        const input =
                            new TextInputBuilder()
                                .setCustomId("reason")
                                .setLabel(
                                    "اكتب سبب السجن"
                                )
                                .setPlaceholder(
                                    "اكتب السبب هنا..."
                                )
                                .setStyle(
                                    TextInputStyle.Paragraph
                                )
                                .setRequired(true)
                                .setMaxLength(300);

                        modal.addComponents(
                            new ActionRowBuilder()
                                .addComponents(input)
                        );

                        return interaction.showModal(
                            modal
                        );
                    }

                    return showJailDuration(
                        interaction,
                        targetId,
                        reason
                    );
                }

                // ==============================================
                // JAIL DURATION
                // ==============================================

                if (
                    interaction.customId
                        .startsWith("jail_duration_")
                ) {

                    const parts =
                        interaction.customId
                            .split("_");

                    const targetId =
                        parts[2];

                    const reason =
                        parts.slice(3).join("_");

                    const duration =
                        interaction.values[0];

                    return applyJail(
                        interaction,
                        targetId,
                        reason,
                        duration
                    );
                }
            }

            // ==================================================
            // MODALS
            // ==================================================

            if (
                interaction.isModalSubmit()
            ) {

                // ==============================================
                // CUSTOM WARNING
                // ==============================================

                if (
                    interaction.customId
                        .startsWith("warn_custom_")
                ) {

                    const targetId =
                        interaction.customId
                            .replace(
                                "warn_custom_",
                                ""
                            );

                    const reason =
                        interaction.fields.getTextInputValue(
                            "reason"
                        );

                    return showWarningDuration(
                        interaction,
                        targetId,
                        encodeURIComponent(reason)
                    );
                }

                // ==============================================
                // CUSTOM JAIL
                // ==============================================

                if (
                    interaction.customId
                        .startsWith("jail_custom_")
                ) {

                    const targetId =
                        interaction.customId
                            .replace(
                                "jail_custom_",
                                ""
                            );

                    const reason =
                        interaction.fields.getTextInputValue(
                            "reason"
                        );

                    return showJailDuration(
                        interaction,
                        targetId,
                        encodeURIComponent(reason)
                    );
                }
            }

        } catch (error) {

            console.error(
                "❌ Interaction error:",
                error
            );

            try {

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    await interaction.followUp({
                        content:
                            "❌ حصل خطأ غير متوقع.",
                        ephemeral: true
                    });

                } else {

                    await interaction.reply({
                        content:
                            "❌ حصل خطأ غير متوقع.",
                        ephemeral: true
                    });
                }

            } catch (_) {}
        }
    }
);

// ======================================================
// LOGIN
// ======================================================

client.login(TOKEN);
