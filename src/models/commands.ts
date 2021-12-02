import mongoose, { Schema } from "mongoose";

const CommandSchema = new Schema({
    serverID: { type: String, required: true },
    command: { type: String, required: true },
    response: { type: String, required: true },
}, {
    versionKey: false
});

export default mongoose.model('commands', CommandSchema)