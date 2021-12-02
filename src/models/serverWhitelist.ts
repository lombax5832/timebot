import mongoose, { Schema } from "mongoose";

const ServerWhitelistSchema = new Schema({
    serverID: { type: String, required: true },
    userIDs: { type: [String], required: true, default: [] },
    roleIDs: { type: [String], required: true, default: [] }
}, {
    versionKey: false
});

export default mongoose.model('serverWhitelist', ServerWhitelistSchema)