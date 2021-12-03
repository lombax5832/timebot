import Commands from '../models/commands';

function addCommand(command: { serverID: String, command: String, response: String }): any {
    console.log(`Adding Command: ${command.toString()}`);
    const newcommand = new Commands(command);
    Commands.updateOne({ serverID: command.serverID, command: command.command }, { $set: { response: command.response } }, { upsert: true },
        (err, product) => {
            if (err) {
                console.error('addCommand Error: ', err);
                return err
            } else {
                //console.log("Product: ", product)
                return product
            }
        })
}

function removeCommand(command: { serverID: String, command: String }): any {
    console.log(`Removing command: `, command);

    Commands.deleteOne(command)
}

async function fetchCommandsByServerID(serverID: String): Promise<any[]> {
    const promise = new Promise<Object[]>((resolve, reject) => {
        let response: any = "f";
        Commands.find({ serverID: serverID })
            .then(result => {
                resolve(result)
            })
            .catch(err => {
                reject(err)
            })
    })

    return promise
}
export { addCommand, removeCommand, fetchCommandsByServerID };
