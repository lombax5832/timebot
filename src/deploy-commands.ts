import { SlashCommandBuilder } from "@discordjs/builders";
import {PermissionFlagsBits, Routes} from 'discord-api-types/v9'
import path from 'path';

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { REST } = require('@discordjs/rest');

const commands = [
	new SlashCommandBuilder().setName('time').setDescription('Converts time into a discord timestamp')
		.addStringOption(option => option.setName('datetime').setDescription('Date/Time to convert').setRequired(true)),
	new SlashCommandBuilder().setName('timezone').setDescription('Allows you to set your timezone')
		.addSubcommand(subcommand => subcommand.setName('set').setDescription('Sets your timezone.')
			.addStringOption(option => option.setName('name').setDescription('Timezone to set').setRequired(true)))
		.addSubcommand(subcommand => subcommand.setName('get').setDescription('Retrieves your current timezone'))
		.addSubcommand(subcommand => subcommand.setName('list').setDescription('Lists all valid timezones')),
	new SlashCommandBuilder().setName('add-command').setDescription('Auto-reply to command with given response')
		.addStringOption(option => option.setName('command').setDescription('Command to respond to').setRequired(true))
		.addStringOption(option => option.setName('response').setDescription('What to reply with').setRequired(true)),
	new SlashCommandBuilder().setName('remove-command').setDescription('Remove a command')
		.addStringOption(option => option.setName('command').setDescription('Command to respond to').setRequired(true)),
	new SlashCommandBuilder().setName('reminder').setDescription('Send a reminder in this channel at a specific time to a specific role')
		.addStringOption(option => option.setName('reminder-time').setDescription('When to send the reminder?').setRequired(true))
		.addMentionableOption(option => option.setName('mention').setDescription('Who to ping with the reminder?').setRequired(true))
		.addStringOption(option => option.setName('message').setDescription('Reminder message').setRequired(true))
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.CLIENT_TOKEN);

const deployCommands = async () => {
	try {
		await rest.put(
			//Routes.applicationGuildCommands(process.env.clientId, "884303526170333205"),
			Routes.applicationCommands(process.env.clientId),
			{ body: commands },
		);

		console.log('Successfully registered application commands.');
	} catch (error) {
		console.error(error);
	}
};

deployCommands();

export default deployCommands