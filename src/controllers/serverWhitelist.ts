import ServerWhitelist from "../models/serverWhitelist";

function addServerWhitelistUser(user: { serverID: String, userID: String }): any {
    console.log(`Adding user: ${user}`);

    ServerWhitelist.findOneAndUpdate({ serverID: user.serverID }, { $push: { userIDs: user.userID } }, {
        upsert: true
    })
}

function addServerWhitelistRole(user: { serverID: String, roleID: String }): any {
    console.log(`Adding role: ${user}`);

    ServerWhitelist.findOneAndUpdate({ serverID: user.serverID }, { $push: { roleIDs: user.roleID } }, {
        upsert: true
    })
}

async function fetchServerWhitelistByServerID(serverID: String): Promise<any[]> {
    const promise = new Promise<Object[]>((resolve, reject) => {
        //console.log(`Searching for userID: ${userID}`);
        let response: any = "f";
        ServerWhitelist.find({ serverID: serverID })
            .then(result => {
                resolve(result)
            })
            .catch(err => {
                reject(err)
            })
    })

    return promise
}

export { addServerWhitelistUser, addServerWhitelistRole, fetchServerWhitelistByServerID };
