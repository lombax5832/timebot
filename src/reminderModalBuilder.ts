import { CommandInteraction, CacheType, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalActionRowComponentBuilder } from "discord.js";

const reminderModalBuilder = (interaction: CommandInteraction<CacheType>) => {

  const modal = new ModalBuilder()
    .setCustomId("addReminder")
    .setTitle("Create a Reminder");

  const timestamp = new TextInputBuilder()
    .setCustomId('timestamp')
    .setLabel('When should the reminder be sent?')
    .setPlaceholder('on 12/5 at 5pm')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const message = new TextInputBuilder()
    .setCustomId('message')
    .setLabel('Reminder Message')
    .setPlaceholder('@raiders We have raid in an hour')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const firstRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(timestamp);
  const secondRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(message);

  modal.addComponents(firstRow, secondRow);

  interaction.showModal(modal);
};

export { reminderModalBuilder }