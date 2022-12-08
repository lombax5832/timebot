import mongoose, { Schema } from "mongoose";

const CommandSchema = new Schema({
    serverID: { type: String, required: true },
    channel: { type: String, required: true },
    sender: {type: String, required: true },
    message: { type: String, required: true },
    mention: {type: String, required: true},
    timestamp: {type: Number, required: true }
}, {
    versionKey: false
});

export default mongoose.model('reminder', CommandSchema)