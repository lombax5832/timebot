import ChannelReactionRules from "../models/channelReactionRules";

async function fetchRulesByServerChannelID(serverID: String, channelID: String): Promise<any[]> {
    const promise = new Promise<Object[]>((resolve, reject) => {
        let response: any = "f";
        ChannelReactionRules.find({ serverID: serverID, channelID: channelID })
            .then(result => {
                resolve(result)
            })
            .catch(err => {
                reject(err)
            })
    })

    return promise
}
export { fetchRulesByServerChannelID };
