import mongoose, { Schema } from "mongoose";
import { timeZonesNames } from "@vvo/tzdb";

export interface IUserTimezone extends mongoose.Document {
    userID: string,
    timezone: string
}

const KeywordReactSchema = new Schema({
    userID: { type: String, required: true },
    keyword: { type: String, required: true },
    reaction: { type: String, required: true },
    caseSensitive: { type: Boolean, required: true, default: false }
}, {
    versionKey: false
});

export default mongoose.model('keyword_reacts', KeywordReactSchema)