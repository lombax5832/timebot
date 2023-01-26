// Require the necessary discord.js classes
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); //initialize dotenv

import mongoose from 'mongoose';
import { fetchTimezoneByUserID, updateUser } from './controllers/timezones';
import { getTimeZones } from "@vvo/tzdb";
import { inlineCode, time, userMention } from '@discordjs/builders';
import * as chrono from 'chrono-node';
import deployCommands from './deploy-commands';
import { Client, Intents, Message, MessageActionRow, MessageButton, MessageEmbed, MessageReaction, Modal, ModalActionRowComponent, TextChannel, TextInputComponent, User } from 'discord.js';
import { chunkArray } from './util';
import { fetchKeywordReactByUserID } from './controllers/keywordReact';
import { addCommand, fetchCommandsByServerID, removeCommand } from './controllers/commands';
import { fetchServerWhitelistByServerID } from './controllers/serverWhitelist';
import { fetchRulesByServerChannelID } from './controllers/channelReactionRules';
import { IChannelReactionRules } from './models/channelReactionRules';
import { initFFLogsGQL, getTimeSpentPerMech, getFilterTimestamps } from './fflogs/fflogs';
import { initTwitch, getVideoStartTimestamp, getVideoBroadcaster } from './twitch/twitch';
import { reminderModalBuilder } from './reminderModalBuilder';
import { addReminder, fetchAllReminders, removeReminderById, setReminderToUsedById } from './controllers/reminder';

// Create a new client instance
const client = new Client({ partials: ['USER', 'GUILD_MEMBER', 'CHANNEL', 'MESSAGE', 'REACTION'], intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS] });

const mongoDB = process.env.DB;
mongoose.connect(mongoDB);
const db = mongoose.connection;
let timezoneListString = '';
let timezoneListChunks = chunkArray(getTimeZones().map((val) => { return val.name }), 6)

const ffGql = initFFLogsGQL();
const twitch = initTwitch();
const ffReportRegex = /fflogs\.com\/reports\/(?<code>[a-zA-Z0-9]{16})/;
const twitchVidRegex = /twitch.tv\/videos\/(?<code>[0-9]{10})/;

const fflogsEmbedCache = [];

const timeZoneLookup = {}
getTimeZones().forEach((val) => {
  timeZoneLookup[val.name] = val.currentTimeOffsetInMinutes
  timezoneListString += `${val.name}\n`
})

const timeZonesEmbed = new MessageEmbed()
  .setTitle('Timezones List')
  .addFields(timezoneListChunks.map((val) => { return { name: '\u200B', value: val.join('\n'), inline: true } }));

const filterVodEmbedBuilder = (embedData, filterString, url, startTimestamp) => new MessageEmbed()
  .setTitle('FFlogs Twitch VOD Filter')
  .setThumbnail("https://assets.rpglogs.com/img/ff/favicon.png")
  .setURL("https://www.fflogs.com/reports/" + url)
  .setFooter({ text: "Log From" })
  .setTimestamp(startTimestamp);

const resultDictEmbedBuilder = (resultSet, startTimestamp, url, vods?, timestamps?) => new MessageEmbed()
  .setTitle('Time Spent on Mechanics')
  .setThumbnail("https://assets.rpglogs.com/img/ff/favicon.png")
  .setURL("https://" + url)
  .addFields(resultSet.map((mech) => {
    console.log({ name: mech.name, value: mech.duration });
    const paddedPercentage = (Math.round(mech.percentage * 10) / 10).toString()
    const seconds = Math.round(mech.duration) % 60
    const minutes = Math.floor(Math.round(mech.duration) / 60)
    let vodLinks = []
    let vodLinkstring = "";
    vods?.forEach((vod) => {
      if (timestamps) {
        console.log("startTime: ", vod.startTime, "timestamps: ", timestamps[mech.name])
        vodLinks.push(`${vod.broadcaster}: ` + timestamps[mech.name].map((timestamp, i) => `[${i + 1}](https://www.twitch.tv/videos/${vod.url}?t=${Math.floor((timestamp - vod.startTime) / 1000)}s)`).join(' '))
      }
      if (vodLinks.length > 0) {
        vodLinkstring = '\n' + vodLinks.join('\n');
      }
    })
    return {
      name: mech.name,
      value: `[${paddedPercentage}%] ${minutes} minutes and ${seconds} seconds in ${mech.wipes} wipes${vodLinkstring}`
    }
  }))
  .setFooter({ text: "Log From" })
  .setTimestamp(startTimestamp)

const embedModalBuilder = (messageId) => {
  const modal = new Modal()
    .setCustomId("addVideo")
    .setTitle("Add a VOD")

  const videoURL = new TextInputComponent()
    .setCustomId('vodURL')
    .setLabel("VOD URL")
    .setStyle('SHORT')

  const firstActionRow = new MessageActionRow<ModalActionRowComponent>().addComponents(videoURL);

  modal.addComponents(firstActionRow);

  return modal;
}

// When the client is ready, run this code (only once)
client.once('ready', async () => {
  deployCommands();
  console.log('Loading Reminders');

  const reminders = fetchAllReminders().then(val => {
    val.forEach(item => {
      const reminder = { serverID: item.serverID, channel: item.channel, sender: item.sender, message: item.message, mention: item.mention, timestamp: item.timestamp };
      const reminderTime = new Date(reminder.timestamp * 1000);
      if (reminderTime > new Date()) {
        scheduleReminder(item.id, reminder, reminderTime)
      } else {
        console.log("omitting and deleting expired reminder: ", item.id)
        setReminderToUsedById(item.id);
      }
    })
    console.log(val);
  });

  console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const { message } = interaction

  if (interaction.customId === "addVideo") {
    await interaction.showModal(embedModalBuilder(message.id))
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isModalSubmit()) return;

  const { message } = interaction

  if (interaction.customId === "addVideo" && fflogsEmbedCache[message.id]) {
    console.log(interaction.message.embeds)

    const code = interaction.fields.getTextInputValue('vodURL').match(twitchVidRegex);
    if (code?.groups?.code) {
      const vidStartTime = await getVideoStartTimestamp(await twitch, code.groups.code)
      if (vidStartTime > 0) {
        const vidBroadcaster = await getVideoBroadcaster(await twitch, code.groups.code)
        console.log("cache lookup =", message.id, fflogsEmbedCache[message.id])
        for (const mechName in fflogsEmbedCache[message.id].timestamps) {
          fflogsEmbedCache[message.id].timestamps[mechName].forEach((timestamp, i) => {

          });
        }
        const row = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId('addVideo')
              .setLabel('Attach a VOD')
              .setStyle('PRIMARY'),
          )
        let oldMessage = await fflogsEmbedCache[message.id].message
        fflogsEmbedCache[message.id].vods.push({ url: code.groups.code, sender: interaction.user, startTime: vidStartTime, broadcaster: vidBroadcaster })

        oldMessage.edit({ embeds: [resultDictEmbedBuilder(fflogsEmbedCache[message.id].resultSet, fflogsEmbedCache[message.id].startTimestamp, fflogsEmbedCache[message.id].url, fflogsEmbedCache[message.id].vods, fflogsEmbedCache[message.id].timestamps)], components: [row] })
          .then(() => {
            interaction.reply({ content: "Successfully added your vod!", ephemeral: true })
          })
          .catch((error) => {
            console.log("Error oldMessage.edit():", error)
            interaction.reply({ content: "Could not add your vod!", ephemeral: true })
          })
      }
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, user } = interaction;

  if (commandName === 'time') {

    fetchTimezoneByUserID(user.id).then(async val => {
      if (val.length > 0) {
        const datetime = interaction.options.getString('datetime');
        //console.log("Lookup: ", timeZoneLookup[val.at(0).timezone])
        const date = chrono.parseDate(datetime, { timezone: timeZoneLookup[val[0].timezone] }, { forwardDate: true });
        try {
          let timestamp = Math.floor(date.getTime() / 1000);
          await interaction.reply({ content: time(timestamp) + '\n' + time(timestamp, 'R') + '\n' + inlineCode(time(timestamp)), ephemeral: true });
        } catch {
          await interaction.reply({ content: "Error: invalid time", ephemeral: true });
        }
      } else {
        await interaction.reply({
          content: `Error, you must set a timezone for yourself!\n
        Please do so using ${inlineCode('/timezone set <TIMEZONE CODE>')}\nTimezone codes can be found by using ${inlineCode('/timezone list')}')}`, ephemeral: true
        })
      }
      //console.log('Fetched by id:', val)
    })
  }

  if (commandName === 'timezone') {
    switch (interaction.options.getSubcommand()) {
      case 'get':
        fetchTimezoneByUserID(user.id).then(async val => {
          if (val.length > 0) {
            await interaction.reply({ content: `Your timezone: ${val[0].timezone}`, ephemeral: true });
          } else {
            await interaction.reply({
              content: `No timezone set!\n
        Please do so using ${inlineCode('/timezone set <TIMEZONE CODE>')}\nTimezone codes can be found by using ${inlineCode('/timezone list')}')}`, ephemeral: true
            })
          }
          //console.log('Fetched by id:', val)
        })
        break;
      case 'set':
        const name = interaction.options.getString('name')
        if (timeZoneLookup.hasOwnProperty(name)) {
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

  if (commandName === 'add-command') {
    console.log(`Guild ID = ${interaction.guildId}`)
    let hasRole: boolean = false;
    let users: Array<string> = [];
    fetchServerWhitelistByServerID(interaction.guildId).then(async val => {
      if (val != null) {
        val[0].roleIDs.forEach(roleID => interaction.guild.roles.cache.get(roleID).members.forEach(member => users.push(member.user.id)))
        console.log("Users: ", users)
      }
      if (users.includes(interaction.user.id)) {
        hasRole = true;
        console.log("User has role!");
      } else {
        console.log("User does not have role!");
      }
      if (val != null && (val[0].userIDs.includes(interaction.user.id) || hasRole)) {
        addCommand({ serverID: interaction.guildId, command: '.' + interaction.options.getString('command'), response: interaction.options.getString('response') })
        interaction.reply({ content: `Command: ${interaction.options.getString('command')} added`, ephemeral: true })
      } else {
        interaction.reply({ content: `You do not have permissions to add commands.`, ephemeral: true })
      }
    })
  }

  if (commandName === 'remove-command') {
    console.log(`Guild ID = ${interaction.guildId}`)
    fetchServerWhitelistByServerID(interaction.guildId).then(async val => {
      if (val != null && val[0].userIDs.includes(interaction.user.id)) {
        removeCommand({ serverID: interaction.guildId, command: '.' + interaction.options.getString('command') })
        interaction.reply({ content: `Command: ${interaction.options.getString('command')} removed`, ephemeral: true })
      }
    })
  }

  if (commandName === 'reminder') {
    //console.log("Reminder interaction received", `${interaction.user.username}#${interaction.user.discriminator} creating reminder in channel ${interaction.channel} at ${interaction.options.getString('reminder-time')} to ${interaction.options.getMentionable('mention')} with message: ${interaction.options.getString('message')}`, interaction.options.getMentionable('mention'));

    fetchTimezoneByUserID(interaction.user.id).then(async val => {
      if (val.length > 0) {
        //console.log("Lookup: ", timeZoneLookup[val.at(0).timezone])
        const date = chrono.parseDate(interaction.options.getString('reminder-time'), { timezone: timeZoneLookup[val[0].timezone] }, { forwardDate: true });
        if (date) {
          const reminder = { serverID: interaction.guildId, channel: interaction.channel.id, sender: interaction.user.id, message: interaction.options.getString('message'), mention: interaction.options.getMentionable('mention').toString(), timestamp: Math.floor(date.getTime() / 1000) }
          console.log("Reminder object", reminder);
          const reminderId = addReminder(reminder);
          interaction.reply({ content: `Reminder Added for ${time(reminder.timestamp)}`, ephemeral: true })
          const channel = client.channels.cache.get(reminder.channel);
          if (channel instanceof TextChannel) {
            scheduleReminder(reminderId, reminder, date);
          }
        } else {
          interaction.reply({ content: `reminder-time '${interaction.options.getString('reminder-time')}' was not recognized as a valid time.`, ephemeral: true })
        }
      } else {
        interaction.reply({ content: "You must first set a timezone using /time set <timezone>", ephemeral: true })
      }
    })
  }

  if (commandName === 'vod-search') {
    try {
      const fflogsURL = interaction.options.getString('fflogs-url');
      const fflogsFilter = interaction.options.getString('filter-string');
      const code = fflogsURL.match(ffReportRegex);
      const twitchCode = interaction.options.getString('twitch-url').match(twitchVidRegex);
      if (twitchCode?.groups?.code) {
        const vidStartTime = await getVideoStartTimestamp(await twitch, twitchCode.groups.code)
        if (vidStartTime > 0) {

          if (code?.groups?.code) {
            const data = await getFilterTimestamps(code.groups.code, fflogsFilter.replace(/"/g, '\\\"'), await ffGql).catch()
            const offsetStartTime = data.reportData.report.startTime - vidStartTime;
            const embedData = data.reportData.report.events.data.map((event, i) => { return { index: i + 1, newTime: (offsetStartTime + event.timestamp) / 1000, time: event.timestamp, nice: event.fight, vodURL: `[${i + 1}](https://www.twitch.tv/videos/${twitchCode.groups.code}?t=${Math.floor((offsetStartTime + event.timestamp) / 1000)}s)` } })
            console.log(data);
            console.log(data.reportData.report.events.data)
            const filterEmbed = filterVodEmbedBuilder(null, fflogsFilter, code.groups.code, data.reportData.report.startTime)
            let vodLinks = [];
            embedData.forEach((element, i) => {
              vodLinks[Math.floor(i / 16)] ? vodLinks[Math.floor(i / 16)].push(element.vodURL) : vodLinks.push([element.vodURL])
            });
            filterEmbed.setDescription(`Filter used:\n${inlineCode(fflogsFilter)}`)
            filterEmbed.addFields(vodLinks.map(row => { return { name: ' ', value: row.join(' ') } }))
            console.log(vodLinks);
            console.log("Length:", filterEmbed.length)
            if (filterEmbed.length >= 6000) {
              interaction.reply({ content: `Embed was too large to send, used ${filterEmbed.length} out of 6000 characters`, ephemeral: true})
            } else {
              interaction.reply({ embeds: [filterEmbed] })
            }
          }
        }
      }
    } catch (error) {
      console.log(error)
    }
  }
});

const twitterEmbedHandler = (message) => {
  const { embeds } = message
  embeds.forEach((embed) => {
    if (embed.url && embed.video) {
      let parsed = new URL(embed.url);
      if (parsed.hostname == "twitter.com") {
        try {
          parsed.hostname = "vxtwitter.com";
          message.react('📹').then(reaction => {
            setTimeout(() => reaction.remove().catch(rejected => {
              console.log(rejected);
            }), 10000)
          })
          const filter = (reaction, user) => reaction.emoji.name === '📹' && user.id !== client.user.id
          const collector = message.createReactionCollector({ filter, max: 1 })
          collector.on('collect', () => {
            message.reply({ content: parsed.href, allowedMentions: { repliedUser: false } })
            message.reactions.cache.forEach((reaction) => {
              if (reaction.emoji.name == '📹') {
                reaction.remove().catch(rejected => {
                  console.log(rejected);
                });
              }
            })
            message.suppressEmbeds()
          })
        } catch { }
      }
    }
  })
}

client.on('messageUpdate', async (oldMessage: Message, message: Message) => {
  if (oldMessage.embeds.length != message.embeds.length) {
    twitterEmbedHandler(message)
  }
})

client.on('messageCreate', async (message: Message) => {
  const { content, author, guildId } = message

  twitterEmbedHandler(message)

  const code = content.match(ffReportRegex);
  if (code?.groups?.code) {
    message.channel.sendTyping();
    const { resultSet, timestamps, startTimestamp } = await getTimeSpentPerMech(code.groups.code, await ffGql)
    if (resultSet.length > 0) {
      const row = new MessageActionRow()
        .addComponents(
          new MessageButton()
            .setCustomId('addVideo')
            .setLabel('Attach a VOD')
            .setStyle('PRIMARY'),
        );
      let reply = await message.reply({ embeds: [resultDictEmbedBuilder(resultSet, startTimestamp, code[0])], components: [row] });

      fflogsEmbedCache[reply.id] = { message: reply, resultSet: resultSet, timestamps: timestamps, url: code[0], startTimestamp: startTimestamp, vods: [] }
      console.log("reply id =", reply.id)
    }
  }

  fetchTimezoneByUserID(author.id).then(async val => {
    if (val.length > 0) {
      //console.log("Lookup: ", timeZoneLookup[val.at(0).timezone])
      const date = chrono.parseDate(content, { timezone: timeZoneLookup[val[0].timezone] }, { forwardDate: true });
      try {
        let timestamp = Math.floor(date.getTime() / 1000);
        //await message.reply({ content: time(timestamp) + '\n' + time(timestamp, 'R'), ephemeral: true });
        message.react('🕐').then(reaction => {
          setTimeout(() => reaction.remove().catch(rejected => {
            console.log(rejected);
          }), 10000)
        })
        const filter = (reaction, user) => reaction.emoji.name === '🕐' && user.id === author.id
        const collector = message.createReactionCollector({ filter, max: 1 })
        collector.on('collect', () => {
          message.reply({ content: time(timestamp) + '\n' + time(timestamp, 'R') })
          message.reactions.cache.forEach((reaction) => {
            if (reaction.emoji.name == '🕐') {
              reaction.remove().catch(rejected => {
                console.log(rejected);
              });
            }
          })
        })
      } catch { }
    }
  })

  fetchKeywordReactByUserID(author.id).then(async val => {
    val.forEach((keyword) => {
      let regex: RegExp
      if (keyword.caseSensitive) {
        regex = new RegExp(keyword.keyword)
      }
      else {
        regex = new RegExp(keyword.keyword, "i")
      }
      if (regex.test(content)) {
        try {
          message.react(keyword.reaction)
        } catch (error) {
          console.error(error)
        }
      }
    })
  })

  fetchCommandsByServerID(guildId).then(async val => {
    val.forEach((command) => {
      if (content === command.command) {
        message.reply(command.response)
      }
    })
  })
})

client.on('messageReactionAdd', async (messageReaction: MessageReaction, user: User) => {
  const { guildId, channelId } = messageReaction.message;
  const userId = user.id;

  //Dont mess with our own reactions
  if (userId == client.user.id)
    return;

  //console.log(messageReaction.client.user);

  fetchRulesByServerChannelID(guildId, channelId).then(async rules => {

    let rule = rules[0] as IChannelReactionRules
    if (rules[0] && !rules[0].bossUserIDs.includes(userId)) {

      //console.log("start req")
      messageReaction.users.fetch().then(() => {
        //console.log("got req")
        messageReaction.message.guild.members.cache[userId]?.then(user => {
          //console.log("got req 2")
          if (user.roles.cache.hasAny(...rule.allowedRoles) && messageReaction.users.cache.hasAny(...rule.bossUserIDs)) {

            //console.log("Reaction allowed")
          } else {
            messageReaction.users.remove(userId)//.then(() => console.log("Reaction removed"));
          }
        })
      });
    }
  })
})

// Login to Discord with your client's token
client.login(process.env.CLIENT_TOKEN);
const scheduleReminder = (reminderId: any, reminder: { serverID: string; channel: string; sender: string; message: string; mention: string; timestamp: number; }, date: Date) => {
  setTimeout(async () => {
    await reminderId;
    const channel = client.channels.cache.get(reminder.channel)
    if (channel instanceof TextChannel) {
      channel.send(`${reminder.mention}\n${reminder.message}`).catch(rejected => {
        console.log(rejected);
      }
      ).then(async () => {
        setReminderToUsedById(await reminderId);
      });
    }
  }, date.getTime() - new Date().getTime());
}

