import { CommandInteraction, CacheType, TextInputComponent, Modal, ModalActionRowComponent, MessageActionRow } from 'discord.js';
import { TextInputStyles } from 'discord.js/typings/enums';

const reminderModalBuilder = (interaction: CommandInteraction<CacheType>) => {

  const modal = new Modal()
    .setCustomId("addReminder")
    .setTitle("Create a Reminder");

  const timestamp = new TextInputComponent()
    .setCustomId('timestamp')
    .setLabel('When should the reminder be sent?')
    .setPlaceholder('on 12/5 at 5pm')
    .setStyle(TextInputStyles.SHORT)
    .setRequired(true);

  const message = new TextInputComponent()
    .setCustomId('message')
    .setLabel('Reminder Message')
    .setPlaceholder('@raiders We have raid in an hour')
    .setStyle(TextInputStyles.PARAGRAPH)
    .setRequired(true);

  const firstRow = new MessageActionRow<ModalActionRowComponent>().addComponents(timestamp);
  const secondRow = new MessageActionRow<ModalActionRowComponent>().addComponents(message);

  modal.addComponents(firstRow, secondRow);

  interaction.showModal(modal);
};

export { reminderModalBuilder }