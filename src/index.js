const Discord = require('discord.js');
const chalk = require('chalk');
require('dotenv').config('./.env');
const axios = require('axios');
const http = require('http');

// Check if the bot is up to date
const { version } = require('.././package.json');
axios.get('https://api.github.com/repos/CorwinDev/Discord-Bot/releases/latest').then(res => {
    if (res.data.tag_name !== version) {
        console.log(chalk.red.bgYellow(`Your bot is not up to date! Please update to the latest version!`, version + ' -> ' + res.data.tag_name));
    }
}).catch(err => {
    console.log(chalk.red.bgYellow(`Failed to check if bot is up to date!`));
});

class Flask {
    constructor() {
        this.routes = {
            GET: {},
            POST: {}
        };
    }

    get(path, handler) {
        this.routes.GET[path] = handler;
    }

    post(path, handler) {
        this.routes.POST[path] = handler;
    }

    listen(port, callback) {
        const server = http.createServer((req, res) => {
            const method = req.method;
            const url = req.url;

            if (this.routes[method] && this.routes[method][url]) {
                console.log(chalk.green(`[SERVER] Handling ${method} request for ${url}`));
                this.routes[method][url](req, res);
            } else {
                console.log(chalk.red(`[SERVER] 404 Not Found: ${method} ${url}`));
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            }
        });

        server.listen(port, () => {
            console.log(chalk.blue(`[SERVER] Listening on port ${port}`));
            if (callback) callback();
        });
    }
}

// Create the Flask-like app
const app = new Flask();

// Define GET routes
app.get('/', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello, world!');
});

app.get('/about', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('This is the about page.');
});

// Define POST route
app.post('/data', (req, res) => {
    let body = '';
    req.on('data', chunk => {
        body += chunk;
    });

    req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Data received', data: body }));
        console.log(chalk.yellow(`[SERVER] Received POST data: ${body}`));
    });
});

// Start the server
app.listen(3000, () => {
    console.log(chalk.green(`[SERVER] Server running at http://localhost:3000/`));
});

const webhook = require("./config/webhooks.json");
const config = require("./config/bot.js");

const webHooksArray = [
    'startLogs', 'shardLogs', 'errorLogs', 'dmLogs', 'voiceLogs',
    'serverLogs', 'serverLogs2', 'commandLogs', 'consoleLogs',
    'warnLogs', 'voiceErrorLogs', 'creditLogs', 'evalLogs', 'interactionLogs'
];

// Assign default webhook ID and token if .env variables are set
if (process.env.WEBHOOK_ID && process.env.WEBHOOK_TOKEN) {
    for (const webhookName of webHooksArray) {
        webhook[webhookName].id = process.env.WEBHOOK_ID;
        webhook[webhookName].token = process.env.WEBHOOK_TOKEN;
    }
}

// Create Webhook Clients
const startLogs = new Discord.WebhookClient({
    id: webhook.startLogs.id,
    token: webhook.startLogs.token,
});

const shardLogs = new Discord.WebhookClient({
    id: webhook.shardLogs.id,
    token: webhook.shardLogs.token,
});

// Sharding Manager
const manager = new Discord.ShardingManager('./src/bot.js', {
    totalShards: 'auto',
    token: process.env.DISCORD_TOKEN,
    respawn: true,
});

// Optional: Enable Top.gg Auto Poster
if (process.env.TOPGG_TOKEN) {
    const { AutoPoster } = require('topgg-autoposter');
    AutoPoster(process.env.TOPGG_TOKEN, manager);
}

// Logging System Startup
console.clear();
console.log(chalk.blue(chalk.bold(`System`)), (chalk.white(`>>`)), (chalk.green(`Starting up`)), (chalk.white(`...`)));
console.log(`\u001b[0m`);
console.log(chalk.red(`© CorwinDev | 2021 - ${new Date().getFullYear()}`));
console.log(chalk.red(`All rights reserved`));
console.log(chalk.blue(chalk.bold(`System`)), (chalk.white(`>>`)), chalk.red(`Version ${require(`${process.cwd()}/package.json`).version}`), (chalk.green(`loaded`)));
console.log(`\u001b[0m`);

// Shard Events
manager.on('shardCreate', shard => {
    const embed = new Discord.EmbedBuilder()
        .setTitle(`🆙・Launching shard`)
        .setDescription(`A shard has just been launched`)
        .addFields([
            { name: "🆔┆ID", value: `${shard.id + 1}/${manager.totalShards}`, inline: true },
            { name: `📃┆State`, value: `Starting up...`, inline: true }
        ])
        .setColor(config.colors.normal);
    
    startLogs.send({ username: 'Bot Logs', embeds: [embed] });

    console.log(chalk.blue(chalk.bold(`System`)), (chalk.white(`>>`)), (chalk.green(`Starting`)), chalk.red(`Shard #${shard.id + 1}`), (chalk.white(`...`)));

    shard.on("death", (process) => {
        const embed = new Discord.EmbedBuilder()
            .setTitle(`🚨・Closing shard ${shard.id + 1}/${manager.totalShards} unexpectedly`)
            .addFields([{ name: "🆔┆ID", value: `${shard.id + 1}/${manager.totalShards}` }])
            .setColor(config.colors.normal);
        shardLogs.send({ username: 'Bot Logs', embeds: [embed] });

        if (process.exitCode === null) {
            const embed = new Discord.EmbedBuilder()
                .setTitle(`🚨・Shard ${shard.id + 1}/${manager.totalShards} exited with NULL error code!`)
                .addFields([
                    { name: "PID", value: `\`${process.pid}\`` },
                    { name: "Exit code", value: `\`${process.exitCode}\`` }
                ])
                .setColor(config.colors.normal);
            shardLogs.send({ username: 'Bot Logs', embeds: [embed] });
        }
    });

    shard.on("shardDisconnect", (event) => {
        const embed = new Discord.EmbedBuilder()
            .setTitle(`🚨・Shard ${shard.id + 1}/${manager.totalShards} disconnected`)
            .setDescription("Dumping socket close event...")
            .setColor(config.colors.normal);
        shardLogs.send({ username: 'Bot Logs', embeds: [embed] });
    });

    shard.on("shardReconnecting", () => {
        const embed = new Discord.EmbedBuilder()
            .setTitle(`🚨・Reconnecting shard ${shard.id + 1}/${manager.totalShards}`)
            .setColor(config.colors.normal);
        shardLogs.send({ username: 'Bot Logs', embeds: [embed] });
    });
});

// Spawn Shards
manager.spawn();

// Additional Webhooks
const consoleLogs = new Discord.WebhookClient({
    id: webhook.consoleLogs.id,
    token: webhook.consoleLogs.token,
});

const warnLogs = new Discord.WebhookClient({
    id: webhook.warnLogs.id,
    token: webhook.warnLogs.token,
});

// Handle Unhandled Promise Rejections
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
    const embed = new Discord.EmbedBuilder()
        .setTitle(`🚨・Unhandled promise rejection`)
        .addFields([
            { name: "Error", value: error ? Discord.codeBlock(error) : "No error" },
            { name: "Stack error", value: error.stack ? Discord.codeBlock(error.stack) : "No stack error" }
        ]);
    consoleLogs.send({ username: 'Bot Logs', embeds: [embed] }).catch(() => console.log('Error sending unhandled promise rejection to webhook', error));
});

// Handle Warnings
process.on('warning', warn => {
    console.warn("Warning:", warn);
    const embed = new Discord.EmbedBuilder()
        .setTitle(`🚨・New warning found`)
        .addFields([{ name: `Warn`, value: `\`\`\`${warn}\`\`\`` }]);
    warnLogs.send({ username: 'Bot Logs', embeds: [embed] }).catch(() => console.log('Error sending warning to webhook', warn));
});
