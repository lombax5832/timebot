import mongoose, { Schema } from "mongoose";
import { timeZonesNames } from "@vvo/tzdb";

export interface IUserTimezone extends mongoose.Document {
    userID: string,
    timezone: string
}

const TimezoneSchema = new Schema({
    userID: { type: String, required: true },
    timezone: { type: String, enum: timeZonesNames, required: true },
}, {
    versionKey: false
});

export default mongoose.model('timezones', TimezoneSchema)