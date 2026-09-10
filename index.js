const {
    Client,
    GatewayIntentBits,
    Partials,
    ActivityType
} = require("discord.js");

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

// ==========================================
// BOT READY
// ==========================================

client.once("ready", () => {
    console.log("====================================");
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`🌐 Servers: ${client.guilds.cache.size}`);
    console.log("====================================");

    client.user.setPresence({
        activities: [
            {
                name: `${client.guilds.cache.size} Servers`,
                type: ActivityType.Watching
            }
        ],
        status: "online"
    });
});

// ==========================================
// TEST MESSAGE
// ==========================================

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (message.content === "!ping") {
        await message.reply("🏓 Pong!");
    }
});

// ==========================================
// LOGIN
// ==========================================

// لا تضع التوكن الحقيقي هنا.
// سنضيفه بطريقة آمنة في الخطوة القادمة.
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
    console.error("❌ DISCORD_TOKEN is missing!");
    process.exit(1);
}

client.login(TOKEN);
