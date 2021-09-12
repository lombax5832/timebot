import { SlashCommandBuilder } from "@discordjs/builders";

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildId, token } = require('./../config.json');

const commands = [
	new SlashCommandBuilder().setName('time').setDescription('Converts time into a discord timestamp')
		.addStringOption(option => option.setName('datetime').setDescription('Date/Time to convert').setRequired(true)),
	new SlashCommandBuilder().setName('timezone').setDescription('Allows you to set your timezone')
		.addSubcommand(subcommand => subcommand.setName('set').setDescription('Sets your timezone.')
			.addStringOption(option => option.setName('name').setDescription('Timezone to set').setRequired(true)))
		.addSubcommand(subcommand => subcommand.setName('get').setDescription('Retrieves your current timezone'))
		.addSubcommand(subcommand => subcommand.setName('list').setDescription('Lists all valid timezones')),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

export default async () => {
	try {
		await rest.put(
			//Routes.applicationGuildCommands(clientId, guildId),
			Routes.applicationCommands(clientId),
			{ body: commands },
		);

		console.log('Successfully registered application commands.');
	} catch (error) {
		console.error(error);
	}
};