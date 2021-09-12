// Require the necessary discord.js classes
const { time, inlineCode } = require('@discordjs/builders');
const { Client, Intents } = require('discord.js');
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); //initialize dotenv

import mongoose from 'mongoose';
import { addUser, fetchByUserID } from './controllers/timezones';
import { getTimeZones, timeZonesNames } from "@vvo/tzdb";
import { codeBlock } from '@discordjs/builders';
import { DateTime } from 'luxon';
import * as chrono from 'chrono-node';

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const mongoDB = process.env.DB;
mongoose.connect(mongoDB);
const db = mongoose.connection;

const timeZoneLookup = {}
getTimeZones().forEach((val) => {
  timeZoneLookup[val.name] = val.abbreviation
})

// When the client is ready, run this code (only once)
client.once('ready', () => {
  //addUser({ userID: "149597358580039680", timezone: "America/New_York" })
  console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, user } = interaction;

  if (commandName === 'time') {
    fetchByUserID(user.id).then(async val => {
      if (val.length > 0) {
        const datetime = interaction.options.getString('datetime');
        console.log("Lookup: ", timeZoneLookup[val.at(0).timezone])
        const date = chrono.parseDate(datetime, { timezone: timeZoneLookup[val.at(0).timezone] });
        await interaction.reply({ content: time(Math.floor(date.getTime() / 1000)) });
      } else {
        await interaction.reply({
          content: `Error, you must set a timezone for yourself!\n
        Please do so using ${inlineCode('/timezone set <TIMEZONE CODE>')}\nTimezone codes can be found by using ${inlineCode('/timezone list')}')}`, ephemeral: true
        })
      }
      console.log('Fetched by id:', val)
    })
    /*
        const datetime = interaction.options.getString('datetime');
        let date = Date.parse(datetime);
        if (date > 0) {
          await interaction.reply({ content: time(date / 1000) });
        } else {
          await interaction.reply({ content: `\`"${datetime}" could not be parsed as a Date/Time!\``, ephemeral: true });
        }*/
  }
});

client.on('messageCreate', message => {
  if (message.author.bot) return false; // If the message is sent by a bot, we ignore it.
  let date = Date.parse(message.content);
  if (date > 0) {
    message.reply({ content: time(date / 1000) });
  }
  console.log(message.content)
  return true
});

// Login to Discord with your client's token
client.login(process.env.CLIENT_TOKEN);