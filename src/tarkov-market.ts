import { ActionRowBuilder, ButtonBuilder, EmbedBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

const messageCache = []

async function tarkovItemSearch(request: string) {
    const authHeader = process.env.TARKOV_MARKET
    const response = await fetch(
        'https://api.tarkov-market.app' +
        '/api/v1/item',
        {
            method: 'POST',
            headers: {
                'x-api-key': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "q": request,
                "lang": "en"
            })
        });
    const json = await response.json();
    if (response.status === 200) {
        return json;
    } else {
        throw new Error(
            'Response was not OK: ' +
            JSON.stringify(json ?? {})
        );
    }
}

const itemPriceEmbedFields = (item): { name: string, value: string }[] => {
    const fields = [
        { name: "Buy Price", value: `${formatPrice(item.price, '₽')}` },
        { name: `Sell to Trader (${item.traderName})`, value: formatPriceEstimatedConversion(item) },
    ];

    if (item.bannedOnFlea) {
        fields.push({ name: '\u200B', value: "Banned on Flea Market" })
    }

    return fields;
}

const formatPrice = (price: string, currency: string): string => {
    switch (currency) {
        case '₽':
            return `${price}${currency}`
        case '$':
            return `${currency}${price}`
        case '€':
            return `${price}${currency}`
        default:
            return `${price}${currency}`
    }
}

const formatPriceEstimatedConversion = (item): string => {
    let priceString = formatPrice(item.traderPrice, item.traderPriceCur)
    if (item.traderPriceCur !== '₽') {
        priceString += ` ~ ${formatPrice(item.traderPriceRub, '₽')}`
    }

    return priceString
}

const buttonRow = (itemList, selector) => {
    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('previousItemPrice')
                .setLabel('< Previous Item')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(selector === 0),
            new ButtonBuilder()
                .setCustomId('nextItemPrice')
                .setLabel('Next Item >')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(selector === itemList.length - 1),
        );
}

const itemPriceEmbed = (itemList, selector) => new EmbedBuilder()
    .setTitle(itemList[selector].name)
    .setThumbnail(itemList[selector].img !== '' ? itemList[selector].img : itemList[selector].imgBig)
    .setAuthor({ name: 'Tarkov Market', iconURL: 'https://tarkov-market.com/favicon.png', url: 'https://tarkov-market.com/' })
    .setURL(itemList[selector].link)
    .addFields(itemPriceEmbedFields(itemList[selector]))
    .setFooter({ text: "Last Price Update" })
    .setTimestamp(Date.parse(itemList[selector].updated))

const updateMessage = (messageId: string, type?: 'previousItemPrice' | 'nextItemPrice') => {
    switch (type) {
        case "previousItemPrice":
            messageCache[messageId].selector = Math.max(messageCache[messageId].selector - 1, 0)
            break;
        case "nextItemPrice":
            messageCache[messageId].selector = Math.min(messageCache[messageId].selector + 1, messageCache[messageId].itemList.length - 1)
            break;
    }
    return { embeds: [itemPriceEmbed(messageCache[messageId].itemList, messageCache[messageId].selector)], components: [buttonRow(messageCache[messageId].itemList, messageCache[messageId].selector)] }
}

const lookUpItem = async (name: string) => {
    return tarkovItemSearch(name);
}

const cacheMessage = (messageId, itemList, selector, owner, message) => {
    messageCache[messageId] = { itemList: itemList, selector: selector, owner: owner, message: message }
}

const changeCacheId = (oldMessageId, newMessageId, message) => {
    messageCache[newMessageId] = messageCache[oldMessageId]
    messageCache[newMessageId].message = message
    delete messageCache[oldMessageId]
}

const getMessage = (messageId) => {
    return {message: messageCache[messageId]?.message, owner: messageCache[messageId]?.owner }
}

export { lookUpItem, itemPriceEmbed, cacheMessage, updateMessage, changeCacheId, getMessage }