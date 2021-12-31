import mongoose, { Schema } from "mongoose";

export interface IChannelReactionRules {
    serverID: string,
    channelID: string,
    allowedRoles: string[],
    bossUserIDs: string[],
    deleteOtherReactions: Boolean
}

const ChannelReactionRulesSchema = new Schema({
    serverID: { type: String, required: true },
    channelID: { type: String, required: true },
    allowedRoles: { type: [String], required: true, default: [] },
    bossUserIDs: { type: [String], required: true, default: [] },
    deleteOtherReactions: { type: Boolean, required: true, default: false }
}, {
    versionKey: false
});

export default mongoose.model('channelReactionRules', ChannelReactionRulesSchema)