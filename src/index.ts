// Require the necessary discord.js classes
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); //initialize dotenv

import mongoose from 'mongoose';
import { fetchByUserID, updateUser } from './controllers/timezones';
import { getTimeZones } from "@vvo/tzdb";
import { inlineCode, time, userMention } from '@discordjs/builders';
import * as chrono from 'chrono-node';
import deployCommands from './deploy-commands';
import { Client, Intents, MessageActionRow, MessageEmbed, MessageSelectMenu } from 'discord.js';
import { chunkArray } from './util';

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const mongoDB = process.env.DB;
mongoose.connect(mongoDB);
const db = mongoose.connection;
let timezoneListString = '';
let timezoneListChunks = chunkArray(getTimeZones().map((val) => { return val.name }), 6)

const timeZoneLookup = {}
getTimeZones().forEach((val) => {
  timeZoneLookup[val.name] = val.currentTimeOffsetInMinutes
  timezoneListString += `${val.name}\n`
})

const timeZonesEmbed = new MessageEmbed()
  .setTitle('Timezones List')
  .addFields(timezoneListChunks.map((val) => { return { name: '\u200B', value: val.join('\n'), inline: true } }))

//const timeZoneList = getTimeZones().map((val) => { return { label: val.name, description: val.abbreviation, value: val.name } })

// When the client is ready, run this code (only once)
client.once('ready', async () => {
  //addUser({ userID: "149597358580039680", timezone: "America/New_York" })
  await deployCommands();
  console.log(timezoneListString.length)
  console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, user } = interaction;

  //console.log(interaction);

  if (commandName === 'time') {

    fetchByUserID(user.id).then(async val => {
      if (val.length > 0) {
        const datetime = interaction.options.getString('datetime');
        console.log("Lookup: ", timeZoneLookup[val.at(0).timezone])
        const date = chrono.parseDate(datetime, { timezone: timeZoneLookup[val.at(0).timezone] });
        await interaction.reply({ content: time(Math.floor(date.getTime() / 1000)), });
      } else {
        await interaction.reply({
          content: `Error, you must set a timezone for yourself!\n
        Please do so using ${inlineCode('/timezone set <TIMEZONE CODE>')}\nTimezone codes can be found by using ${inlineCode('/timezone list')}')}`, ephemeral: true
        })
      }
      console.log('Fetched by id:', val)
    })
  }

  if (commandName === 'timezone') {
    switch (interaction.options.getSubcommand()) {
      case 'get':
        fetchByUserID(user.id).then(async val => {
          if (val.length > 0) {
            await interaction.reply({ content: `Your timezone: ${val.at(0).timezone}`, ephemeral: true });
          } else {
            await interaction.reply({
              content: `No timezone set!\n
        Please do so using ${inlineCode('/timezone set <TIMEZONE CODE>')}\nTimezone codes can be found by using ${inlineCode('/timezone list')}')}`, ephemeral: true
            })
          }
          console.log('Fetched by id:', val)
        })
        break;
      case 'set':
        const name = interaction.options.getString('name')
        if (timeZoneLookup[name]) {
          const doc = await updateUser({ userID: user.id, timezone: name })
          //console.log(doc)
          await interaction.reply({ content: `${userMention(user.id)} set timezone to ${inlineCode(doc.timezone)}.`, ephemeral: true })
        } else {
          await interaction.reply({ content: `Invalid timezone selected, use ${inlineCode('/timezone list')} to see all valid timezones.`, ephemeral: true })
        }
        break;
      case 'list':
        let chunk = 0
        let timezoneListStringCpy = (' ' + timezoneListString).slice(1)
        let i = 0
        await interaction.reply({ embeds: [timeZonesEmbed], ephemeral: true })
        break;
    }
  }
});

// Login to Discord with your client's token
client.login(process.env.CLIENT_TOKEN);
