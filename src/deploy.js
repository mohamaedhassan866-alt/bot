const { REST, Routes } = require('discord.js');
require('dotenv').config();
const commands = require('./commands');
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
  console.error('Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in .env'); process.exit(1);
}
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands });
    console.log(`Deployed ${commands.length} slash commands to guild ${process.env.GUILD_ID}.`);
  } catch (e) { console.error('Command deployment failed:', e); process.exitCode = 1; }
})();
